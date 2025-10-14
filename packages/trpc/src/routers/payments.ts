import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  payments,
  paymentTranslations,
  invoices,
  userTenantRoles,
  type NewPayment,
  type NewPaymentTranslation,
} from "@repo/database";
import { eq, and, desc } from "drizzle-orm";

// Helper to check if user has access to tenant
async function checkTenantAccess(
  db: any,
  userId: string,
  tenantId: string,
  requiredRoles: string[] = ["owner", "admin"],
) {
  const [userRole] = await db
    .select({ role: userTenantRoles.role })
    .from(userTenantRoles)
    .where(
      and(
        eq(userTenantRoles.userId, userId),
        eq(userTenantRoles.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!userRole || !requiredRoles.includes(userRole.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this tenant",
    });
  }

  return userRole.role;
}

// Generate payment number
function generatePaymentNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `PAY-${timestamp}-${random}`;
}

export const paymentsRouter = router({
  // List payments for a tenant
  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        status: z
          .enum(["pending", "completed", "failed", "refunded", "cancelled"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
        "member",
      ]);

      const conditions = [eq(payments.tenantId, input.tenantId)];

      if (input.status) {
        conditions.push(eq(payments.status, input.status));
      }

      const paymentsList = await ctx.db
        .select({
          payment: payments,
          invoice: invoices,
        })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .where(and(...conditions))
        .orderBy(desc(payments.createdAt));

      return { payments: paymentsList };
    }),

  // Get payment by ID with translations
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [payment] = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.id, input.id))
        .limit(1);

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, payment.tenantId, [
        "owner",
        "admin",
        "member",
      ]);

      const translations = await ctx.db
        .select()
        .from(paymentTranslations)
        .where(eq(paymentTranslations.paymentId, input.id));

      // Get invoice if exists
      let invoice = null;
      if (payment.invoiceId) {
        const [inv] = await ctx.db
          .select()
          .from(invoices)
          .where(eq(invoices.id, payment.invoiceId))
          .limit(1);
        invoice = inv;
      }

      return { payment, translations, invoice };
    }),

  // Create payment
  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        invoiceId: z.string().uuid().optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        currency: z.string().default("USD"),
        paymentMethod: z.string(),
        paymentGateway: z.string().optional(),
        transactionId: z.string().optional(),
        translations: z
          .array(
            z.object({
              language: z.enum(["en", "ar"]),
              fieldName: z.string(),
              fieldValue: z.string(),
            }),
          )
          .optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      // Validate invoice if provided
      if (input.invoiceId) {
        const [invoice] = await ctx.db
          .select()
          .from(invoices)
          .where(eq(invoices.id, input.invoiceId))
          .limit(1);

        if (!invoice || invoice.tenantId !== input.tenantId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid invoice",
          });
        }
      }

      const newPayment: NewPayment = {
        paymentNumber: generatePaymentNumber(),
        tenantId: input.tenantId,
        invoiceId: input.invoiceId,
        status: "pending",
        amount: input.amount,
        currency: input.currency,
        paymentMethod: input.paymentMethod,
        paymentGateway: input.paymentGateway,
        transactionId: input.transactionId,
        metadata: input.metadata || {},
      };

      const [payment] = await ctx.db
        .insert(payments)
        .values(newPayment)
        .returning();

      if (!payment) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payment",
        });
      }

      // Create translations if provided
      if (input.translations && input.translations.length > 0) {
        const translationsList: NewPaymentTranslation[] = input.translations.map(
          (trans) => ({
            paymentId: payment.id,
            language: trans.language,
            fieldName: trans.fieldName,
            fieldValue: trans.fieldValue,
          }),
        );

        await ctx.db.insert(paymentTranslations).values(translationsList);
      }

      return { payment };
    }),

  // Update payment
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z
          .enum(["pending", "completed", "failed", "refunded", "cancelled"])
          .optional(),
        transactionId: z.string().optional(),
        failureReason: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      const [existing] = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const updates: any = { ...updateData, updatedAt: new Date() };

      if (updateData.status === "completed" && !existing.paymentDate) {
        updates.paymentDate = new Date();
      }

      const [updatedPayment] = await ctx.db
        .update(payments)
        .set(updates)
        .where(eq(payments.id, id))
        .returning();

      // Update invoice status if payment is completed
      if (
        updateData.status === "completed" &&
        existing.invoiceId &&
        existing.status !== "completed"
      ) {
        await ctx.db
          .update(invoices)
          .set({
            status: "paid",
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, existing.invoiceId));
      }

      return { payment: updatedPayment };
    }),

  // Mark payment as completed
  markAsCompleted: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        transactionId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const [updatedPayment] = await ctx.db
        .update(payments)
        .set({
          status: "completed",
          paymentDate: new Date(),
          transactionId: input.transactionId || existing.transactionId,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, input.id))
        .returning();

      // Update invoice status
      if (existing.invoiceId) {
        await ctx.db
          .update(invoices)
          .set({
            status: "paid",
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, existing.invoiceId));
      }

      return { payment: updatedPayment };
    }),

  // Mark payment as failed
  markAsFailed: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        failureReason: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const [updatedPayment] = await ctx.db
        .update(payments)
        .set({
          status: "failed",
          failureReason: input.failureReason,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, input.id))
        .returning();

      return { payment: updatedPayment };
    }),

  // Refund payment
  refund: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      if (existing.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only completed payments can be refunded",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const refundAmount = parseFloat(input.amount);
      const paymentAmount = parseFloat(existing.amount);
      const currentRefunded = parseFloat(existing.refundedAmount || "0");

      if (refundAmount + currentRefunded > paymentAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Refund amount exceeds payment amount",
        });
      }

      const totalRefunded = refundAmount + currentRefunded;
      const isFullyRefunded = totalRefunded >= paymentAmount;

      const [updatedPayment] = await ctx.db
        .update(payments)
        .set({
          status: isFullyRefunded ? "refunded" : "completed",
          refundedAmount: totalRefunded.toFixed(2),
          refundedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, input.id))
        .returning();

      // Update invoice status if fully refunded
      if (isFullyRefunded && existing.invoiceId) {
        await ctx.db
          .update(invoices)
          .set({
            status: "refunded",
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, existing.invoiceId));
      }

      return { payment: updatedPayment };
    }),

  // Add translation to payment
  addTranslation: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().uuid(),
        language: z.enum(["en", "ar"]),
        fieldName: z.string(),
        fieldValue: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [payment] = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.id, input.paymentId))
        .limit(1);

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, payment.tenantId, [
        "owner",
        "admin",
      ]);

      const newTranslation: NewPaymentTranslation = {
        paymentId: input.paymentId,
        language: input.language,
        fieldName: input.fieldName,
        fieldValue: input.fieldValue,
      };

      const [translation] = await ctx.db
        .insert(paymentTranslations)
        .values(newTranslation)
        .returning();

      return { translation };
    }),

  // Delete translation
  deleteTranslation: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [translation] = await ctx.db
        .select()
        .from(paymentTranslations)
        .where(eq(paymentTranslations.id, input.id))
        .limit(1);

      if (!translation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Translation not found",
        });
      }

      const [payment] = await ctx.db
        .select()
        .from(payments)
        .where(eq(payments.id, translation.paymentId))
        .limit(1);

      if (payment) {
        await checkTenantAccess(ctx.db, ctx.userId, payment.tenantId, [
          "owner",
          "admin",
        ]);
      }

      await ctx.db
        .delete(paymentTranslations)
        .where(eq(paymentTranslations.id, input.id));

      return { success: true };
    }),
});

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  invoices,
  invoiceItems,
  subscriptions,
  userTenantRoles,
  type NewInvoice,
  type NewInvoiceItem,
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

// Generate invoice number
function generateInvoiceNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `INV-${timestamp}-${random}`;
}

const translatedDescriptionSchema = z.object({
  en: z.string(),
  ar: z.string(),
});

export const invoicesRouter = router({
  // List invoices for a tenant
  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        status: z
          .enum(["draft", "pending", "paid", "cancelled", "refunded"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
        "member",
      ]);

      const conditions = [eq(invoices.tenantId, input.tenantId)];

      if (input.status) {
        conditions.push(eq(invoices.status, input.status));
      }

      const invoicesList = await ctx.db
        .select()
        .from(invoices)
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt));

      return { invoices: invoicesList };
    }),

  // Get invoice by ID with items
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [invoice] = await ctx.db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, invoice.tenantId, [
        "owner",
        "admin",
        "member",
      ]);

      const items = await ctx.db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, input.id));

      return { invoice, items };
    }),

  // Create invoice
  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        subscriptionId: z.string().uuid().optional(),
        items: z.array(
          z.object({
            itemableType: z.string(),
            itemableId: z.string().uuid().optional(),
            description: translatedDescriptionSchema,
            quantity: z.number().int().positive().default(1),
            unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
            taxRate: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
            discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
            metadata: z.record(z.any()).optional(),
          }),
        ),
        currency: z.string().default("USD"),
        dueDate: z.date().optional(),
        billingAddress: z
          .object({
            name: z.string().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
            postalCode: z.string().optional(),
          })
          .optional(),
        notes: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      // Validate subscription if provided
      if (input.subscriptionId) {
        const [subscription] = await ctx.db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, input.subscriptionId))
          .limit(1);

        if (!subscription || subscription.tenantId !== input.tenantId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid subscription",
          });
        }
      }

      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;

      const calculatedItems = input.items.map((item) => {
        const unitPrice = parseFloat(item.unitPrice);
        const amount = unitPrice * item.quantity;
        const taxRate = parseFloat(item.taxRate);
        const discountAmount = parseFloat(item.discountAmount);
        const taxAmount = (amount * taxRate) / 100;

        subtotal += amount;
        totalTax += taxAmount;
        totalDiscount += discountAmount;

        return {
          ...item,
          amount: amount.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
        };
      });

      const total = subtotal + totalTax - totalDiscount;

      const newInvoice: NewInvoice = {
        invoiceNumber: generateInvoiceNumber(),
        tenantId: input.tenantId,
        subscriptionId: input.subscriptionId,
        status: "draft",
        subtotal: subtotal.toFixed(2),
        tax: totalTax.toFixed(2),
        discount: totalDiscount.toFixed(2),
        total: total.toFixed(2),
        currency: input.currency,
        dueDate: input.dueDate,
        billingAddress: input.billingAddress,
        notes: input.notes,
        metadata: input.metadata || {},
      };

      const [invoice] = await ctx.db
        .insert(invoices)
        .values(newInvoice)
        .returning();

      // Create invoice items
      const invoiceItemsList: NewInvoiceItem[] = calculatedItems.map((item) => ({
        invoiceId: invoice.id,
        itemableType: item.itemableType,
        itemableId: item.itemableId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        discountAmount: item.discountAmount,
        metadata: item.metadata || {},
      }));

      await ctx.db.insert(invoiceItems).values(invoiceItemsList);

      return { invoice };
    }),

  // Update invoice
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z
          .enum(["draft", "pending", "paid", "cancelled", "refunded"])
          .optional(),
        dueDate: z.date().optional(),
        billingAddress: z
          .object({
            name: z.string().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
            postalCode: z.string().optional(),
          })
          .optional(),
        notes: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      const [existing] = await ctx.db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const updates: any = { ...updateData, updatedAt: new Date() };

      if (updateData.status === "paid" && !existing.paidAt) {
        updates.paidAt = new Date();
      }

      const [updatedInvoice] = await ctx.db
        .update(invoices)
        .set(updates)
        .where(eq(invoices.id, id))
        .returning();

      return { invoice: updatedInvoice };
    }),

  // Mark invoice as paid
  markAsPaid: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const [updatedInvoice] = await ctx.db
        .update(invoices)
        .set({
          status: "paid",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, input.id))
        .returning();

      return { invoice: updatedInvoice };
    }),

  // Delete invoice (only drafts)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft invoices can be deleted",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db.delete(invoices).where(eq(invoices.id, input.id));

      return { success: true };
    }),
});

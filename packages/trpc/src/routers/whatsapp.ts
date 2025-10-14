import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { whatsappInstances, userTenantRoles } from "@repo/database";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";

async function checkTenantAccess(
  db: any,
  userId: string,
  tenantId: string,
  requiredRoles: string[] = ["owner", "admin", "member"],
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

export const whatsappRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId);

      const instances = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.tenantId, input.tenantId),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .orderBy(desc(whatsappInstances.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { instances };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (!instance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WhatsApp instance not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, instance.tenantId);

      return { instance };
    }),

  getQrCode: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (!instance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WhatsApp instance not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, instance.tenantId);

      return {
        qrCode: instance.qrCode,
        status: instance.status,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        name: z.string().min(1).max(100),
        sessionName: z.string().min(1),
        config: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      const [existing] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.sessionName, input.sessionName),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Session name already exists",
        });
      }

      const [instance] = await ctx.db
        .insert(whatsappInstances)
        .values({
          userId: ctx.userId,
          tenantId: input.tenantId,
          name: input.name,
          sessionName: input.sessionName,
          config: input.config,
        })
        .returning();

      if (!instance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create WhatsApp instance",
        });
      }

      return { instance };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        status: z.string().optional(),
        qrCode: z.string().optional(),
        phoneNumber: z.string().optional(),
        isActive: z.boolean().optional(),
        config: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WhatsApp instance not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(whatsappInstances)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(whatsappInstances.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update WhatsApp instance",
        });
      }

      return { instance: updated };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WhatsApp instance not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(whatsappInstances)
        .set({ deletedAt: new Date() })
        .where(eq(whatsappInstances.id, input.id));

      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(whatsappInstances)
        .set({ deletedAt: new Date() })
        .where(
          and(
            inArray(whatsappInstances.id, input.ids),
            eq(whatsappInstances.tenantId, input.tenantId),
            isNull(whatsappInstances.deletedAt),
          ),
        );

      return { success: true };
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(whatsappInstances)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(whatsappInstances.id, input.ids),
            eq(whatsappInstances.tenantId, input.tenantId),
            isNull(whatsappInstances.deletedAt),
          ),
        );

      return { success: true };
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WhatsApp instance not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const [updated] = await ctx.db
        .update(whatsappInstances)
        .set({
          status: "disconnected",
          qrCode: null,
          updatedAt: new Date(),
        })
        .where(eq(whatsappInstances.id, input.id))
        .returning();

      return { instance: updated };
    }),

  reconnect: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WhatsApp instance not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const [updated] = await ctx.db
        .update(whatsappInstances)
        .set({
          status: "connecting",
          updatedAt: new Date(),
        })
        .where(eq(whatsappInstances.id, input.id))
        .returning();

      return { instance: updated };
    }),
});

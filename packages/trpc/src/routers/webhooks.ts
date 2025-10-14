import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  webhooks,
  webhookLogs,
  userTenantRoles,
  type NewWebhook,
} from "@repo/database";
import { eq, and, isNull, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { emitWebhookEvent } from "../utils/websocket-events";

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

function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

export const webhooksRouter = router({
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

      const results = await ctx.db
        .select()
        .from(webhooks)
        .where(
          and(
            eq(webhooks.tenantId, input.tenantId),
            isNull(webhooks.deletedAt),
          ),
        )
        .orderBy(desc(webhooks.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { webhooks: results };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [webhook] = await ctx.db
        .select()
        .from(webhooks)
        .where(
          and(
            eq(webhooks.id, input.id),
            isNull(webhooks.deletedAt),
          ),
        )
        .limit(1);

      if (!webhook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, webhook.tenantId);

      return { webhook };
    }),

  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        name: z.string().min(1).max(100),
        url: z.string().url(),
        events: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      const secret = generateWebhookSecret();

      const [newWebhook] = await ctx.db
        .insert(webhooks)
        .values({
          tenantId: input.tenantId,
          name: input.name,
          url: input.url,
          events: input.events,
          secret,
        })
        .returning();

      if (!newWebhook) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create webhook",
        });
      }

      emitWebhookEvent("webhook_created", newWebhook.id, newWebhook.tenantId, {
        name: newWebhook.name,
      });

      return { webhook: newWebhook };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        url: z.string().url().optional(),
        events: z.array(z.string()).min(1).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(webhooks)
        .where(
          and(
            eq(webhooks.id, input.id),
            isNull(webhooks.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(webhooks)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(webhooks.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update webhook",
        });
      }

      emitWebhookEvent("webhook_updated", updated.id, updated.tenantId, {
        changes: Object.keys(updateData),
      });

      return { webhook: updated };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(webhooks)
        .where(
          and(
            eq(webhooks.id, input.id),
            isNull(webhooks.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(webhooks)
        .set({ deletedAt: new Date() })
        .where(eq(webhooks.id, input.id));

      emitWebhookEvent("webhook_deleted", existing.id, existing.tenantId);

      return { success: true };
    }),

  regenerateSecret: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(webhooks)
        .where(
          and(
            eq(webhooks.id, input.id),
            isNull(webhooks.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const newSecret = generateWebhookSecret();

      const [updated] = await ctx.db
        .update(webhooks)
        .set({ secret: newSecret, updatedAt: new Date() })
        .where(eq(webhooks.id, input.id))
        .returning();

      return { webhook: updated };
    }),

  getLogs: protectedProcedure
    .input(
      z.object({
        webhookId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [webhook] = await ctx.db
        .select()
        .from(webhooks)
        .where(
          and(
            eq(webhooks.id, input.webhookId),
            isNull(webhooks.deletedAt),
          ),
        )
        .limit(1);

      if (!webhook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, webhook.tenantId);

      const logs = await ctx.db
        .select()
        .from(webhookLogs)
        .where(eq(webhookLogs.webhookId, input.webhookId))
        .orderBy(desc(webhookLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { logs };
    }),
});

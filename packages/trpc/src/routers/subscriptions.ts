import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  subscriptions,
  subscriptionFeatures,
  subscriptionUsages,
  plans,
  planFeatures,
  userTenantRoles,
  type NewSubscription,
  type NewSubscriptionFeature,
} from "@repo/database";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import {
  getUsageStats,
  checkUsageLimit,
  initializeUsage,
} from "../utils/subscription-usage";
import { emitSubscriptionEvent } from "../utils/websocket-events";
import {
  createSubscriptionWithWorkflow,
  renewSubscriptionWithWorkflow,
  cancelSubscriptionWithWorkflow,
  completePaymentForSubscription,
} from "../utils/subscription-workflow";

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

export const subscriptionsRouter = router({
  // List subscriptions for a tenant
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/subscriptions/list",
        tags: ["subscriptions"],
        summary: "List subscriptions",
        description: "Get list of subscriptions for a tenant",
        protect: true,
      },
    })
    .input(
      z.object({
        tenantId: z.string().uuid(),
        status: z
          .enum(["active", "cancelled", "expired", "trial", "past_due"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
        "member",
      ]);

      const conditions = [eq(subscriptions.tenantId, input.tenantId)];

      if (input.status) {
        conditions.push(eq(subscriptions.status, input.status));
      }

      const subscriptionsList = await ctx.db
        .select({
          subscription: subscriptions,
          plan: plans,
        })
        .from(subscriptions)
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(and(...conditions))
        .orderBy(desc(subscriptions.createdAt));

      return { subscriptions: subscriptionsList };
    }),

  // Get subscription by ID with features
  getById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/subscriptions/{id}",
        tags: ["subscriptions"],
        summary: "Get subscription by ID",
        description: "Get a single subscription by ID with features",
        protect: true,
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({
          subscription: subscriptions,
          plan: plans,
        })
        .from(subscriptions)
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(eq(subscriptions.id, input.id))
        .limit(1);

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, result.subscription.tenantId, [
        "owner",
        "admin",
        "member",
      ]);

      const features = await ctx.db
        .select({
          subscriptionFeature: subscriptionFeatures,
          planFeature: planFeatures,
        })
        .from(subscriptionFeatures)
        .innerJoin(
          planFeatures,
          eq(subscriptionFeatures.planFeatureId, planFeatures.id),
        )
        .where(eq(subscriptionFeatures.subscriptionId, input.id));

      return {
        subscription: result.subscription,
        plan: result.plan,
        features,
      };
    }),

  // Get active subscription for tenant
  getActive: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/subscriptions/active",
        tags: ["subscriptions"],
        summary: "Get active subscription",
        description: "Get active subscription for a tenant",
        protect: true,
      },
    })
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
        "member",
      ]);

      const now = new Date();

      const [result] = await ctx.db
        .select({
          subscription: subscriptions,
          plan: plans,
        })
        .from(subscriptions)
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(
          and(
            eq(subscriptions.tenantId, input.tenantId),
            eq(subscriptions.status, "active"),
            lte(subscriptions.currentPeriodStart, now),
            gte(subscriptions.currentPeriodEnd, now),
          ),
        )
        .limit(1);

      if (!result) {
        return { subscription: null, plan: null };
      }

      return {
        subscription: result.subscription,
        plan: result.plan,
      };
    }),

  // Create subscription with workflow
  create: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/subscriptions",
        tags: ["subscriptions"],
        summary: "Create subscription",
        description: "Create a new subscription with workflow",
        protect: true,
      },
    })
    .input(
      z.object({
        tenantId: z.string().uuid(),
        planId: z.string().uuid(),
        startDate: z.date().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      const result = await createSubscriptionWithWorkflow(ctx.db, input);

      return result;
    }),

  // Update subscription
  update: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/subscriptions/{id}",
        tags: ["subscriptions"],
        summary: "Update subscription",
        description: "Update an existing subscription",
        protect: true,
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
        status: z
          .enum(["active", "cancelled", "expired", "trial", "past_due"])
          .optional(),
        cancelAtPeriodEnd: z.boolean().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      const [existing] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const updates: any = { ...updateData, updatedAt: new Date() };

      if (updateData.status === "cancelled") {
        updates.cancelledAt = new Date();
      }

      const [updatedSubscription] = await ctx.db
        .update(subscriptions)
        .set(updates)
        .where(eq(subscriptions.id, id))
        .returning();

      return { subscription: updatedSubscription };
    }),

  // Cancel subscription with workflow
  cancel: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/subscriptions/{id}/cancel",
        tags: ["subscriptions"],
        summary: "Cancel subscription",
        description: "Cancel a subscription with workflow",
        protect: true,
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
        cancelAtPeriodEnd: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const result = await cancelSubscriptionWithWorkflow(
        ctx.db,
        input.id,
        input.cancelAtPeriodEnd,
      );

      return result;
    }),

  // Renew subscription with workflow
  renew: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/subscriptions/{id}/renew",
        tags: ["subscriptions"],
        summary: "Renew subscription",
        description: "Renew a subscription with workflow",
        protect: true,
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const result = await renewSubscriptionWithWorkflow(ctx.db, input.id);

      return result;
    }),

  // Get usage statistics for a tenant
  getUsageStats: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/subscriptions/usage-stats",
        tags: ["subscriptions"],
        summary: "Get usage statistics",
        description: "Get usage statistics for a tenant",
        protect: true,
      },
    })
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
        "member",
      ]);

      const usages = await getUsageStats(ctx.db, input.tenantId);

      return { usages };
    }),

  // Check specific feature usage limit
  checkUsageLimit: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/subscriptions/check-usage-limit",
        tags: ["subscriptions"],
        summary: "Check usage limit",
        description: "Check if feature usage limit is reached",
        protect: true,
      },
    })
    .input(
      z.object({
        tenantId: z.string().uuid(),
        featureKey: z.enum([
          "messages_sent",
          "api_calls",
          "whatsapp_instances",
          "contacts",
          "campaigns",
        ]),
      }),
    )
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
        "member",
      ]);

      const limit = await checkUsageLimit({
        db: ctx.db,
        tenantId: input.tenantId,
        featureKey: input.featureKey,
      });

      return limit;
    }),

  // Initialize usage for a feature
  initializeFeatureUsage: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/subscriptions/initialize-usage",
        tags: ["subscriptions"],
        summary: "Initialize feature usage",
        description: "Initialize usage tracking for a feature",
        protect: true,
      },
    })
    .input(
      z.object({
        tenantId: z.string().uuid(),
        featureKey: z.enum([
          "messages_sent",
          "api_calls",
          "whatsapp_instances",
          "contacts",
          "campaigns",
        ]),
        limit: z.number().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      // Get active subscription
      const [subscription] = await ctx.db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, input.tenantId),
            eq(subscriptions.status, "active"),
          ),
        )
        .limit(1);

      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active subscription found",
        });
      }

      const usage = await initializeUsage(
        ctx.db,
        input.tenantId,
        subscription.id,
        input.featureKey,
        input.limit,
      );

      return { usage };
    }),

  // Get current period usage details
  getCurrentUsage: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/subscriptions/current-usage",
        tags: ["subscriptions"],
        summary: "Get current usage",
        description: "Get current period usage details for a tenant",
        protect: true,
      },
    })
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
        "member",
      ]);

      const now = new Date();

      // Get active subscription
      const [subscription] = await ctx.db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, input.tenantId),
            eq(subscriptions.status, "active"),
          ),
        )
        .limit(1);

      if (!subscription) {
        return {
          hasSubscription: false,
          usages: [],
        };
      }

      // Get all usages for current period
      const usages = await ctx.db
        .select()
        .from(subscriptionUsages)
        .where(
          and(
            eq(subscriptionUsages.subscriptionId, subscription.id),
            eq(subscriptionUsages.tenantId, input.tenantId),
            lte(subscriptionUsages.periodStart, now),
            gte(subscriptionUsages.periodEnd, now),
          ),
        );

      return {
        hasSubscription: true,
        subscription,
        usages,
      };
    }),
});

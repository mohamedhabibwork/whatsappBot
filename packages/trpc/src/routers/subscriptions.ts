import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  subscriptions,
  subscriptionFeatures,
  plans,
  planFeatures,
  userTenantRoles,
  type NewSubscription,
  type NewSubscriptionFeature,
} from "@repo/database";
import { eq, and, desc, gte, lte } from "drizzle-orm";

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

  // Create subscription
  create: protectedProcedure
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

      // Get plan details
      const [plan] = await ctx.db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      if (!plan.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Plan is not active",
        });
      }

      const startDate = input.startDate || new Date();
      const trialDays = plan.trialDays ?? 0;
      const trialEnd = trialDays > 0
        ? new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000)
        : null;

      // Calculate period end based on billing cycle
      let periodEnd = new Date(startDate);
      switch (plan.billingCycle) {
        case "daily":
          periodEnd.setDate(periodEnd.getDate() + 1);
          break;
        case "weekly":
          periodEnd.setDate(periodEnd.getDate() + 7);
          break;
        case "monthly":
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          break;
        case "quarterly":
          periodEnd.setMonth(periodEnd.getMonth() + 3);
          break;
        case "semiannually":
          periodEnd.setMonth(periodEnd.getMonth() + 6);
          break;
        case "yearly":
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          break;
      }

      const newSubscription: NewSubscription = {
        tenantId: input.tenantId,
        planId: input.planId,
        status: trialDays > 0 ? "trial" : "active",
        currentPeriodStart: startDate,
        currentPeriodEnd: periodEnd,
        trialStart: trialDays > 0 ? startDate : null,
        trialEnd,
        price: plan.price,
        currency: plan.currency,
        metadata: input.metadata || {},
      };

      const [subscription] = await ctx.db
        .insert(subscriptions)
        .values(newSubscription)
        .returning();

      if (!subscription) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create subscription",
        });
      }

      // Copy plan features to subscription features
      const planFeaturesList = await ctx.db
        .select()
        .from(planFeatures)
        .where(eq(planFeatures.planId, input.planId));

      if (planFeaturesList.length > 0) {
        const subscriptionFeaturesList: NewSubscriptionFeature[] =
          planFeaturesList.map((feature) => ({
            subscriptionId: subscription.id,
            planFeatureId: feature.id,
            featureKey: feature.featureKey,
            featureValue: feature.featureValue,
            isEnabled: feature.isEnabled,
            metadata: {},
          }));

        await ctx.db
          .insert(subscriptionFeatures)
          .values(subscriptionFeaturesList);
      }

      return { subscription };
    }),

  // Update subscription
  update: protectedProcedure
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

  // Cancel subscription
  cancel: protectedProcedure
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

      const updates: any = {
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        updatedAt: new Date(),
      };

      if (!input.cancelAtPeriodEnd) {
        updates.status = "cancelled";
        updates.cancelledAt = new Date();
      }

      const [updatedSubscription] = await ctx.db
        .update(subscriptions)
        .set(updates)
        .where(eq(subscriptions.id, input.id))
        .returning();

      return { subscription: updatedSubscription };
    }),

  // Renew subscription
  renew: protectedProcedure
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

      const [plan] = await ctx.db
        .select()
        .from(plans)
        .where(eq(plans.id, existing.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      const newPeriodStart = existing.currentPeriodEnd;
      let newPeriodEnd = new Date(newPeriodStart);

      switch (plan.billingCycle) {
        case "monthly":
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
          break;
        case "quarterly":
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 3);
          break;
        case "yearly":
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
          break;
      }

      const [updatedSubscription] = await ctx.db
        .update(subscriptions)
        .set({
          status: "active",
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, input.id))
        .returning();

      return { subscription: updatedSubscription };
    }),
});

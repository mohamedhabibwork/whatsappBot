import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  plans,
  planFeatures,
  type NewPlan,
  type NewPlanFeature,
} from "@repo/database";
import { eq, and, desc } from "drizzle-orm";

const translatedNameSchema = z.object({
  en: z.string().min(1),
  ar: z.string().min(1),
});

const translatedDescriptionSchema = z.object({
  en: z.string().optional(),
  ar: z.string().optional(),
});

export const plansRouter = router({
  // List all active public plans
  list: protectedProcedure
    .input(
      z
        .object({
          includeInactive: z.boolean().optional().default(false),
          includePrivate: z.boolean().optional().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (!input?.includeInactive) {
        conditions.push(eq(plans.isActive, true));
      }

      if (!input?.includePrivate) {
        conditions.push(eq(plans.isPublic, true));
      }

      const plansList = await ctx.db
        .select()
        .from(plans)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(plans.createdAt));

      return { plans: plansList };
    }),

  // Get plan by ID with features
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [plan] = await ctx.db
        .select()
        .from(plans)
        .where(eq(plans.id, input.id))
        .limit(1);

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      const features = await ctx.db
        .select()
        .from(planFeatures)
        .where(eq(planFeatures.planId, input.id))
        .orderBy(planFeatures.displayOrder);

      return { plan, features };
    }),

  // Create plan (admin only)
  create: adminProcedure
    .input(
      z.object({
        name: translatedNameSchema,
        description: translatedDescriptionSchema.optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/),
        currency: z.string().default("USD"),
        billingCycle: z.enum(["monthly", "yearly", "quarterly"]).default("monthly"),
        trialDays: z.number().int().min(0).default(0),
        isActive: z.boolean().default(true),
        isPublic: z.boolean().default(true),
        maxUsers: z.number().int().positive().optional(),
        maxWhatsappInstances: z.number().int().positive().optional(),
        maxMessagesPerMonth: z.number().int().positive().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const newPlan: NewPlan = {
        name: input.name,
        description: input.description,
        price: input.price,
        currency: input.currency,
        billingCycle: input.billingCycle,
        trialDays: input.trialDays,
        isActive: input.isActive,
        isPublic: input.isPublic,
        maxUsers: input.maxUsers,
        maxWhatsappInstances: input.maxWhatsappInstances,
        maxMessagesPerMonth: input.maxMessagesPerMonth,
        metadata: input.metadata || {},
      };

      const [plan] = await ctx.db.insert(plans).values(newPlan).returning();

      return { plan };
    }),

  // Update plan (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: translatedNameSchema.optional(),
        description: translatedDescriptionSchema.optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        currency: z.string().optional(),
        billingCycle: z.enum(["monthly", "yearly", "quarterly"]).optional(),
        trialDays: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
        isPublic: z.boolean().optional(),
        maxUsers: z.number().int().positive().optional(),
        maxWhatsappInstances: z.number().int().positive().optional(),
        maxMessagesPerMonth: z.number().int().positive().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      const [updatedPlan] = await ctx.db
        .update(plans)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(plans.id, id))
        .returning();

      if (!updatedPlan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      return { plan: updatedPlan };
    }),

  // Delete plan (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [deletedPlan] = await ctx.db
        .delete(plans)
        .where(eq(plans.id, input.id))
        .returning();

      if (!deletedPlan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      return { success: true };
    }),

  // Add feature to plan (admin only)
  addFeature: adminProcedure
    .input(
      z.object({
        planId: z.string().uuid(),
        name: translatedNameSchema,
        description: translatedDescriptionSchema.optional(),
        featureKey: z.string().min(1),
        featureValue: z.string().optional(),
        isEnabled: z.boolean().default(true),
        displayOrder: z.number().int().default(0),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const newFeature: NewPlanFeature = {
        planId: input.planId,
        name: input.name,
        description: input.description,
        featureKey: input.featureKey,
        featureValue: input.featureValue,
        isEnabled: input.isEnabled,
        displayOrder: input.displayOrder,
        metadata: input.metadata || {},
      };

      const [feature] = await ctx.db
        .insert(planFeatures)
        .values(newFeature)
        .returning();

      return { feature };
    }),

  // Update plan feature (admin only)
  updateFeature: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: translatedNameSchema.optional(),
        description: translatedDescriptionSchema.optional(),
        featureKey: z.string().min(1).optional(),
        featureValue: z.string().optional(),
        isEnabled: z.boolean().optional(),
        displayOrder: z.number().int().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      const [updatedFeature] = await ctx.db
        .update(planFeatures)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(planFeatures.id, id))
        .returning();

      if (!updatedFeature) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature not found",
        });
      }

      return { feature: updatedFeature };
    }),

  // Delete plan feature (admin only)
  deleteFeature: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [deletedFeature] = await ctx.db
        .delete(planFeatures)
        .where(eq(planFeatures.id, input.id))
        .returning();

      if (!deletedFeature) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature not found",
        });
      }

      return { success: true };
    }),
});

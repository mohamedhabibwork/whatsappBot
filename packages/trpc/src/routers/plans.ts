import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../trpc";
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
  // List all active public plans (PUBLIC endpoint for landing page)
  list: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/plans/list",
        tags: ["plans"],
        summary: "List plans",
        description: "Get list of available subscription plans (public)",
        protect: false,
      },
    })
    .input(
      z
        .object({
          includeInactive: z.boolean().optional().default(false),
          includePrivate: z.boolean().optional().default(false),
          includeFeatures: z.boolean().optional().default(false),
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

      // Include features if requested
      if (input?.includeFeatures) {
        const plansWithFeatures = await Promise.all(
          plansList.map(async (plan) => {
            const features = await ctx.db
              .select()
              .from(planFeatures)
              .where(eq(planFeatures.planId, plan.id))
              .orderBy(planFeatures.displayOrder);
            
            return { ...plan, features };
          })
        );
        
        return { plans: plansWithFeatures };
      }

      return { plans: plansList };
    }),

  // Get plan by ID with features (PUBLIC endpoint for signup page)
  getById: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/plans/{id}",
        tags: ["plans"],
        summary: "Get plan by ID",
        description: "Get a single plan by ID with features (public)",
        protect: false,
      },
    })
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
    .meta({
      openapi: {
        method: "POST",
        path: "/plans",
        tags: ["plans"],
        summary: "Create plan",
        description: "Create a new subscription plan (admin only)",
        protect: true,
      },
    })
    .input(
      z.object({
        name: translatedNameSchema,
        description: translatedDescriptionSchema.optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/),
        currency: z.string().default("USD"),
        billingCycle: z.enum(["daily","weekly","monthly", "quarterly","semiannually","annually"]).default("monthly"),
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
        description: {
          en: input.description?.en || "",
          ar: input.description?.ar || "",
        },
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

      if (!plan) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create plan",
        });
      }

      return { plan };
    }),

  // Update plan (admin only)
  update: adminProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/plans/{id}",
        tags: ["plans"],
        summary: "Update plan",
        description: "Update an existing subscription plan (admin only)",
        protect: true,
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
        name: translatedNameSchema.optional(),
        description: translatedDescriptionSchema.optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        currency: z.string().optional(),
        billingCycle: z.enum(["daily","weekly","monthly", "annually", "quarterly","semiannually"]).optional(),
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
      const { id, description, ...updateData } = input;

      // Normalize description if provided
      const normalizedData: any = { ...updateData, updatedAt: new Date() };
      if (description) {
        normalizedData.description = {
          en: description.en || "",
          ar: description.ar || "",
        };
      }

      const [updatedPlan] = await ctx.db
        .update(plans)
        .set(normalizedData)
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
    .meta({
      openapi: {
        method: "DELETE",
        path: "/plans/{id}",
        tags: ["plans"],
        summary: "Delete plan",
        description: "Delete a subscription plan (admin only)",
        protect: true,
      },
    })
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
    .meta({
      openapi: {
        method: "POST",
        path: "/plans/{planId}/features",
        tags: ["plans"],
        summary: "Add plan feature",
        description: "Add a feature to a subscription plan (admin only)",
        protect: true,
      },
    })
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
        description: input.description ? {
          en: input.description.en || "",
          ar: input.description.ar || "",
        } : null,
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

      if (!feature) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create feature",
        });
      }

      return { feature };
    }),

  // Update plan feature (admin only)
  updateFeature: adminProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/plans/features/{id}",
        tags: ["plans"],
        summary: "Update plan feature",
        description: "Update a feature of a subscription plan (admin only)",
        protect: true,
      },
    })
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
      const { id, description, ...updateData } = input;

      // Normalize description if provided
      const normalizedData: any = { ...updateData, updatedAt: new Date() };
      if (description) {
        normalizedData.description = {
          en: description.en || "",
          ar: description.ar || "",
        };
      }

      const [updatedFeature] = await ctx.db
        .update(planFeatures)
        .set(normalizedData)
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
    .meta({
      openapi: {
        method: "DELETE",
        path: "/plans/features/{id}",
        tags: ["plans"],
        summary: "Delete plan feature",
        description: "Delete a feature from a subscription plan (admin only)",
        protect: true,
      },
    })
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

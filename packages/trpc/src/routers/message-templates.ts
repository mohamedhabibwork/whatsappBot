import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  messageTemplates,
  userTenantRoles,
  type NewMessageTemplate,
} from "@repo/database";
import { eq, and, isNull, desc } from "drizzle-orm";
import { emitTemplateEvent } from "../utils/websocket-events";

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

export const messageTemplatesRouter = router({
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
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.tenantId, input.tenantId),
            isNull(messageTemplates.deletedAt),
          ),
        )
        .orderBy(desc(messageTemplates.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { templates: results };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.id, input.id),
            isNull(messageTemplates.deletedAt),
          ),
        )
        .limit(1);

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message template not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, template.tenantId);

      return { template };
    }),

  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        name: z.string().min(1).max(100),
        content: z.string().min(1),
        variables: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      const [newTemplate] = await ctx.db
        .insert(messageTemplates)
        .values({
          tenantId: input.tenantId,
          name: input.name,
          content: input.content,
          variables: input.variables || [],
        })
        .returning();

      if (!newTemplate) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create template",
        });
      }

      emitTemplateEvent("template_created", newTemplate.id, newTemplate.tenantId, {
        name: newTemplate.name,
      });

      return { template: newTemplate };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        content: z.string().min(1).optional(),
        variables: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.id, input.id),
            isNull(messageTemplates.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message template not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(messageTemplates)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(messageTemplates.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update template",
        });
      }

      emitTemplateEvent("template_updated", updated.id, updated.tenantId, {
        changes: Object.keys(updateData),
      });

      return { template: updated };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.id, input.id),
            isNull(messageTemplates.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message template not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(messageTemplates)
        .set({ deletedAt: new Date() })
        .where(eq(messageTemplates.id, input.id));

      emitTemplateEvent("template_deleted", existing.id, existing.tenantId);

      return { success: true };
    }),
});

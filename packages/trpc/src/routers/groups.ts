import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  groups,
  groupContacts,
  contacts,
  userTenantRoles,
  type NewGroup,
  type NewGroupContact,
} from "@repo/database";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import { emitGroupEvent } from "../utils/websocket-events";

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

export const groupsRouter = router({
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
        .from(groups)
        .where(
          and(
            eq(groups.tenantId, input.tenantId),
            isNull(groups.deletedAt),
          ),
        )
        .orderBy(desc(groups.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { groups: results };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [group] = await ctx.db
        .select()
        .from(groups)
        .where(
          and(
            eq(groups.id, input.id),
            isNull(groups.deletedAt),
          ),
        )
        .limit(1);

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, group.tenantId);

      const groupContactsList = await ctx.db
        .select({
          contact: contacts,
        })
        .from(groupContacts)
        .innerJoin(contacts, eq(groupContacts.contactId, contacts.id))
        .where(eq(groupContacts.groupId, input.id));

      return {
        group,
        contacts: groupContactsList.map((gc) => gc.contact),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        timezone: z.string().optional(),
        language: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      const [newGroup] = await ctx.db
        .insert(groups)
        .values({
          tenantId: input.tenantId,
          name: input.name,
          description: input.description,
          timezone: input.timezone,
          language: input.language,
        })
        .returning();

      if (!newGroup) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create group",
        });
      }

      emitGroupEvent("group_created", newGroup.id, newGroup.tenantId, {
        name: newGroup.name,
      });

      return { group: newGroup };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        timezone: z.string().optional(),
        language: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(groups)
        .where(
          and(
            eq(groups.id, input.id),
            isNull(groups.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(groups)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(groups.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update group",
        });
      }

      emitGroupEvent("group_updated", updated.id, updated.tenantId, {
        changes: Object.keys(updateData),
      });

      return { group: updated };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(groups)
        .where(
          and(
            eq(groups.id, input.id),
            isNull(groups.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(groups)
        .set({ deletedAt: new Date() })
        .where(eq(groups.id, input.id));

      emitGroupEvent("group_deleted", existing.id, existing.tenantId);

      return { success: true };
    }),

  addContacts: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        contactIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [group] = await ctx.db
        .select()
        .from(groups)
        .where(
          and(
            eq(groups.id, input.groupId),
            isNull(groups.deletedAt),
          ),
        )
        .limit(1);

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, group.tenantId, [
        "owner",
        "admin",
      ]);

      const contactsList = await ctx.db
        .select()
        .from(contacts)
        .where(
          and(
            inArray(contacts.id, input.contactIds),
            eq(contacts.tenantId, group.tenantId),
            isNull(contacts.deletedAt),
          ),
        );

      if (contactsList.length !== input.contactIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some contacts not found or do not belong to this tenant",
        });
      }

      const values = input.contactIds.map((contactId) => ({
        groupId: input.groupId,
        contactId,
      }));

      await ctx.db
        .insert(groupContacts)
        .values(values)
        .onConflictDoNothing();

      return { success: true };
    }),

  removeContacts: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        contactIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [group] = await ctx.db
        .select()
        .from(groups)
        .where(
          and(
            eq(groups.id, input.groupId),
            isNull(groups.deletedAt),
          ),
        )
        .limit(1);

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, group.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .delete(groupContacts)
        .where(
          and(
            eq(groupContacts.groupId, input.groupId),
            inArray(groupContacts.contactId, input.contactIds),
          ),
        );

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
        .update(groups)
        .set({ deletedAt: new Date() })
        .where(
          and(
            inArray(groups.id, input.ids),
            eq(groups.tenantId, input.tenantId),
            isNull(groups.deletedAt),
          ),
        );

      emitGroupEvent("groups_bulk_deleted", "", input.tenantId, {
        count: input.ids.length,
      });

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
        .update(groups)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(groups.id, input.ids),
            eq(groups.tenantId, input.tenantId),
            isNull(groups.deletedAt),
          ),
        );

      emitGroupEvent("groups_bulk_updated", "", input.tenantId, {
        count: input.ids.length,
        isActive: input.isActive,
      });

      return { success: true };
    }),
});

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
  selectGroupSchema,
  selectContactSchema,
} from "@repo/database";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import { emitGroupEvent } from "../utils/websocket-events";

// Input Schemas
export const listGroupsInputSchema = z.object({
  tenantId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const getGroupByIdInputSchema = z.object({ id: z.string().uuid() });

export const createGroupInputSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export const updateGroupInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export const deleteGroupInputSchema = z.object({ id: z.string().uuid() });

export const addContactsInputSchema = z.object({
  groupId: z.string().uuid(),
  contactIds: z.array(z.string().uuid()).min(1),
});

export const removeContactsInputSchema = z.object({
  groupId: z.string().uuid(),
  contactIds: z.array(z.string().uuid()).min(1),
});

export const bulkDeleteGroupsInputSchema = z.object({
  tenantId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
});

export const bulkUpdateGroupsStatusInputSchema = z.object({
  tenantId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
  isActive: z.boolean(),
});

// Output Schemas
export const listGroupsOutputSchema = z.object({
  groups: z.array(selectGroupSchema),
});

export const getGroupByIdOutputSchema = z.object({
  group: selectGroupSchema,
  contacts: z.array(selectContactSchema),
});

export const createGroupOutputSchema = z.object({
  group: selectGroupSchema,
});

export const updateGroupOutputSchema = z.object({
  group: selectGroupSchema,
});

export const deleteGroupOutputSchema = z.object({ success: z.boolean() });

export const addContactsOutputSchema = z.object({ success: z.boolean() });

export const removeContactsOutputSchema = z.object({ success: z.boolean() });

export const bulkDeleteGroupsOutputSchema = z.object({ success: z.boolean() });

export const bulkUpdateGroupsStatusOutputSchema = z.object({ success: z.boolean() });

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
    .meta({
      openapi: {
        method: "GET",
        path: "/groups/list",
        tags: ["groups"],
        summary: "List groups",
        description: "Get paginated list of groups for a tenant",
        protect: true,
      },
    })
    .input(listGroupsInputSchema)
    .output(listGroupsOutputSchema)
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
    .meta({
      openapi: {
        method: "GET",
        path: "/groups/{id}",
        tags: ["groups"],
        summary: "Get group by ID",
        description: "Get a single group by ID with its contacts",
        protect: true,
      },
    })
    .input(getGroupByIdInputSchema)
    .output(getGroupByIdOutputSchema)
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
    .meta({
      openapi: {
        method: "POST",
        path: "/groups",
        tags: ["groups"],
        summary: "Create group",
        description: "Create a new group for a tenant",
        protect: true,
      },
    })
    .input(createGroupInputSchema)
    .output(createGroupOutputSchema)
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
    .meta({
      openapi: {
        method: "PATCH",
        path: "/groups/{id}",
        tags: ["groups"],
        summary: "Update group",
        description: "Update an existing group",
        protect: true,
      },
    })
    .input(updateGroupInputSchema)
    .output(updateGroupOutputSchema)
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
    .meta({
      openapi: {
        method: "DELETE",
        path: "/groups/{id}",
        tags: ["groups"],
        summary: "Delete group",
        description: "Soft delete a group",
        protect: true,
      },
    })
    .input(deleteGroupInputSchema)
    .output(deleteGroupOutputSchema)
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
    .meta({
      openapi: {
        method: "POST",
        path: "/groups/{groupId}/contacts",
        tags: ["groups"],
        summary: "Add contacts to group",
        description: "Add multiple contacts to a group",
        protect: true,
      },
    })
    .input(addContactsInputSchema)
    .output(addContactsOutputSchema)
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
    .meta({
      openapi: {
        method: "DELETE",
        path: "/groups/{groupId}/contacts",
        tags: ["groups"],
        summary: "Remove contacts from group",
        description: "Remove multiple contacts from a group",
        protect: true,
      },
    })
    .input(removeContactsInputSchema)
    .output(removeContactsOutputSchema)
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
    .meta({
      openapi: {
        method: "POST",
        path: "/groups/bulk-delete",
        tags: ["groups"],
        summary: "Bulk delete groups",
        description: "Soft delete multiple groups",
        protect: true,
      },
    })
    .input(bulkDeleteGroupsInputSchema)
    .output(bulkDeleteGroupsOutputSchema)
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
    .meta({
      openapi: {
        method: "POST",
        path: "/groups/bulk-update-status",
        tags: ["groups"],
        summary: "Bulk update group status",
        description: "Update active status for multiple groups",
        protect: true,
      },
    })
    .input(bulkUpdateGroupsStatusInputSchema)
    .output(bulkUpdateGroupsStatusOutputSchema)
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

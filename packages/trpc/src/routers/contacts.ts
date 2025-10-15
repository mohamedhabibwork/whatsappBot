import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  contacts,
  userTenantRoles,
  type NewContact,
  selectContactSchema,
} from "@repo/database";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import { emitContactEvent } from "../utils/websocket-events";

// Input Schemas
export const listContactsInputSchema = z.object({
  tenantId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const getContactByIdInputSchema = z.object({ id: z.string().uuid() });

export const createContactInputSchema = z.object({
  tenantId: z.string().uuid(),
  phoneNumber: z.string().min(1),
  name: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export const updateContactInputSchema = z.object({
  id: z.string().uuid(),
  phoneNumber: z.string().min(1).optional(),
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export const deleteContactInputSchema = z.object({ id: z.string().uuid() });

export const bulkDeleteContactsInputSchema = z.object({
  tenantId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
});

export const bulkUpdateContactsStatusInputSchema = z.object({
  tenantId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
  isActive: z.boolean(),
});

// Output Schemas
export const listContactsOutputSchema = z.object({
  contacts: z.array(selectContactSchema),
});

export const getContactByIdOutputSchema = z.object({
  contact: selectContactSchema,
});

export const createContactOutputSchema = z.object({
  contact: selectContactSchema,
});

export const updateContactOutputSchema = z.object({
  contact: selectContactSchema,
});

export const deleteContactOutputSchema = z.object({ success: z.boolean() });

export const bulkDeleteContactsOutputSchema = z.object({ success: z.boolean() });

export const bulkUpdateContactsStatusOutputSchema = z.object({ success: z.boolean() });

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

export const contactsRouter = router({
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/contacts/list",
        tags: ["contacts"],
        summary: "List contacts",
        description: "Get paginated list of contacts for a tenant",
        protect: true,
      },
    })
    .input(listContactsInputSchema)
    .output(listContactsOutputSchema)
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId);

      const results = await ctx.db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.tenantId, input.tenantId),
            isNull(contacts.deletedAt),
          ),
        )
        .orderBy(desc(contacts.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { contacts: results };
    }),

  getById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/contacts/{id}",
        tags: ["contacts"],
        summary: "Get contact by ID",
        description: "Get a single contact by ID",
        protect: true,
      },
    })
    .input(getContactByIdInputSchema)
    .output(getContactByIdOutputSchema)
    .query(async ({ ctx, input }) => {
      const [contact] = await ctx.db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, input.id),
            isNull(contacts.deletedAt),
          ),
        )
        .limit(1);

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, contact.tenantId);

      return { contact };
    }),

  create: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/contacts",
        tags: ["contacts"],
        summary: "Create contact",
        description: "Create a new contact for a tenant",
        protect: true,
      },
    })
    .input(createContactInputSchema)
    .output(createContactOutputSchema)
    .mutation(async ({ input, ctx }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      const [existing] = await ctx.db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.tenantId, input.tenantId),
            eq(contacts.phoneNumber, input.phoneNumber),
            isNull(contacts.deletedAt),
          ),
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Contact with this phone number already exists",
        });
      }

      const [newContact] = await ctx.db
        .insert(contacts)
        .values({
          tenantId: input.tenantId,
          phoneNumber: input.phoneNumber,
          name: input.name,
          timezone: input.timezone,
          language: input.language,
        })
        .returning();

      if (!newContact) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create contact",
        });
      }

      emitContactEvent("contact_created", newContact.id, newContact.tenantId, {
        phoneNumber: newContact.phoneNumber,
        name: newContact.name,
      });

      return { contact: newContact };
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/contacts/{id}",
        tags: ["contacts"],
        summary: "Update contact",
        description: "Update an existing contact",
        protect: true,
      },
    })
    .input(updateContactInputSchema)
    .output(updateContactOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, input.id),
            isNull(contacts.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(contacts)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(contacts.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update contact",
        });
      }

      emitContactEvent("contact_updated", updated.id, updated.tenantId, {
        changes: Object.keys(updateData),
      });

      return { contact: updated };
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/contacts/{id}",
        tags: ["contacts"],
        summary: "Delete contact",
        description: "Soft delete a contact",
        protect: true,
      },
    })
    .input(deleteContactInputSchema)
    .output(deleteContactOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, input.id),
            isNull(contacts.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(contacts)
        .set({ deletedAt: new Date() })
        .where(eq(contacts.id, input.id));

      emitContactEvent("contact_deleted", existing.id, existing.tenantId);

      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/contacts/bulk-delete",
        tags: ["contacts"],
        summary: "Bulk delete contacts",
        description: "Soft delete multiple contacts",
        protect: true,
      },
    })
    .input(bulkDeleteContactsInputSchema)
    .output(bulkDeleteContactsOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(contacts)
        .set({ deletedAt: new Date() })
        .where(
          and(
            inArray(contacts.id, input.ids),
            eq(contacts.tenantId, input.tenantId),
            isNull(contacts.deletedAt),
          ),
        );

      emitContactEvent("contacts_bulk_deleted", "", input.tenantId, {
        count: input.ids.length,
      });

      return { success: true };
    }),

  bulkUpdateStatus: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/contacts/bulk-update-status",
        tags: ["contacts"],
        summary: "Bulk update contact status",
        description: "Update active status for multiple contacts",
        protect: true,
      },
    })
    .input(bulkUpdateContactsStatusInputSchema)
    .output(bulkUpdateContactsStatusOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(contacts)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(contacts.id, input.ids),
            eq(contacts.tenantId, input.tenantId),
            isNull(contacts.deletedAt),
          ),
        );

      emitContactEvent("contacts_bulk_updated", "", input.tenantId, {
        count: input.ids.length,
        isActive: input.isActive,
      });

      return { success: true };
    }),
});

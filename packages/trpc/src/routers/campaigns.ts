import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  campaigns,
  campaignRecipients,
  contacts,
  groups,
  groupContacts,
  whatsappInstances,
  userTenantRoles,
  type NewCampaign,
  type NewCampaignRecipient,
} from "@repo/database";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import { emitCampaignEvent } from "../utils/websocket-events";

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

export const campaignsRouter = router({
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
        .from(campaigns)
        .where(
          and(
            eq(campaigns.tenantId, input.tenantId),
            isNull(campaigns.deletedAt),
          ),
        )
        .orderBy(desc(campaigns.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { campaigns: results };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [campaign] = await ctx.db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.id, input.id),
            isNull(campaigns.deletedAt),
          ),
        )
        .limit(1);

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, campaign.tenantId);

      const recipients = await ctx.db
        .select({
          recipient: campaignRecipients,
          contact: contacts,
        })
        .from(campaignRecipients)
        .leftJoin(contacts, eq(campaignRecipients.contactId, contacts.id))
        .where(eq(campaignRecipients.campaignId, input.id));

      return {
        campaign,
        recipients: recipients.map((r) => ({
          ...r.recipient,
          contact: r.contact,
        })),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        whatsappInstanceId: z.string().uuid(),
        messageTemplateId: z.string().uuid().optional(),
        name: z.string().min(1).max(100),
        message: z.string().min(1),
        scheduledAt: z.date().optional(),
        recipientType: z.enum(["contacts", "groups"]),
        recipientIds: z.array(z.string().uuid()).min(1),
        timezone: z.string().optional(),
        language: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.whatsappInstanceId),
            eq(whatsappInstances.tenantId, input.tenantId),
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

      let recipientContacts: any[] = [];

      if (input.recipientType === "contacts") {
        recipientContacts = await ctx.db
          .select()
          .from(contacts)
          .where(
            and(
              inArray(contacts.id, input.recipientIds),
              eq(contacts.tenantId, input.tenantId),
              isNull(contacts.deletedAt),
            ),
          );
      } else {
        const groupsList = await ctx.db
          .select()
          .from(groups)
          .where(
            and(
              inArray(groups.id, input.recipientIds),
              eq(groups.tenantId, input.tenantId),
              isNull(groups.deletedAt),
            ),
          );

        if (groupsList.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No valid groups found",
          });
        }

        recipientContacts = await ctx.db
          .select({ contact: contacts })
          .from(groupContacts)
          .innerJoin(contacts, eq(groupContacts.contactId, contacts.id))
          .where(
            and(
              inArray(groupContacts.groupId, input.recipientIds),
              isNull(contacts.deletedAt),
            ),
          )
          .then((results) => results.map((r) => r.contact));
      }

      if (recipientContacts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No valid recipients found",
        });
      }

      const [newCampaign] = await ctx.db
        .insert(campaigns)
        .values({
          tenantId: input.tenantId,
          whatsappInstanceId: input.whatsappInstanceId,
          messageTemplateId: input.messageTemplateId,
          name: input.name,
          message: input.message,
          scheduledAt: input.scheduledAt,
          totalRecipients: recipientContacts.length,
          status: "draft",
          timezone: input.timezone,
          language: input.language,
        })
        .returning();

      if (!newCampaign) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create campaign",
        });
      }

      const recipientValues = recipientContacts.map((contact) => ({
        campaignId: newCampaign.id,
        contactId: contact.id,
        status: "pending" as const,
      }));

      await ctx.db.insert(campaignRecipients).values(recipientValues);

      emitCampaignEvent("campaign_created", newCampaign.id, newCampaign.tenantId, {
        name: newCampaign.name,
      });

      return { campaign: newCampaign };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        message: z.string().min(1).optional(),
        scheduledAt: z.date().optional(),
        status: z.enum(["draft", "scheduled", "running", "completed", "cancelled"]).optional(),
        timezone: z.string().optional(),
        language: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.id, input.id),
            isNull(campaigns.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      if (existing.status === "running" || existing.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update a running or completed campaign",
        });
      }

      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(campaigns)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(campaigns.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update campaign",
        });
      }

      emitCampaignEvent("campaign_updated", updated.id, updated.tenantId, {
        changes: Object.keys(updateData),
      });

      return { campaign: updated };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.id, input.id),
            isNull(campaigns.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      if (existing.status === "running") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete a running campaign",
        });
      }

      await ctx.db
        .update(campaigns)
        .set({ deletedAt: new Date() })
        .where(eq(campaigns.id, input.id));

      emitCampaignEvent("campaign_deleted", existing.id, existing.tenantId);

      return { success: true };
    }),

  start: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.id, input.id),
            isNull(campaigns.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      if (existing.status !== "draft" && existing.status !== "scheduled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign cannot be started",
        });
      }

      const [updated] = await ctx.db
        .update(campaigns)
        .set({
          status: "running",
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start campaign",
        });
      }

      emitCampaignEvent("campaign_status_changed", updated.id, updated.tenantId, {
        status: updated.status,
        previousStatus: existing.status,
      });

      return { campaign: updated };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.id, input.id),
            isNull(campaigns.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      if (existing.status === "completed" || existing.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Campaign is already completed or cancelled",
        });
      }

      const [updated] = await ctx.db
        .update(campaigns)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel campaign",
        });
      }

      emitCampaignEvent("campaign_status_changed", updated.id, updated.tenantId, {
        status: updated.status,
        previousStatus: existing.status,
      });

      return { campaign: updated };
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
        .update(campaigns)
        .set({ deletedAt: new Date() })
        .where(
          and(
            inArray(campaigns.id, input.ids),
            eq(campaigns.tenantId, input.tenantId),
            isNull(campaigns.deletedAt),
          ),
        );

      emitCampaignEvent("campaigns_bulk_deleted", "", input.tenantId, {
        count: input.ids.length,
      });

      return { success: true };
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1),
        status: z.enum(["draft", "scheduled", "running", "completed", "cancelled"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(campaigns)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(campaigns.id, input.ids),
            eq(campaigns.tenantId, input.tenantId),
            isNull(campaigns.deletedAt),
          ),
        );

      emitCampaignEvent("campaigns_bulk_updated", "", input.tenantId, {
        count: input.ids.length,
        status: input.status,
      });

      return { success: true };
    }),
});

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { notifications, type NewNotification } from "@repo/database";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";

// Input Schemas
export const listNotificationsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  isRead: z.boolean().optional(),
});

export const getNotificationByIdInputSchema = z.object({ id: z.string().uuid() });

export const markAsReadInputSchema = z.object({ id: z.string().uuid() });

export const bulkMarkAsReadInputSchema = z.object({ ids: z.array(z.string().uuid()).min(1) });

export const deleteNotificationInputSchema = z.object({ id: z.string().uuid() });

export const bulkDeleteNotificationsInputSchema = z.object({ ids: z.array(z.string().uuid()).min(1) });

// Output Schemas
const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string().nullable(),
  isRead: z.boolean(),
  readAt: z.date().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const listNotificationsOutputSchema = z.object({
  notifications: z.array(notificationSchema),
});

export const getNotificationByIdOutputSchema = z.object({
  notification: notificationSchema,
});

export const markAsReadOutputSchema = z.object({
  notification: notificationSchema,
});

export const markAllAsReadOutputSchema = z.object({ success: z.boolean() });

export const bulkMarkAsReadOutputSchema = z.object({ success: z.boolean() });

export const deleteNotificationOutputSchema = z.object({ success: z.boolean() });

export const bulkDeleteNotificationsOutputSchema = z.object({ success: z.boolean() });

export const unreadCountOutputSchema = z.object({ count: z.number() });

export const notificationsRouter = router({
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/notifications/list",
        tags: ["notifications"],
        summary: "List notifications",
        description: "Get paginated list of notifications for current user",
        protect: true,
      },
    })
    .input(listNotificationsInputSchema)
    .output(listNotificationsOutputSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(notifications.userId, ctx.userId),
        isNull(notifications.deletedAt),
      ];

      if (input.isRead !== undefined) {
        conditions.push(eq(notifications.isRead, input.isRead));
      }

      const results = await ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { notifications: results };
    }),

  getById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/notifications/{id}",
        tags: ["notifications"],
        summary: "Get notification by ID",
        description: "Get a single notification by ID",
        protect: true,
      },
    })
    .input(getNotificationByIdInputSchema)
    .output(getNotificationByIdOutputSchema)
    .query(async ({ ctx, input }) => {
      const [notification] = await ctx.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.userId),
            isNull(notifications.deletedAt),
          ),
        )
        .limit(1);

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      return { notification };
    }),

  markAsRead: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/notifications/{id}/mark-read",
        tags: ["notifications"],
        summary: "Mark notification as read",
        description: "Mark a single notification as read",
        protect: true,
      },
    })
    .input(markAsReadInputSchema)
    .output(markAsReadOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.userId),
            isNull(notifications.deletedAt),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      return { notification: updated };
    }),

  markAllAsRead: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/notifications/mark-all-read",
        tags: ["notifications"],
        summary: "Mark all notifications as read",
        description: "Mark all unread notifications as read for current user",
        protect: true,
      },
    })
    .output(markAllAsReadOutputSchema)
    .mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.userId, ctx.userId),
          eq(notifications.isRead, false),
          isNull(notifications.deletedAt),
        ),
      );

    return { success: true };
  }),

  bulkMarkAsRead: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/notifications/bulk-mark-read",
        tags: ["notifications"],
        summary: "Bulk mark notifications as read",
        description: "Mark multiple notifications as read",
        protect: true,
      },
    })
    .input(bulkMarkAsReadInputSchema)
    .output(bulkMarkAsReadOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            inArray(notifications.id, input.ids),
            eq(notifications.userId, ctx.userId),
            isNull(notifications.deletedAt),
          ),
        );

      return { success: true };
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/notifications/{id}",
        tags: ["notifications"],
        summary: "Delete notification",
        description: "Soft delete a notification",
        protect: true,
      },
    })
    .input(deleteNotificationInputSchema)
    .output(deleteNotificationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.userId),
            isNull(notifications.deletedAt),
          ),
        );

      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/notifications/bulk-delete",
        tags: ["notifications"],
        summary: "Bulk delete notifications",
        description: "Soft delete multiple notifications",
        protect: true,
      },
    })
    .input(bulkDeleteNotificationsInputSchema)
    .output(bulkDeleteNotificationsOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({ deletedAt: new Date() })
        .where(
          and(
            inArray(notifications.id, input.ids),
            eq(notifications.userId, ctx.userId),
            isNull(notifications.deletedAt),
          ),
        );

      return { success: true };
    }),

  unreadCount: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/notifications/unread-count",
        tags: ["notifications"],
        summary: "Get unread count",
        description: "Get count of unread notifications for current user",
        protect: true,
      },
    })
    .output(unreadCountOutputSchema)
    .query(async ({ ctx }) => {
    const [result] = await ctx.db
      .select({ count: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.userId),
          eq(notifications.isRead, false),
          isNull(notifications.deletedAt),
        ),
      );

    return { count: result ? 1 : 0 };
  }),
});

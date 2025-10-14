import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { notifications, type NewNotification } from "@repo/database";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        isRead: z.boolean().optional(),
      }),
    )
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
    .input(z.object({ id: z.string().uuid() }))
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
    .input(z.object({ id: z.string().uuid() }))
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

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
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
    .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
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
    .input(z.object({ id: z.string().uuid() }))
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
    .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
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

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
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

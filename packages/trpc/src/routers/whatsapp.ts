import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { whatsappInstances } from "@repo/database";
import { eq, and } from "drizzle-orm";

export const whatsappRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const instances = await ctx.db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.userId, ctx.userId));

    return instances;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            eq(whatsappInstances.userId, ctx.userId),
          ),
        )
        .limit(1);

      return instance || null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        sessionName: z.string().min(1),
        config: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .insert(whatsappInstances)
        .values({
          userId: ctx.userId,
          name: input.name,
          sessionName: input.sessionName,
          config: input.config,
        })
        .returning();

      return instance;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        status: z.string().optional(),
        qrCode: z.string().optional(),
        phoneNumber: z.string().optional(),
        isActive: z.boolean().optional(),
        config: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(whatsappInstances)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(whatsappInstances.id, id),
            eq(whatsappInstances.userId, ctx.userId),
          ),
        )
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            eq(whatsappInstances.userId, ctx.userId),
          ),
        );

      return { success: true };
    }),
});

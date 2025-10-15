import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { messages, whatsappInstances } from "@repo/database";
import { eq, and, desc } from "drizzle-orm";

export const messagesRouter = router({
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/messages/list",
        tags: ["messages"],
        summary: "List messages",
        description: "Get paginated list of messages for a WhatsApp instance",
        protect: true,
      },
    })
    .input(
      z.object({
        instanceId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify instance ownership
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.instanceId),
            eq(whatsappInstances.userId, ctx.userId),
          ),
        )
        .limit(1);

      if (!instance) {
        throw new Error("Instance not found or unauthorized");
      }

      const messagesList = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.instanceId, input.instanceId))
        .orderBy(desc(messages.timestamp))
        .limit(input.limit)
        .offset(input.offset);

      return messagesList;
    }),

  getByChatId: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/messages/by-chat/{chatId}",
        tags: ["messages"],
        summary: "Get messages by chat ID",
        description: "Get paginated list of messages for a specific chat",
        protect: true,
      },
    })
    .input(
      z.object({
        instanceId: z.string().uuid(),
        chatId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify instance ownership
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.instanceId),
            eq(whatsappInstances.userId, ctx.userId),
          ),
        )
        .limit(1);

      if (!instance) {
        throw new Error("Instance not found or unauthorized");
      }

      const messagesList = await ctx.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.instanceId, input.instanceId),
            eq(messages.chatId, input.chatId),
          ),
        )
        .orderBy(desc(messages.timestamp))
        .limit(input.limit)
        .offset(input.offset);

      return messagesList;
    }),
});

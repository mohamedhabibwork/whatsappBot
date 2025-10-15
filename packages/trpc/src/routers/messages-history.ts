import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  messagesHistory,
  contacts,
  whatsappInstances,
  userTenantRoles,
  type NewMessageHistory,
} from "@repo/database";
import { eq, and, isNull, desc } from "drizzle-orm";

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

export const messagesHistoryRouter = router({
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/messages-history/list",
        tags: ["messages-history"],
        summary: "List message history",
        description: "Get paginated list of message history for a tenant",
        protect: true,
      },
    })
    .input(
      z.object({
        tenantId: z.string().uuid(),
        whatsappInstanceId: z.string().uuid().optional(),
        contactId: z.string().uuid().optional(),
        chatId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId);

      const conditions = [eq(messagesHistory.tenantId, input.tenantId)];

      if (input.whatsappInstanceId) {
        conditions.push(eq(messagesHistory.whatsappInstanceId, input.whatsappInstanceId));
      }

      if (input.contactId) {
        conditions.push(eq(messagesHistory.contactId, input.contactId));
      }

      if (input.chatId) {
        conditions.push(eq(messagesHistory.chatId, input.chatId));
      }

      const results = await ctx.db
        .select({
          message: messagesHistory,
          contact: contacts,
        })
        .from(messagesHistory)
        .leftJoin(contacts, eq(messagesHistory.contactId, contacts.id))
        .where(and(...conditions))
        .orderBy(desc(messagesHistory.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        messages: results.map((r) => ({
          ...r.message,
          contact: r.contact,
        })),
      };
    }),

  getById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/messages-history/{id}",
        tags: ["messages-history"],
        summary: "Get message history by ID",
        description: "Get a single message history record by ID",
        protect: true,
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [message] = await ctx.db
        .select({
          message: messagesHistory,
          contact: contacts,
        })
        .from(messagesHistory)
        .leftJoin(contacts, eq(messagesHistory.contactId, contacts.id))
        .where(eq(messagesHistory.id, input.id))
        .limit(1);

      if (!message) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, message.message.tenantId);

      return {
        message: {
          ...message.message,
          contact: message.contact,
        },
      };
    }),

  create: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/messages-history",
        tags: ["messages-history"],
        summary: "Create message history record",
        description: "Create a new message history record",
        protect: true,
      },
    })
    .input(
      z.object({
        tenantId: z.string().uuid(),
        whatsappInstanceId: z.string().uuid(),
        contactId: z.string().uuid().optional(),
        messageId: z.string().optional(),
        chatId: z.string(),
        direction: z.enum(["inbound", "outbound"]),
        type: z.string().default("text"),
        content: z.string().optional(),
        metadata: z.any().optional(),
        status: z.string().default("sent"),
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

      const [newMessage] = await ctx.db
        .insert(messagesHistory)
        .values({
          tenantId: input.tenantId,
          whatsappInstanceId: input.whatsappInstanceId,
          contactId: input.contactId,
          messageId: input.messageId,
          chatId: input.chatId,
          direction: input.direction,
          type: input.type,
          content: input.content,
          metadata: input.metadata,
          status: input.status,
          sentAt: input.direction === "outbound" ? new Date() : undefined,
        })
        .returning();

      return { message: newMessage };
    }),

  updateStatus: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/messages-history/{id}/status",
        tags: ["messages-history"],
        summary: "Update message status",
        description: "Update the status of a message history record",
        protect: true,
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["sent", "delivered", "read", "failed"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await ctx.db
        .select()
        .from(messagesHistory)
        .where(eq(messagesHistory.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const updateData: any = { status: input.status };

      if (input.status === "delivered") {
        updateData.deliveredAt = new Date();
      } else if (input.status === "read") {
        updateData.readAt = new Date();
      }

      const [updated] = await ctx.db
        .update(messagesHistory)
        .set(updateData)
        .where(eq(messagesHistory.id, input.id))
        .returning();

      return { message: updated };
    }),
});

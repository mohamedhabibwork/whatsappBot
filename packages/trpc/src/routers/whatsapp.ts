import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { 
  whatsappInstances, 
  userTenantRoles,
  contacts,
  groups,
  groupContacts,
  messageTemplates
} from "@repo/database";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import { WhatsAppClient } from "@repo/whatsapp-client-sdk";
import { trackUsage } from "../utils/subscription-usage";
import { whatsappMessageQueue } from "@repo/queue";
import { 
  replaceTemplateVariables,
  buildContactVariables,
  mergeVariables
} from "../utils/template-variables";
import { emitWhatsAppEvent } from "../utils/websocket-events";

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

function getWhatsAppClient(sessionName: string, token?: string): WhatsAppClient {
  const baseURL = process.env.WHATSAPP_SERVER_URL || "http://localhost:21465";
  const secretKey = process.env.WHATSAPP_SERVER_SECRET || "";

  if (!secretKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "WhatsApp server secret key not configured",
    });
  }

  return new WhatsAppClient({
    baseURL,
    secretKey,
    session: sessionName,
    token,
  });
}

export const whatsappRouter = router({
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/whatsapp/list",
        tags: ["whatsapp"],
        summary: "List WhatsApp instances",
        description: "Get paginated list of WhatsApp instances for a tenant",
        protect: true,
      },
    })
    .input(
      z.object({
        tenantId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId);

      const instances = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.tenantId, input.tenantId),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .orderBy(desc(whatsappInstances.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { instances };
    }),

  getById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/whatsapp/{id}",
        tags: ["whatsapp"],
        summary: "Get WhatsApp instance by ID",
        description: "Get a single WhatsApp instance by ID",
        protect: true,
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
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

      await checkTenantAccess(ctx.db, ctx.userId, instance.tenantId);

      return { instance };
    }),

  getQrCode: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/whatsapp/{id}/qr-code",
        tags: ["whatsapp"],
        summary: "Get QR code",
        description: "Get QR code for WhatsApp instance authentication",
        protect: true,
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
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

      await checkTenantAccess(ctx.db, ctx.userId, instance.tenantId);

      // Get fresh QR code from WhatsApp server
      if (instance.token) {
        try {
          const client = getWhatsAppClient(instance.sessionName, instance.token);
          const qrCodeResponse = await client.auth.getQRCode();
          
          if (qrCodeResponse?.base64Qr) {
            // Update database with fresh QR code
            await ctx.db
              .update(whatsappInstances)
              .set({
                qrCode: qrCodeResponse.base64Qr,
                updatedAt: new Date(),
              })
              .where(eq(whatsappInstances.id, input.id));

            return {
              qrCode: qrCodeResponse.base64Qr,
              status: instance.status,
            };
          }
        } catch (error) {
          console.error("Failed to get QR code:", error);
        }
      }

      return {
        qrCode: instance.qrCode,
        status: instance.status,
      };
    }),

  create: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/whatsapp",
        tags: ["whatsapp"],
        summary: "Create WhatsApp instance",
        description: "Create a new WhatsApp instance",
        protect: true,
      },
    })
    .input(
      z.object({
        tenantId: z.string().uuid(),
        name: z.string().min(1).max(100),
        sessionName: z.string().min(1),
        webhook: z.string().url().optional(),
        config: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkTenantAccess(ctx.db, ctx.userId, input.tenantId, [
        "owner",
        "admin",
      ]);

      const [existing] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.sessionName, input.sessionName),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Session name already exists",
        });
      }

      // Generate token using WhatsApp SDK
      const client = getWhatsAppClient(input.sessionName);
      let token: string | undefined;

      try {
        const tokenResponse = await client.auth.generateToken();
        token = tokenResponse.token;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate WhatsApp token",
          cause: error,
        });
      }

      const [instance] = await ctx.db
        .insert(whatsappInstances)
        .values({
          userId: ctx.userId,
          tenantId: input.tenantId,
          name: input.name,
          sessionName: input.sessionName,
          token,
          config: input.config,
        })
        .returning();

      if (!instance) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create WhatsApp instance",
        });
      }

      // Start session with webhook if provided
      if (token) {
        try {
          client.setAuthToken(token);
          await client.auth.startSession({
            webhook: input.webhook,
            waitQrCode: true,
          });

          // Get initial QR code
          const qrCodeResponse = await client.auth.getQRCode();
          if (qrCodeResponse?.base64Qr) {
            await ctx.db
              .update(whatsappInstances)
              .set({
                qrCode: qrCodeResponse.base64Qr,
                status: "connecting",
                updatedAt: new Date(),
              })
              .where(eq(whatsappInstances.id, instance.id));

            instance.qrCode = qrCodeResponse.base64Qr;
            instance.status = "connecting";
          }
        } catch (error) {
          console.error("Failed to start session:", error);
          // Don't fail the creation, just log the error
        }
      }

      emitWhatsAppEvent(
        "whatsapp_instance_created",
        instance.id,
        instance.tenantId,
        { name: instance.name, sessionName: instance.sessionName }
      );

      return { instance };
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/whatsapp/{id}",
        tags: ["whatsapp"],
        summary: "Update WhatsApp instance",
        description: "Update an existing WhatsApp instance",
        protect: true,
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        status: z.string().optional(),
        qrCode: z.string().optional(),
        phoneNumber: z.string().optional(),
        isActive: z.boolean().optional(),
        config: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WhatsApp instance not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(whatsappInstances)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(whatsappInstances.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update WhatsApp instance",
        });
      }

      emitWhatsAppEvent(
        "whatsapp_instance_updated",
        updated.id,
        updated.tenantId,
        { changes: updateData }
      );

      return { instance: updated };
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/whatsapp/{id}",
        tags: ["whatsapp"],
        summary: "Delete WhatsApp instance",
        description: "Soft delete a WhatsApp instance",
        protect: true,
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WhatsApp instance not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      await ctx.db
        .update(whatsappInstances)
        .set({ deletedAt: new Date() })
        .where(eq(whatsappInstances.id, input.id));

      emitWhatsAppEvent(
        "whatsapp_instance_deleted",
        existing.id,
        existing.tenantId,
        { name: existing.name }
      );

      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/whatsapp/bulk-delete",
        tags: ["whatsapp"],
        summary: "Bulk delete WhatsApp instances",
        description: "Soft delete multiple WhatsApp instances",
        protect: true,
      },
    })
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
        .update(whatsappInstances)
        .set({ deletedAt: new Date() })
        .where(
          and(
            inArray(whatsappInstances.id, input.ids),
            eq(whatsappInstances.tenantId, input.tenantId),
            isNull(whatsappInstances.deletedAt),
          ),
        );

      return { success: true };
    }),

  bulkUpdateStatus: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/whatsapp/bulk-update-status",
        tags: ["whatsapp"],
        summary: "Bulk update WhatsApp instance status",
        description: "Update active status for multiple WhatsApp instances",
        protect: true,
      },
    })
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
        .update(whatsappInstances)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(whatsappInstances.id, input.ids),
            eq(whatsappInstances.tenantId, input.tenantId),
            isNull(whatsappInstances.deletedAt),
          ),
        );

      return { success: true };
    }),

  disconnect: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/whatsapp/{id}/disconnect",
        tags: ["whatsapp"],
        summary: "Disconnect WhatsApp instance",
        description: "Disconnect and logout a WhatsApp instance",
        protect: true,
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WhatsApp instance not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      // Logout session using SDK
      if (existing.token) {
        try {
          const client = getWhatsAppClient(existing.sessionName, existing.token);
          await client.auth.logoutSession();
        } catch (error) {
          console.error("Failed to logout session:", error);
          // Continue with database update even if SDK call fails
        }
      }

      const [updated] = await ctx.db
        .update(whatsappInstances)
        .set({
          status: "disconnected",
          qrCode: null,
          updatedAt: new Date(),
        })
        .where(eq(whatsappInstances.id, input.id))
        .returning();

      emitWhatsAppEvent(
        "whatsapp_instance_disconnected",
        existing.id,
        existing.tenantId,
        { sessionName: existing.sessionName }
      );

      return { instance: updated };
    }),

  reconnect: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/whatsapp/{id}/reconnect",
        tags: ["whatsapp"],
        summary: "Reconnect WhatsApp instance",
        description: "Reconnect a disconnected WhatsApp instance",
        protect: true,
      },
    })
    .input(z.object({ 
      id: z.string().uuid(),
      webhook: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
            isNull(whatsappInstances.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "WhatsApp instance not found",
        });
      }

      await checkTenantAccess(ctx.db, ctx.userId, existing.tenantId, [
        "owner",
        "admin",
      ]);

      // Start session using SDK
      if (existing.token) {
        try {
          const client = getWhatsAppClient(existing.sessionName, existing.token);
          await client.auth.startSession({
            webhook: input.webhook,
            waitQrCode: true,
          });

          // Get QR code
          const qrCodeResponse = await client.auth.getQRCode();
          if (qrCodeResponse?.base64Qr) {
            await ctx.db
              .update(whatsappInstances)
              .set({
                qrCode: qrCodeResponse.base64Qr,
                status: "connecting",
                updatedAt: new Date(),
              })
              .where(eq(whatsappInstances.id, input.id));

            const [updated] = await ctx.db
              .select()
              .from(whatsappInstances)
              .where(eq(whatsappInstances.id, input.id))
              .limit(1);

            return { instance: updated };
          }
        } catch (error) {
          console.error("Failed to reconnect session:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to reconnect session",
            cause: error,
          });
        }
      }

      const [updated] = await ctx.db
        .update(whatsappInstances)
        .set({
          status: "connecting",
          updatedAt: new Date(),
        })
        .where(eq(whatsappInstances.id, input.id))
        .returning();

      return { instance: updated };
    }),

  checkStatus: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/whatsapp/{id}/status",
        tags: ["whatsapp"],
        summary: "Check WhatsApp instance status",
        description: "Check the connection status of a WhatsApp instance",
        protect: true,
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
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

      await checkTenantAccess(ctx.db, ctx.userId, instance.tenantId);

      // Get status from WhatsApp server
      if (instance.token) {
        try {
          const client = getWhatsAppClient(instance.sessionName, instance.token);
          const status = await client.auth.checkConnection();
          
          // Update database with current status
          await ctx.db
            .update(whatsappInstances)
            .set({
              status: status.state.toLowerCase(),
              updatedAt: new Date(),
            })
            .where(eq(whatsappInstances.id, input.id));

          return {
            status: status.state,
            qrcode: status.qrcode,
          };
        } catch (error) {
          console.error("Failed to check status:", error);
        }
      }

      return {
        status: instance.status,
      };
    }),

  sendMessage: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/whatsapp/{id}/send-message",
        tags: ["whatsapp"],
        summary: "Send message",
        description: "Send a WhatsApp message to a contact or group",
        protect: true,
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
        phone: z.string().min(1),
        message: z.string().min(1),
        isGroup: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
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

      await checkTenantAccess(ctx.db, ctx.userId, instance.tenantId);

      if (!instance.token) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp instance is not authenticated",
        });
      }

      // Track usage before sending
      try {
        await trackUsage({
          db: ctx.db,
          tenantId: instance.tenantId,
          featureKey: "messages_sent",
          incrementBy: 1,
          metadata: {
            instanceId: instance.id,
            phone: input.phone,
            isGroup: input.isGroup,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        // If usage tracking fails due to limits, throw proper error
        if (error.code === "FORBIDDEN" || error.code === "PRECONDITION_FAILED") {
          throw error;
        }
        // Log other errors but continue
        console.error("Usage tracking error:", error);
      }

      try {
        const client = getWhatsAppClient(instance.sessionName, instance.token);
        const result = await client.messages.sendMessage({
          phone: input.phone,
          message: input.message,
          isGroup: input.isGroup,
        });

        emitWhatsAppEvent(
          "whatsapp_message_sent",
          instance.id,
          instance.tenantId,
          { messageId: result.id, phone: input.phone }
        );

        return {
          success: true,
          messageId: result.id,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send message",
          cause: error,
        });
      }
    }),

  getSessionInfo: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/whatsapp/{id}/session-info",
        tags: ["whatsapp"],
        summary: "Get session info",
        description: "Get session information for a WhatsApp instance",
        protect: true,
      },
    })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.id),
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

      await checkTenantAccess(ctx.db, ctx.userId, instance.tenantId);

      if (!instance.token) {
        return {
          instance,
          connected: false,
        };
      }

      try {
        const client = getWhatsAppClient(instance.sessionName, instance.token);
        const status = await client.auth.getSessionStatus();
        
        return {
          instance,
          connected: status.state === "CONNECTED",
          sessionState: status.state,
        };
      } catch (error) {
        console.error("Failed to get session info:", error);
        return {
          instance,
          connected: false,
        };
      }
    }),

  // Send bulk messages to multiple contacts
  sendBulkToContacts: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/whatsapp/{instanceId}/send-bulk-to-contacts",
        tags: ["whatsapp"],
        summary: "Send bulk messages to contacts",
        description: "Send messages to multiple contacts",
        protect: true,
      },
    })
    .input(
      z.object({
        instanceId: z.string().uuid(),
        contactIds: z.array(z.string().uuid()).min(1),
        message: z.string().min(1).optional(),
        templateId: z.string().uuid().optional(),
        customVariables: z.record(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.instanceId),
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

      await checkTenantAccess(ctx.db, ctx.userId, instance.tenantId);

      if (!instance.token) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp instance is not authenticated",
        });
      }

      // Get template if provided
      let template: any = null;
      if (input.templateId) {
        [template] = await ctx.db
          .select()
          .from(messageTemplates)
          .where(
            and(
              eq(messageTemplates.id, input.templateId),
              eq(messageTemplates.tenantId, instance.tenantId),
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
      }

      // Get contacts
      const contactsList = await ctx.db
        .select()
        .from(contacts)
        .where(
          and(
            inArray(contacts.id, input.contactIds),
            eq(contacts.tenantId, instance.tenantId),
            isNull(contacts.deletedAt),
          ),
        );

      if (contactsList.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No contacts found",
        });
      }

      // Track usage
      await trackUsage({
        db: ctx.db,
        tenantId: instance.tenantId,
        featureKey: "messages_sent",
        incrementBy: contactsList.length,
        metadata: {
          instanceId: instance.id,
          bulkSend: true,
          contactCount: contactsList.length,
        },
      });

      // Queue messages
      const queuedCount = await Promise.all(
        contactsList.map(async (contact) => {
          try {
            const baseVars = buildContactVariables(contact);
            const allVars = mergeVariables(baseVars, input.customVariables || {});

            const message = template
              ? replaceTemplateVariables(template.content, allVars)
              : input.message!;

            await whatsappMessageQueue.publish({
              instanceId: instance.id,
              tenantId: instance.tenantId,
              phone: contact.phoneNumber,
              message,
              sessionName: instance.sessionName,
              token: instance.token!,
              contactId: contact.id,
              metadata: {
                templateId: input.templateId,
                variables: allVars,
              },
            });

            return true;
          } catch (error) {
            console.error(`Failed to queue message for ${contact.phoneNumber}:`, error);
            return false;
          }
        }),
      );

      const successCount = queuedCount.filter(Boolean).length;

      emitWhatsAppEvent(
        "whatsapp_bulk_sent",
        instance.id,
        instance.tenantId,
        { queued: successCount, total: contactsList.length, type: "contacts" }
      );

      return {
        success: true,
        queued: successCount,
        total: contactsList.length,
      };
    }),

  // Send bulk messages to a group
  sendBulkToGroup: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/whatsapp/{instanceId}/send-bulk-to-group",
        tags: ["whatsapp"],
        summary: "Send bulk messages to group",
        description: "Send messages to all contacts in a group",
        protect: true,
      },
    })
    .input(
      z.object({
        instanceId: z.string().uuid(),
        groupId: z.string().uuid(),
        message: z.string().min(1).optional(),
        templateId: z.string().uuid().optional(),
        customVariables: z.record(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.instanceId),
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

      await checkTenantAccess(ctx.db, ctx.userId, instance.tenantId);

      if (!instance.token) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp instance is not authenticated",
        });
      }

      // Get group
      const [group] = await ctx.db
        .select()
        .from(groups)
        .where(
          and(
            eq(groups.id, input.groupId),
            eq(groups.tenantId, instance.tenantId),
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

      // Get template if provided
      let template: any = null;
      if (input.templateId) {
        [template] = await ctx.db
          .select()
          .from(messageTemplates)
          .where(
            and(
              eq(messageTemplates.id, input.templateId),
              eq(messageTemplates.tenantId, instance.tenantId),
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
      }

      // Get group contacts
      const groupContactsList = await ctx.db
        .select({
          contact: contacts,
        })
        .from(groupContacts)
        .leftJoin(contacts, eq(groupContacts.contactId, contacts.id))
        .where(eq(groupContacts.groupId, input.groupId));

      const contactsList = groupContactsList
        .map((gc) => gc.contact)
        .filter(Boolean);

      if (contactsList.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No contacts found in group",
        });
      }

      // Track usage
      await trackUsage({
        db: ctx.db,
        tenantId: instance.tenantId,
        featureKey: "messages_sent",
        incrementBy: contactsList.length,
        metadata: {
          instanceId: instance.id,
          groupId: input.groupId,
          bulkSend: true,
          contactCount: contactsList.length,
        },
      });

      // Queue messages
      const queuedCount = await Promise.all(
        contactsList.map(async (contact: any) => {
          try {
            const baseVars = buildContactVariables(contact);
            const allVars = mergeVariables(baseVars, input.customVariables || {});

            const message = template
              ? replaceTemplateVariables(template.content, allVars)
              : input.message!;

            await whatsappMessageQueue.publish({
              instanceId: instance.id,
              tenantId: instance.tenantId,
              phone: contact.phoneNumber,
              message,
              sessionName: instance.sessionName,
              token: instance.token!,
              contactId: contact.id,
              metadata: {
                groupId: input.groupId,
                templateId: input.templateId,
                variables: allVars,
              },
            });

            return true;
          } catch (error) {
            console.error(`Failed to queue message for ${contact.phoneNumber}:`, error);
            return false;
          }
        }),
      );

      const successCount = queuedCount.filter(Boolean).length;

      emitWhatsAppEvent(
        "whatsapp_bulk_sent",
        instance.id,
        instance.tenantId,
        { queued: successCount, total: contactsList.length, type: "group", groupName: group.name }
      );

      return {
        success: true,
        queued: successCount,
        total: contactsList.length,
        groupName: group.name,
      };
    }),

  // Send message to single contact using template
  sendWithTemplate: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/whatsapp/{instanceId}/send-with-template",
        tags: ["whatsapp"],
        summary: "Send message with template",
        description: "Send a templated message to a contact",
        protect: true,
      },
    })
    .input(
      z.object({
        instanceId: z.string().uuid(),
        contactId: z.string().uuid(),
        templateId: z.string().uuid(),
        customVariables: z.record(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(whatsappInstances)
        .where(
          and(
            eq(whatsappInstances.id, input.instanceId),
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

      await checkTenantAccess(ctx.db, ctx.userId, instance.tenantId);

      if (!instance.token) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "WhatsApp instance is not authenticated",
        });
      }

      // Get template
      const [template] = await ctx.db
        .select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.id, input.templateId),
            eq(messageTemplates.tenantId, instance.tenantId),
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

      // Get contact
      const [contact] = await ctx.db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, input.contactId),
            eq(contacts.tenantId, instance.tenantId),
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

      // Build variables and replace in template
      const baseVars = buildContactVariables(contact);
      const allVars = mergeVariables(baseVars, input.customVariables || {});
      const message = replaceTemplateVariables(template.content, allVars);

      // Track usage
      await trackUsage({
        db: ctx.db,
        tenantId: instance.tenantId,
        featureKey: "messages_sent",
        incrementBy: 1,
        metadata: {
          instanceId: instance.id,
          contactId: contact.id,
          templateId: template.id,
        },
      });

      // Send via SDK
      const client = getWhatsAppClient(instance.sessionName, instance.token);
      const result = await client.messages.sendMessage({
        phone: contact.phoneNumber,
        message,
        isGroup: false,
      });

      emitWhatsAppEvent(
        "whatsapp_message_sent",
        instance.id,
        instance.tenantId,
        { messageId: result.id, phone: contact.phoneNumber }
      );

      return {
        success: true,
        messageId: result.id,
        processedMessage: message,
      };
    }),
});

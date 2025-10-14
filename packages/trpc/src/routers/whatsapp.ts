import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { whatsappInstances, userTenantRoles } from "@repo/database";
import { eq, and, isNull, desc, inArray } from "drizzle-orm";
import { WhatsAppClient } from "@repo/whatsapp-client-sdk";
import { trackUsage } from "../utils/subscription-usage";

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

      return { instance };
    }),

  update: protectedProcedure
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

      return { instance: updated };
    }),

  delete: protectedProcedure
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

      return { instance: updated };
    }),

  reconnect: protectedProcedure
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
});

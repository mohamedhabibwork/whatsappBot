import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  tenants,
  userTenantRoles,
  tenantInvitations,
  users,
  type NewTenant,
  type NewUserTenantRole,
  type NewTenantInvitation,
} from "@repo/database";
import { eq, and } from "drizzle-orm";
import { generateVerificationToken } from "@repo/auth-utils";
import { emailQueue } from "@repo/queue";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

// Helper to check if user is owner/admin of tenant
async function checkTenantPermission(
  db: any,
  userId: string,
  tenantId: string,
  requiredRoles: string[] = ["owner", "admin"],
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
      message: "You do not have permission to perform this action",
    });
  }

  return userRole.role;
}

export const tenantsRouter = router({
  // Get user's tenants
  list: protectedProcedure.query(async ({ ctx }) => {
    const userTenants = await ctx.db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        domain: tenants.domain,
        isActive: tenants.isActive,
        role: userTenantRoles.role,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .innerJoin(userTenantRoles, eq(tenants.id, userTenantRoles.tenantId))
      .where(eq(userTenantRoles.userId, ctx.userId));

    return { tenants: userTenants };
  }),

  // Create new tenant
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[a-z0-9-]+$/),
        domain: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check if slug is already taken
      const [existing] = await ctx.db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, input.slug))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Tenant slug already exists",
        });
      }

      // Create tenant
      const [newTenant] = await ctx.db
        .insert(tenants)
        .values({
          name: input.name,
          slug: input.slug,
          domain: input.domain,
        } as NewTenant)
        .returning();

      // Assign creator as owner
      await ctx.db.insert(userTenantRoles).values({
        userId: ctx.userId,
        tenantId: newTenant.id,
        role: "owner",
      } as NewUserTenantRole);

      return { tenant: newTenant };
    }),

  // Invite user to tenant
  invite: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(["admin", "member", "viewer"]).default("member"),
        language: z.enum(["en", "ar"]).default("en"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check permission (only owner/admin can invite)
      await checkTenantPermission(ctx.db, ctx.userId, input.tenantId);

      // Get tenant details
      const [tenant] = await ctx.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      // Check if user is already a member
      const [existingMember] = await ctx.db
        .select()
        .from(userTenantRoles)
        .innerJoin(users, eq(users.id, userTenantRoles.userId))
        .where(
          and(
            eq(userTenantRoles.tenantId, input.tenantId),
            eq(users.email, input.email),
          ),
        )
        .limit(1);

      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            input.language === "ar"
              ? "المستخدم عضو بالفعل في هذا المستأجر"
              : "User is already a member of this tenant",
        });
      }

      // Check if there's already a pending invitation
      const [existingInvitation] = await ctx.db
        .select()
        .from(tenantInvitations)
        .where(
          and(
            eq(tenantInvitations.tenantId, input.tenantId),
            eq(tenantInvitations.email, input.email),
            eq(tenantInvitations.status, "pending"),
          ),
        )
        .limit(1);

      if (existingInvitation) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            input.language === "ar"
              ? "توجد دعوة معلقة بالفعل لهذا البريد الإلكتروني"
              : "A pending invitation already exists for this email",
        });
      }

      // Generate invitation token
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation
      const [invitation] = await ctx.db
        .insert(tenantInvitations)
        .values({
          tenantId: input.tenantId,
          invitedBy: ctx.userId,
          email: input.email,
          role: input.role,
          token,
          expiresAt,
        } as NewTenantInvitation)
        .returning();

      // Get inviter name
      const [inviter] = await ctx.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      // Queue invitation email
      const invitationUrl = `${APP_URL}/accept-invitation?token=${token}&language=${input.language}`;

      await emailQueue.add({
        to: input.email,
        subject:
          input.language === "ar"
            ? `دعوة للانضمام إلى ${tenant.name}`
            : `Invitation to join ${tenant.name}`,
        template: "tenantInvitation" as any,
        language: input.language,
        data: {
          name: input.email,
          url: invitationUrl,
          tenantName: tenant.name,
          inviterName: inviter?.name || "A team member",
          role: input.role,
        },
      });

      return {
        success: true,
        message:
          input.language === "ar"
            ? "تم إرسال الدعوة بنجاح"
            : "Invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      };
    }),

  // List tenant invitations (for owners/admins)
  listInvitations: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Check permission
      await checkTenantPermission(ctx.db, ctx.userId, input.tenantId);

      const invitations = await ctx.db
        .select({
          id: tenantInvitations.id,
          email: tenantInvitations.email,
          role: tenantInvitations.role,
          status: tenantInvitations.status,
          expiresAt: tenantInvitations.expiresAt,
          createdAt: tenantInvitations.createdAt,
          inviterName: users.name,
        })
        .from(tenantInvitations)
        .innerJoin(users, eq(users.id, tenantInvitations.invitedBy))
        .where(eq(tenantInvitations.tenantId, input.tenantId));

      return { invitations };
    }),

  // Cancel invitation
  cancelInvitation: protectedProcedure
    .input(
      z.object({
        invitationId: z.string().uuid(),
        tenantId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check permission
      await checkTenantPermission(ctx.db, ctx.userId, input.tenantId);

      await ctx.db
        .update(tenantInvitations)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(tenantInvitations.id, input.invitationId));

      return { success: true };
    }),

  // Get tenant members
  listMembers: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Check if user is member of tenant
      const [userRole] = await ctx.db
        .select()
        .from(userTenantRoles)
        .where(
          and(
            eq(userTenantRoles.userId, ctx.userId),
            eq(userTenantRoles.tenantId, input.tenantId),
          ),
        )
        .limit(1);

      if (!userRole) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this tenant",
        });
      }

      const members = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: userTenantRoles.role,
          joinedAt: userTenantRoles.createdAt,
        })
        .from(userTenantRoles)
        .innerJoin(users, eq(users.id, userTenantRoles.userId))
        .where(eq(userTenantRoles.tenantId, input.tenantId));

      return { members };
    }),

  // Update member role
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["admin", "member", "viewer"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check permission (only owner/admin)
      const currentUserRole = await checkTenantPermission(
        ctx.db,
        ctx.userId,
        input.tenantId,
      );

      // Can't change owner role
      const [targetUser] = await ctx.db
        .select({ role: userTenantRoles.role })
        .from(userTenantRoles)
        .where(
          and(
            eq(userTenantRoles.userId, input.userId),
            eq(userTenantRoles.tenantId, input.tenantId),
          ),
        )
        .limit(1);

      if (targetUser?.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change owner role",
        });
      }

      await ctx.db
        .update(userTenantRoles)
        .set({
          role: input.role,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userTenantRoles.userId, input.userId),
            eq(userTenantRoles.tenantId, input.tenantId),
          ),
        );

      return { success: true };
    }),

  // Remove member from tenant
  removeMember: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check permission
      await checkTenantPermission(ctx.db, ctx.userId, input.tenantId);

      // Can't remove owner
      const [targetUser] = await ctx.db
        .select({ role: userTenantRoles.role })
        .from(userTenantRoles)
        .where(
          and(
            eq(userTenantRoles.userId, input.userId),
            eq(userTenantRoles.tenantId, input.tenantId),
          ),
        )
        .limit(1);

      if (targetUser?.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove owner from tenant",
        });
      }

      await ctx.db
        .delete(userTenantRoles)
        .where(
          and(
            eq(userTenantRoles.userId, input.userId),
            eq(userTenantRoles.tenantId, input.tenantId),
          ),
        );

      return { success: true };
    }),
});

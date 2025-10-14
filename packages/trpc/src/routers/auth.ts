import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import {
  users,
  refreshTokens,
  verificationTokens,
  auditLogs,
  tenants,
  userTenantRoles,
  tenantInvitations,
  type NewUser,
  type NewRefreshToken,
  type NewVerificationToken,
  type NewAuditLog,
  type NewTenant,
  type NewUserTenantRole,
} from "@repo/database";
import { eq, and, gt } from "drizzle-orm";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateVerificationToken,
  getRefreshTokenExpiry,
} from "@repo/auth-utils";
import { mailService } from "@repo/mail";
import type { Language } from "@repo/websocket-types";
import querystring from "node:querystring";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

// WebSocket event sender (will be initialized by the API)
let sendAuthEventFn:
  | ((userId: string, event: string, language: Language) => void)
  | null = null;

export function setAuthEventSender(
  fn: (userId: string, event: string, language: Language) => void,
) {
  sendAuthEventFn = fn;
}

function sendAuthEvent(
  userId: string,
  event: string,
  language: Language = "en",
) {
  if (sendAuthEventFn) {
    try {
      sendAuthEventFn(userId, event, language);
    } catch (error) {
      console.error("Failed to send auth event via WebSocket:", error);
    }
  }
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  language: z.enum(["en", "ar"]).default("en"),
  invitationToken: z.string().optional(), // Optional invitation token
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  language: z.enum(["en", "ar"]).optional(),
});

export const authRouter = router({
  // Register new user
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(input.password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.errors.join(", "),
        });
      }

      // Check if user exists
      const existingUser = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            input.language === "ar"
              ? "المستخدم موجود بالفعل"
              : "User already exists",
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(input.password);

      // Check if registering via invitation
      let invitation = null;
      if (input.invitationToken) {
        const [foundInvitation] = await ctx.db
          .select()
          .from(tenantInvitations)
          .where(
            and(
              eq(tenantInvitations.token, input.invitationToken),
              eq(tenantInvitations.email, input.email),
              eq(tenantInvitations.status, "pending"),
            ),
          )
          .limit(1);

        if (!foundInvitation) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              input.language === "ar"
                ? "رابط الدعوة غير صالح أو منتهي الصلاحية"
                : "Invalid or expired invitation link",
          });
        }

        // Check if invitation expired
        if (new Date() > foundInvitation.expiresAt) {
          await ctx.db
            .update(tenantInvitations)
            .set({ status: "expired", updatedAt: new Date() })
            .where(eq(tenantInvitations.id, foundInvitation.id));

          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              input.language === "ar"
                ? "انتهت صلاحية الدعوة"
                : "Invitation has expired",
          });
        }

        invitation = foundInvitation;
      }

      // Create user
      const [newUser] = await ctx.db
        .insert(users)
        .values({
          email: input.email,
          password: hashedPassword,
          name: input.name,
          language: input.language,
        } as NewUser)
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          language: users.language,
        });

      // Handle tenant assignment
      if (invitation) {
        // Join existing tenant via invitation
        await ctx.db.insert(userTenantRoles).values({
          userId: newUser!.id,
          tenantId: invitation.tenantId,
          role: invitation.role,
        } as NewUserTenantRole);

        // Mark invitation as accepted
        await ctx.db
          .update(tenantInvitations)
          .set({
            status: "accepted",
            acceptedAt: new Date(),
            acceptedBy: newUser!.id,
            updatedAt: new Date(),
          })
          .where(eq(tenantInvitations.id, invitation.id));
      } else {
        // Create new tenant for user
        const tenantSlug = input.email.split("@")[0] + "-" + Date.now();
        const [newTenant] = await ctx.db
          .insert(tenants)
          .values({
            name: `${input.name}'s Workspace`,
            slug: tenantSlug,
          } as NewTenant)
          .returning();

        // Assign user as owner of the new tenant
        await ctx.db.insert(userTenantRoles).values({
          userId: newUser!.id,
          tenantId: newTenant!.id,
          role: "owner",
        } as NewUserTenantRole);
      }

      // Generate verification token
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await ctx.db.insert(verificationTokens).values({
        userId: newUser!.id,
        token: verificationToken,
        type: "email_verification",
        expiresAt,
      } as NewVerificationToken);

      // Send verification email
      const verificationUrl =
        `${APP_URL}/verify-email?` +
        querystring.stringify({
          token: verificationToken,
          language: input.language,
        });

      try {
        await mailService.sendVerificationEmail(
          newUser!.email,
          newUser!.name,
          verificationUrl,
          input.language,
          24,
        );
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }

      // Log registration
      await ctx.db.insert(auditLogs).values({
        userId: newUser.id,
        action: "register",
        details: { email: newUser.email },
      } as NewAuditLog);

      // Send WebSocket event
      sendAuthEvent(newUser.id, "register", input.language);

      return {
        success: true,
        message:
          input.language === "ar"
            ? "تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني."
            : "Account created successfully. Please verify your email.",
        user: newUser,
      };
    }),

  // Login
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    // Find user
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: user.language === "ar" ? "الحساب معطل" : "Account is disabled",
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      input.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid credentials",
      });
    }

    // Update last login
    await ctx.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      language: user.language,
    });

    // Generate refresh token if remember me
    let refreshTokenValue: string | undefined;
    if (input.rememberMe) {
      const [newRefreshToken] = await ctx.db
        .insert(refreshTokens)
        .values({
          userId: user.id,
          token: crypto.randomUUID(),
          expiresAt: getRefreshTokenExpiry(),
        } as NewRefreshToken)
        .returning();

      refreshTokenValue = generateRefreshToken({
        userId: user.id,
        tokenId: newRefreshToken!.id,
      });
    }

    // Log login
    await ctx.db.insert(auditLogs).values({
      userId: user.id,
      action: "login",
      details: { rememberMe: input.rememberMe },
    } as NewAuditLog);

    // Send WebSocket event
    sendAuthEvent(user.id, "login", user.language as Language);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        language: user.language,
      },
    };
  }),

  // Verify email
  verifyEmail: publicProcedure
    .input(verifyEmailSchema)
    .mutation(async ({ input, ctx }) => {
      // Find token
      const [token] = await ctx.db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.token, input.token),
            eq(verificationTokens.type, "email_verification"),
            gt(verificationTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!token || token.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification token",
        });
      }

      // Get user
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, token.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Update user
      await ctx.db
        .update(users)
        .set({
          emailVerified: true,
          emailVerifiedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Mark token as used
      await ctx.db
        .update(verificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(verificationTokens.id, token.id));

      // Send welcome email
      try {
        await mailService.sendWelcomeEmail(
          user.email,
          user.name,
          `${APP_URL}/login`,
          user.language as "en" | "ar",
        );
      } catch (error) {
        console.error("Failed to send welcome email:", error);
      }

      // Log verification
      await ctx.db.insert(auditLogs).values({
        userId: user.id,
        action: "email_verify",
      } as NewAuditLog);

      // Send WebSocket event
      sendAuthEvent(user.id, "email_verified", user.language as Language);

      return {
        success: true,
        message:
          user.language === "ar"
            ? "تم التحقق من البريد الإلكتروني بنجاح"
            : "Email verified successfully",
      };
    }),

  // Resend verification email
  resendVerification: publicProcedure
    .input(resendVerificationSchema)
    .mutation(async ({ input, ctx }) => {
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        // Don't reveal if user exists
        return {
          success: true,
          message: "If the email exists, a verification link has been sent",
        };
      }

      if (user.emailVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email already verified",
        });
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await ctx.db.insert(verificationTokens).values({
        userId: user.id,
        token: verificationToken,
        type: "email_verification",
        expiresAt,
      } as NewVerificationToken);

      // Send verification email
      const verificationUrl =
        `${APP_URL}/verify-email?` +
        querystring.stringify({
          token: verificationToken,
          language: user.language,
        });
      try {
        await mailService.sendVerificationEmail(
          user.email,
          user.name,
          verificationUrl,
          user.language as "en" | "ar",
          24,
        );
      } catch (error) {
        console.error("Failed to send verification email:", error);
      }

      return {
        success: true,
        message:
          user.language === "ar"
            ? "تم إرسال رابط التحقق"
            : "Verification link sent",
      };
    }),

  // Forgot password
  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        // Don't reveal if user exists
        return {
          success: true,
          message: "If the email exists, a password reset link has been sent",
        };
      }

      // Generate reset token
      const resetToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await ctx.db.insert(verificationTokens).values({
        userId: user.id,
        token: resetToken,
        type: "password_reset",
        expiresAt,
      } as NewVerificationToken);

      // Send reset email
      const resetUrl =
        `${APP_URL}/reset-password?` +
        querystring.stringify({
          language: user.language,
          token: resetToken,
        });
      try {
        await mailService.sendPasswordResetEmail(
          user.email,
          user.name,
          resetUrl,
          user.language as "en" | "ar",
          1,
        );
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }

      return {
        success: true,
        message:
          user.language === "ar"
            ? "تم إرسال رابط إعادة تعيين كلمة المرور"
            : "Password reset link sent",
      };
    }),

  // Reset password
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(input.newPassword);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.errors.join(", "),
        });
      }

      // Find token
      const [token] = await ctx.db
        .select()
        .from(verificationTokens)
        .where(
          and(
            eq(verificationTokens.token, input.token),
            eq(verificationTokens.type, "password_reset"),
            gt(verificationTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!token || token.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token",
        });
      }

      // Get user
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, token.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(input.newPassword);

      // Update password
      await ctx.db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      // Mark token as used
      await ctx.db
        .update(verificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(verificationTokens.id, token.id));

      // Revoke all refresh tokens
      await ctx.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.userId, user.id));

      // Log password change
      await ctx.db.insert(auditLogs).values({
        userId: user.id,
        action: "password_reset",
      } as NewAuditLog);

      // Send WebSocket event
      sendAuthEvent(user.id, "password_changed", user.language as Language);

      return {
        success: true,
        message:
          user.language === "ar"
            ? "تم تغيير كلمة المرور بنجاح"
            : "Password changed successfully",
      };
    }),

  // Change password (authenticated)
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      // Get user
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify current password
      const isPasswordValid = await comparePassword(
        input.currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            user.language === "ar"
              ? "كلمة المرور الحالية غير صحيحة"
              : "Current password is incorrect",
        });
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(input.newPassword);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.errors.join(", "),
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(input.newPassword);

      // Update password
      await ctx.db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      // Revoke all refresh tokens except current session
      await ctx.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.userId, user.id));

      // Log password change
      await ctx.db.insert(auditLogs).values({
        userId: user.id,
        action: "password_change",
      } as NewAuditLog);

      // Send WebSocket event
      sendAuthEvent(user.id, "password_changed", user.language as Language);

      return {
        success: true,
        message:
          user.language === "ar"
            ? "تم تغيير كلمة المرور بنجاح"
            : "Password changed successfully",
      };
    }),

  // Refresh access token
  refreshToken: publicProcedure
    .input(refreshTokenSchema)
    .mutation(async ({ input, ctx }) => {
      const payload = verifyRefreshToken(input.refreshToken);
      if (!payload) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid refresh token",
        });
      }

      // Find refresh token in database
      const [token] = await ctx.db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.id, payload.tokenId),
            eq(refreshTokens.userId, payload.userId),
            gt(refreshTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!token || token.revokedAt) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or revoked refresh token",
        });
      }

      // Get user
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || !user.isActive) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found or inactive",
        });
      }

      // Generate new access token
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        language: user.language,
      });

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          language: user.language,
        },
      };
    }),

  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const [user] = await ctx.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        emailVerifiedAt: users.emailVerifiedAt,
        language: users.language,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return { user };
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const [updatedUser] = await ctx.db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          language: users.language,
        });

      // Send WebSocket event
      sendAuthEvent(
        ctx.userId,
        "profile_updated",
        updatedUser.language as Language,
      );

      return {
        success: true,
        user: updatedUser,
      };
    }),

  // Logout (revoke refresh token)
  logout: protectedProcedure
    .input(z.object({ refreshToken: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      if (input.refreshToken) {
        const payload = verifyRefreshToken(input.refreshToken);
        if (payload) {
          await ctx.db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(eq(refreshTokens.id, payload.tokenId));
        }
      }

      // Get user language for event
      const [user] = await ctx.db
        .select({ language: users.language })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      // Log logout
      await ctx.db.insert(auditLogs).values({
        userId: ctx.userId,
        action: "logout",
      } as NewAuditLog);

      // Send WebSocket event
      if (user) {
        sendAuthEvent(ctx.userId, "logout", user.language as Language);
      }

      return {
        success: true,
      };
    }),
});

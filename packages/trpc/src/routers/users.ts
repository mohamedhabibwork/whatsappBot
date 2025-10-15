import { z } from "zod";
import {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../trpc";
import { users } from "@repo/database";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Input Schemas
export const listUsersInputSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

export const updateProfileInputSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const deleteUserInputSchema = z.object({ id: z.string().uuid() });

// Output Schemas
const userBasicSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
});

export const listUsersOutputSchema = z.array(userBasicSchema);

export const meOutputSchema = userBasicSchema.nullable();

export const updateProfileOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  isActive: z.boolean(),
  updatedAt: z.date(),
  createdAt: z.date(),
});

export const deleteUserOutputSchema = z.object({ success: z.boolean() });

export const usersRouter = router({
  list: adminProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/users/list",
        tags: ["users"],
        summary: "List users",
        description: "Get paginated list of all users (admin only)",
        protect: true,
      },
    })
    .input(listUsersInputSchema)
    .output(listUsersOutputSchema)
    .query(async ({ ctx, input }) => {
      const usersList = await ctx.db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .limit(input.limit)
        .offset(input.offset);

      return usersList;
    }),

  me: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/users/me",
        tags: ["users"],
        summary: "Get current user",
        description: "Get current authenticated user information",
        protect: true,
      },
    })
    .output(meOutputSchema)
    .query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    return user || null;
  }),

  updateProfile: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/users/profile",
        tags: ["users"],
        summary: "Update user profile",
        description: "Update current user profile information",
        protect: true,
      },
    })
    .input(updateProfileInputSchema)
    .output(updateProfileOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
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
          isActive: users.isActive,
          updatedAt: users.updatedAt,
          createdAt: users.createdAt,
        });

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updated;
    }),

  delete: adminProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/users/{id}",
        tags: ["users"],
        summary: "Delete user",
        description: "Delete a user (admin only)",
        protect: true,
      },
    })
    .input(deleteUserInputSchema)
    .output(deleteUserOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});

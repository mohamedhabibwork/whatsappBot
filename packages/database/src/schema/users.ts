import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  language: text("language").notNull().default("en"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Zod schemas for OpenAPI
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email().describe("User email address"),
  password: z.string().min(8).describe("User password (min 8 characters)"),
  name: z.string().min(1).describe("User full name"),
  isActive: z.boolean().optional().default(true).describe("Whether the user is active"),
  emailVerified: z.boolean().optional().default(false).describe("Whether the email is verified"),
  language: z.enum(["en", "ar"]).optional().default("en").describe("User language preference"),
}).omit({
  id: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectUserSchema = createSelectSchema(users, {
  id: z.string().uuid().describe("User ID"),
  email: z.string().email().describe("User email address"),
  name: z.string().describe("User full name"),
  isActive: z.boolean().describe("Whether the user is active"),
  emailVerified: z.boolean().describe("Whether the email is verified"),
  emailVerifiedAt: z.date().nullable().describe("Email verification timestamp"),
  language: z.string().describe("User language preference"),
  lastLoginAt: z.date().nullable().describe("Last login timestamp"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
}).omit({ password: true });

export const updateUserSchema = insertUserSchema.partial().omit({ email: true });

import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain"),
  isActive: boolean("is_active").notNull().default(true),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true } ),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

// Zod schemas for OpenAPI
export const insertTenantSchema = createInsertSchema(tenants, {
  name: z.string().min(1).describe("Tenant name"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).describe("Tenant slug (URL-friendly)"),
  domain: z.string().optional().describe("Custom domain"),
  isActive: z.boolean().optional().default(true).describe("Whether the tenant is active"),
  settings: z.record(z.any()).optional().describe("Tenant settings"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectTenantSchema = createSelectSchema(tenants, {
  id: z.string().uuid().describe("Tenant ID"),
  name: z.string().describe("Tenant name"),
  slug: z.string().describe("Tenant slug"),
  domain: z.string().nullable().describe("Custom domain"),
  isActive: z.boolean().describe("Whether the tenant is active"),
  settings: z.record(z.any()).describe("Tenant settings"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updateTenantSchema = insertTenantSchema.partial();

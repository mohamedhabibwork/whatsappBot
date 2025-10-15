import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { tenants } from "./tenants";

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    timezone: text("timezone"),
    language: text("language"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    pgPolicy("tenant_isolation_policy", {
      for: "all",
      to: "public",
      using: sql`tenant_id = current_setting('app.current_tenant_id')::uuid`,
    }),
  ]
);

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

// Zod schemas for OpenAPI
export const insertGroupSchema = createInsertSchema(groups, {
  tenantId: z.string().uuid().describe("Tenant ID"),
  name: z.string().min(1).describe("Group name"),
  description: z.string().optional().describe("Group description"),
  isActive: z.boolean().optional().default(true).describe("Whether the group is active"),
  timezone: z.string().optional().describe("Group timezone"),
  language: z.string().optional().describe("Group language preference"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectGroupSchema = createSelectSchema(groups, {
  id: z.string().uuid().describe("Group ID"),
  tenantId: z.string().uuid().describe("Tenant ID"),
  name: z.string().describe("Group name"),
  description: z.string().nullable().describe("Group description"),
  isActive: z.boolean().describe("Whether the group is active"),
  timezone: z.string().nullable().describe("Group timezone"),
  language: z.string().nullable().describe("Group language preference"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updateGroupSchema = insertGroupSchema.partial();

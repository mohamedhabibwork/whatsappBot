import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { tenants } from "./tenants";

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    content: text("content").notNull(),
    variables: jsonb("variables").$type<string[]>().default([]),
    isActive: boolean("is_active").notNull().default(true),
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

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type NewMessageTemplate = typeof messageTemplates.$inferInsert;

// Zod schemas for OpenAPI
export const insertMessageTemplateSchema = createInsertSchema(messageTemplates, {
  tenantId: z.string().uuid().describe("Tenant ID"),
  name: z.string().min(1).describe("Template name"),
  content: z.string().min(1).describe("Template content with variables"),
  variables: z.array(z.string()).optional().default([]).describe("Available variables in the template"),
  isActive: z.boolean().optional().default(true).describe("Whether the template is active"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectMessageTemplateSchema = createSelectSchema(messageTemplates, {
  id: z.string().uuid().describe("Template ID"),
  tenantId: z.string().uuid().describe("Tenant ID"),
  name: z.string().describe("Template name"),
  content: z.string().describe("Template content with variables"),
  variables: z.array(z.string()).describe("Available variables in the template"),
  isActive: z.boolean().describe("Whether the template is active"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updateMessageTemplateSchema = insertMessageTemplateSchema.partial();

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

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    events: jsonb("events").$type<string[]>().notNull().default([]),
    secret: text("secret"),
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

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

// Zod schemas for OpenAPI
export const insertWebhookSchema = createInsertSchema(webhooks, {
  tenantId: z.string().uuid().describe("Tenant ID"),
  name: z.string().min(1).describe("Webhook name"),
  url: z.string().url().describe("Webhook endpoint URL"),
  events: z.array(z.string()).describe("Events to trigger webhook"),
  secret: z.string().optional().describe("Webhook secret for verification"),
  isActive: z.boolean().optional().default(true).describe("Whether the webhook is active"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectWebhookSchema = createSelectSchema(webhooks, {
  id: z.string().uuid().describe("Webhook ID"),
  tenantId: z.string().uuid().describe("Tenant ID"),
  name: z.string().describe("Webhook name"),
  url: z.string().describe("Webhook endpoint URL"),
  events: z.array(z.string()).describe("Events to trigger webhook"),
  secret: z.string().nullable().describe("Webhook secret for verification"),
  isActive: z.boolean().describe("Whether the webhook is active"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updateWebhookSchema = insertWebhookSchema.partial();

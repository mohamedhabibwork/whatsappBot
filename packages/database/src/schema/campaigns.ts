import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { tenants } from "./tenants";
import { messageTemplates } from "./message-templates";
import { whatsappInstances } from "./whatsapp-instances";

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    whatsappInstanceId: uuid("whatsapp_instance_id")
      .notNull()
      .references(() => whatsappInstances.id, { onDelete: "cascade" }),
    messageTemplateId: uuid("message_template_id")
      .references(() => messageTemplates.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    totalRecipients: integer("total_recipients").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
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

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

// Zod schemas for OpenAPI
export const insertCampaignSchema = createInsertSchema(campaigns, {
  tenantId: z.string().uuid().describe("Tenant ID"),
  whatsappInstanceId: z.string().uuid().describe("WhatsApp instance ID"),
  messageTemplateId: z.string().uuid().optional().describe("Message template ID"),
  name: z.string().min(1).describe("Campaign name"),
  message: z.string().min(1).describe("Campaign message"),
  status: z.enum(["draft", "scheduled", "running", "completed", "cancelled"]).optional().default("draft").describe("Campaign status"),
  scheduledAt: z.date().optional().describe("Scheduled start time"),
  isActive: z.boolean().optional().default(true).describe("Whether the campaign is active"),
  timezone: z.string().optional().describe("Campaign timezone"),
  language: z.string().optional().describe("Campaign language"),
}).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  totalRecipients: true,
  sentCount: true,
  failedCount: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectCampaignSchema = createSelectSchema(campaigns, {
  id: z.string().uuid().describe("Campaign ID"),
  tenantId: z.string().uuid().describe("Tenant ID"),
  whatsappInstanceId: z.string().uuid().describe("WhatsApp instance ID"),
  messageTemplateId: z.string().uuid().nullable().describe("Message template ID"),
  name: z.string().describe("Campaign name"),
  message: z.string().describe("Campaign message"),
  status: z.string().describe("Campaign status"),
  scheduledAt: z.date().nullable().describe("Scheduled start time"),
  startedAt: z.date().nullable().describe("Actual start time"),
  completedAt: z.date().nullable().describe("Completion time"),
  totalRecipients: z.number().describe("Total number of recipients"),
  sentCount: z.number().describe("Number of messages sent"),
  failedCount: z.number().describe("Number of failed messages"),
  isActive: z.boolean().describe("Whether the campaign is active"),
  timezone: z.string().nullable().describe("Campaign timezone"),
  language: z.string().nullable().describe("Campaign language"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updateCampaignSchema = insertCampaignSchema.partial();

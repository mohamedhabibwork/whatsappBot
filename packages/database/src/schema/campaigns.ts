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

import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { whatsappInstances } from "./whatsapp-instances";
import { contacts } from "./contacts";

export const messagesHistory = pgTable(
  "messages_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    whatsappInstanceId: uuid("whatsapp_instance_id")
      .notNull()
      .references(() => whatsappInstances.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .references(() => contacts.id, { onDelete: "set null" }),
    messageId: text("message_id"),
    chatId: text("chat_id").notNull(),
    direction: text("direction").notNull(),
    type: text("type").notNull().default("text"),
    content: text("content"),
    metadata: jsonb("metadata"),
    status: text("status").notNull().default("sent"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    pgPolicy("tenant_isolation_policy", {
      for: "all",
      to: "public",
      using: sql`tenant_id = current_setting('app.current_tenant_id')::uuid`,
    }),
  ]
);

export type MessageHistory = typeof messagesHistory.$inferSelect;
export type NewMessageHistory = typeof messagesHistory.$inferInsert;

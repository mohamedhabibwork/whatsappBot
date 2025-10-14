import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { subscriptions } from "./subscriptions";
import { tenants } from "./tenants";

export const subscriptionUsages = pgTable("subscription_usages", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  featureKey: text("feature_key").notNull(), // e.g., "messages_sent", "api_calls", "whatsapp_instances"
  usageCount: integer("usage_count").notNull().default(0),
  limit: integer("limit"), // null = unlimited
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SubscriptionUsage = typeof subscriptionUsages.$inferSelect;
export type NewSubscriptionUsage = typeof subscriptionUsages.$inferInsert;

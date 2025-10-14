import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { subscriptions } from "./subscriptions";
import { planFeatures } from "./plan-features";

export const subscriptionFeatures = pgTable("subscription_features", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  planFeatureId: uuid("plan_feature_id")
    .notNull()
    .references(() => planFeatures.id, { onDelete: "cascade" }),
  featureKey: text("feature_key").notNull(),
  featureValue: text("feature_value"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type SubscriptionFeature = typeof subscriptionFeatures.$inferSelect;
export type NewSubscriptionFeature = typeof subscriptionFeatures.$inferInsert;

import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { plans } from "./plans";

export const planFeatures = pgTable("plan_features", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  name: jsonb("name").$type<{ en: string; ar: string }>().notNull(),
  description: jsonb("description").$type<{ en: string; ar: string }>(),
  featureKey: text("feature_key").notNull(), // e.g., "api_access", "custom_branding"
  featureValue: text("feature_value"), // e.g., "true", "unlimited", "100"
  isEnabled: boolean("is_enabled").notNull().default(true),
  displayOrder: integer("display_order").default(0),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type PlanFeature = typeof planFeatures.$inferSelect;
export type NewPlanFeature = typeof planFeatures.$inferInsert;

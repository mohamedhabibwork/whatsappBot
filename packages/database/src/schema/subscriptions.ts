import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { plans } from "./plans";
import { tenants } from "./tenants";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("active"), // active, cancelled, expired, trial, past_due
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  trialStart: timestamp("trial_start", { withTimezone: true }),
  trialEnd: timestamp("trial_end", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

// Zod schemas for OpenAPI
export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  tenantId: z.string().uuid().describe("Tenant ID"),
  planId: z.string().uuid().describe("Plan ID"),
  status: z.enum(["active", "cancelled", "expired", "trial", "past_due"]).optional().default("active").describe("Subscription status"),
  currentPeriodStart: z.date().describe("Current billing period start date"),
  currentPeriodEnd: z.date().describe("Current billing period end date"),
  trialStart: z.date().optional().describe("Trial period start date"),
  trialEnd: z.date().optional().describe("Trial period end date"),
  cancelAtPeriodEnd: z.boolean().optional().default(false).describe("Whether to cancel at period end"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).describe("Subscription price"),
  currency: z.string().optional().default("USD").describe("Currency code"),
  metadata: z.record(z.any()).optional().describe("Additional metadata"),
}).omit({
  id: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectSubscriptionSchema = createSelectSchema(subscriptions, {
  id: z.string().uuid().describe("Subscription ID"),
  tenantId: z.string().uuid().describe("Tenant ID"),
  planId: z.string().uuid().describe("Plan ID"),
  status: z.string().describe("Subscription status"),
  currentPeriodStart: z.date().describe("Current billing period start date"),
  currentPeriodEnd: z.date().describe("Current billing period end date"),
  trialStart: z.date().nullable().describe("Trial period start date"),
  trialEnd: z.date().nullable().describe("Trial period end date"),
  cancelledAt: z.date().nullable().describe("Cancellation date"),
  cancelAtPeriodEnd: z.boolean().nullable().describe("Whether to cancel at period end"),
  price: z.string().describe("Subscription price"),
  currency: z.string().describe("Currency code"),
  metadata: z.record(z.any()).describe("Additional metadata"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updateSubscriptionSchema = insertSubscriptionSchema.partial();

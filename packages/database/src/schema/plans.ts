import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  integer,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: jsonb("name").$type<{ en: string; ar: string }>().notNull(),
  description: jsonb("description").$type<{ en: string; ar: string }>(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  billingCycle: text("billing_cycle").notNull().default("monthly"), // daily, weekly, monthly, semiannually, annually, quarterly
  trialDays: integer("trial_days").default(0),
  isActive: boolean("is_active").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(true),
  maxUsers: integer("max_users"),
  maxWhatsappInstances: integer("max_whatsapp_instances"),
  maxMessagesPerMonth: integer("max_messages_per_month"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

// Zod schemas for OpenAPI
const translatedNameSchema = z.object({
  en: z.string().describe("English name"),
  ar: z.string().describe("Arabic name"),
}).describe("Translated plan name");

const translatedDescriptionSchema = z.object({
  en: z.string().describe("English description"),
  ar: z.string().describe("Arabic description"),
}).optional().describe("Translated plan description");

export const insertPlanSchema = createInsertSchema(plans, {
  name: translatedNameSchema,
  description: translatedDescriptionSchema,
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).describe("Plan price"),
  currency: z.string().optional().default("USD").describe("Currency code"),
  billingCycle: z.enum(["daily", "weekly", "monthly", "quarterly", "semiannually", "annually"]).optional().default("monthly").describe("Billing cycle"),
  trialDays: z.number().int().optional().default(0).describe("Number of trial days"),
  isActive: z.boolean().optional().default(true).describe("Whether the plan is active"),
  isPublic: z.boolean().optional().default(true).describe("Whether the plan is publicly visible"),
  maxUsers: z.number().int().optional().describe("Maximum number of users"),
  maxWhatsappInstances: z.number().int().optional().describe("Maximum WhatsApp instances"),
  maxMessagesPerMonth: z.number().int().optional().describe("Maximum messages per month"),
  metadata: z.record(z.any()).optional().describe("Additional metadata"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectPlanSchema = createSelectSchema(plans, {
  id: z.string().uuid().describe("Plan ID"),
  name: translatedNameSchema,
  description: translatedDescriptionSchema,
  price: z.string().describe("Plan price"),
  currency: z.string().describe("Currency code"),
  billingCycle: z.string().describe("Billing cycle"),
  trialDays: z.number().nullable().describe("Number of trial days"),
  isActive: z.boolean().describe("Whether the plan is active"),
  isPublic: z.boolean().describe("Whether the plan is publicly visible"),
  maxUsers: z.number().nullable().describe("Maximum number of users"),
  maxWhatsappInstances: z.number().nullable().describe("Maximum WhatsApp instances"),
  maxMessagesPerMonth: z.number().nullable().describe("Maximum messages per month"),
  metadata: z.record(z.any()).describe("Additional metadata"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().nullable().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updatePlanSchema = insertPlanSchema.partial();

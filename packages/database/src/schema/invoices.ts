import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { tenants } from "./tenants";
import { subscriptions } from "./subscriptions";

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("draft"), // draft, pending, paid, cancelled, refunded
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 10, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  billingAddress: jsonb("billing_address").$type<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  }>(),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

// Zod schemas for OpenAPI
const billingAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
}).optional().describe("Billing address information");

export const insertInvoiceSchema = createInsertSchema(invoices, {
  invoiceNumber: z.string().describe("Unique invoice number"),
  tenantId: z.string().uuid().describe("Tenant ID"),
  subscriptionId: z.string().uuid().optional().describe("Associated subscription ID"),
  status: z.enum(["draft", "pending", "paid", "cancelled", "refunded"]).optional().default("draft").describe("Invoice status"),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/).describe("Subtotal amount"),
  tax: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0").describe("Tax amount"),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default("0").describe("Discount amount"),
  total: z.string().regex(/^\d+(\.\d{1,2})?$/).describe("Total amount"),
  currency: z.string().optional().default("USD").describe("Currency code"),
  dueDate: z.date().optional().describe("Invoice due date"),
  billingAddress: billingAddressSchema,
  notes: z.string().optional().describe("Invoice notes"),
  metadata: z.record(z.any()).optional().describe("Additional metadata"),
}).omit({
  id: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectInvoiceSchema = createSelectSchema(invoices, {
  id: z.string().uuid().describe("Invoice ID"),
  invoiceNumber: z.string().describe("Unique invoice number"),
  tenantId: z.string().uuid().describe("Tenant ID"),
  subscriptionId: z.string().uuid().nullable().describe("Associated subscription ID"),
  status: z.string().describe("Invoice status"),
  subtotal: z.string().describe("Subtotal amount"),
  tax: z.string().describe("Tax amount"),
  discount: z.string().describe("Discount amount"),
  total: z.string().describe("Total amount"),
  currency: z.string().describe("Currency code"),
  dueDate: z.date().nullable().describe("Invoice due date"),
  paidAt: z.date().nullable().describe("Payment date"),
  billingAddress: billingAddressSchema,
  notes: z.string().nullable().describe("Invoice notes"),
  metadata: z.record(z.any()).describe("Additional metadata"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updateInvoiceSchema = insertInvoiceSchema.partial();

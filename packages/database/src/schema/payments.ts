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
import { invoices } from "./invoices";

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentNumber: text("payment_number").notNull().unique(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").references(() => invoices.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("pending"), // pending, completed, failed, refunded, cancelled
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  paymentMethod: text("payment_method").notNull(), // credit_card, bank_transfer, paypal, stripe, etc.
  paymentGateway: text("payment_gateway"), // stripe, paypal, etc.
  transactionId: text("transaction_id"), // External payment gateway transaction ID
  paymentDate: timestamp("payment_date", { withTimezone: true }),
  failureReason: text("failure_reason"),
  refundedAmount: numeric("refunded_amount", { precision: 10, scale: 2 }).default("0"),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// Zod schemas for OpenAPI
export const insertPaymentSchema = createInsertSchema(payments, {
  paymentNumber: z.string().describe("Unique payment number"),
  tenantId: z.string().uuid().describe("Tenant ID"),
  invoiceId: z.string().uuid().optional().describe("Associated invoice ID"),
  status: z.enum(["pending", "completed", "failed", "refunded", "cancelled"]).describe("Payment status"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).describe("Payment amount"),
  currency: z.string().describe("Currency code (e.g., USD, EUR)"),
  paymentMethod: z.string().describe("Payment method (credit_card, bank_transfer, etc.)"),
  paymentGateway: z.string().optional().describe("Payment gateway (stripe, paypal, etc.)"),
  transactionId: z.string().optional().describe("External transaction ID"),
  failureReason: z.string().optional().describe("Reason for payment failure"),
  metadata: z.record(z.any()).optional().describe("Additional metadata"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  paymentDate: true,
  refundedAmount: true,
  refundedAt: true,
});

export const selectPaymentSchema = createSelectSchema(payments, {
  id: z.string().uuid().describe("Payment ID"),
  paymentNumber: z.string().describe("Unique payment number"),
  tenantId: z.string().uuid().describe("Tenant ID"),
  invoiceId: z.string().uuid().nullable().describe("Associated invoice ID"),
  status: z.enum(["pending", "completed", "failed", "refunded", "cancelled"]).describe("Payment status"),
  amount: z.string().describe("Payment amount"),
  currency: z.string().describe("Currency code"),
  paymentMethod: z.string().describe("Payment method"),
  paymentGateway: z.string().nullable().describe("Payment gateway"),
  transactionId: z.string().nullable().describe("External transaction ID"),
  paymentDate: z.date().nullable().describe("Date when payment was completed"),
  failureReason: z.string().nullable().describe("Reason for payment failure"),
  refundedAmount: z.string().nullable().describe("Amount refunded"),
  refundedAt: z.date().nullable().describe("Date when payment was refunded"),
  metadata: z.record(z.any()).describe("Additional metadata"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updatePaymentSchema = insertPaymentSchema.partial();

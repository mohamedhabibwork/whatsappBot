import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
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

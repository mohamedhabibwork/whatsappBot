import {
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { payments } from "./payments";

export const paymentTranslations = pgTable("payment_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  language: text("language").notNull(), // en, ar
  fieldName: text("field_name").notNull(), // e.g., "notes", "description"
  fieldValue: text("field_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type PaymentTranslation = typeof paymentTranslations.$inferSelect;
export type NewPaymentTranslation = typeof paymentTranslations.$inferInsert;

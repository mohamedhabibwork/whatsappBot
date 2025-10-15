import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { tenants } from "./tenants";

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phoneNumber: text("phone_number").notNull(),
    name: text("name"),
    isActive: boolean("is_active").notNull().default(true),
    timezone: text("timezone"),
    language: text("language"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    pgPolicy("tenant_isolation_policy", {
      for: "all",
      to: "public",
      using: sql`tenant_id = current_setting('app.current_tenant_id')::uuid`,
    }),
  ]
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

// Zod schemas for OpenAPI
export const insertContactSchema = createInsertSchema(contacts, {
  tenantId: z.string().uuid().describe("Tenant ID"),
  phoneNumber: z.string().min(1).describe("Contact phone number"),
  name: z.string().optional().describe("Contact name"),
  isActive: z.boolean().optional().default(true).describe("Whether the contact is active"),
  timezone: z.string().optional().describe("Contact timezone"),
  language: z.string().optional().describe("Contact language preference"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const selectContactSchema = createSelectSchema(contacts, {
  id: z.string().uuid().describe("Contact ID"),
  tenantId: z.string().uuid().describe("Tenant ID"),
  phoneNumber: z.string().describe("Contact phone number"),
  name: z.string().nullable().describe("Contact name"),
  isActive: z.boolean().describe("Whether the contact is active"),
  timezone: z.string().nullable().describe("Contact timezone"),
  language: z.string().nullable().describe("Contact language preference"),
  createdAt: z.date().describe("Creation timestamp"),
  updatedAt: z.date().describe("Last update timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updateContactSchema = insertContactSchema.partial();

import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const tenantInvitations = pgTable("tenant_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"), // 'admin', 'member', 'viewer'
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'expired', 'cancelled'
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: uuid("accepted_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type TenantInvitation = typeof tenantInvitations.$inferSelect;
export type NewTenantInvitation = typeof tenantInvitations.$inferInsert;

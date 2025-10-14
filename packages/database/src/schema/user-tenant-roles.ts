import {
  pgTable,
  text,
  timestamp,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { tenants } from "./tenants";

export const userTenantRoles = pgTable(
  "user_tenant",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'owner', 'admin', 'member', 'viewer', etc.
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.tenantId] }),
  }),
);

export type UserTenantRole = typeof userTenantRoles.$inferSelect;
export type NewUserTenantRole = typeof userTenantRoles.$inferInsert;

import {
  pgTable,
  timestamp,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { groups } from "./groups";
import { contacts } from "./contacts";

export const groupContacts = pgTable(
  "group_contacts",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.contactId] }),
  })
);

export type GroupContact = typeof groupContacts.$inferSelect;
export type NewGroupContact = typeof groupContacts.$inferInsert;

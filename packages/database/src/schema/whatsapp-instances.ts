import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const whatsappInstances = pgTable("whatsapp_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sessionName: text("session_name").notNull().unique(),
  phoneNumber: text("phone_number"),
  status: text("status").notNull().default("disconnected"),
  qrCode: text("qr_code"),
  isActive: boolean("is_active").notNull().default(true),
  config: jsonb("config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WhatsappInstance = typeof whatsappInstances.$inferSelect;
export type NewWhatsappInstance = typeof whatsappInstances.$inferInsert;

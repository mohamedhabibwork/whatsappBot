import {
  pgTable,
  text,
  timestamp,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const fcmTokens = pgTable("fcm_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  deviceId: text("device_id"),
  deviceType: text("device_type"), // 'android', 'ios', 'web'
  deviceName: text("device_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
});

export type FcmToken = typeof fcmTokens.$inferSelect;
export type NewFcmToken = typeof fcmTokens.$inferInsert;

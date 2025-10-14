import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { whatsappInstances } from "./whatsapp-instances";

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => whatsappInstances.id, { onDelete: "cascade" }),
  messageId: text("message_id").notNull(),
  chatId: text("chat_id").notNull(),
  fromMe: boolean("from_me").notNull().default(false),
  sender: text("sender"),
  recipient: text("recipient"),
  body: text("body"),
  type: text("type").notNull().default("text"),
  timestamp: timestamp("timestamp").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

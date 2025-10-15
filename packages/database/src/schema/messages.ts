import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
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
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

// Zod schemas for OpenAPI
export const insertMessageSchema = createInsertSchema(messages, {
  instanceId: z.string().uuid().describe("WhatsApp instance ID"),
  messageId: z.string().describe("Message ID from WhatsApp"),
  chatId: z.string().describe("Chat/conversation ID"),
  fromMe: z.boolean().optional().default(false).describe("Whether message is from bot"),
  sender: z.string().optional().describe("Sender phone number"),
  recipient: z.string().optional().describe("Recipient phone number"),
  body: z.string().optional().describe("Message body/content"),
  type: z.string().optional().default("text").describe("Message type (text, image, video, etc.)"),
  timestamp: z.date().describe("Message timestamp"),
  metadata: z.record(z.any()).optional().describe("Additional message metadata"),
}).omit({
  id: true,
  createdAt: true,
  deletedAt: true,
});

export const selectMessageSchema = createSelectSchema(messages, {
  id: z.string().uuid().describe("Message ID"),
  instanceId: z.string().uuid().describe("WhatsApp instance ID"),
  messageId: z.string().describe("Message ID from WhatsApp"),
  chatId: z.string().describe("Chat/conversation ID"),
  fromMe: z.boolean().describe("Whether message is from bot"),
  sender: z.string().nullable().describe("Sender phone number"),
  recipient: z.string().nullable().describe("Recipient phone number"),
  body: z.string().nullable().describe("Message body/content"),
  type: z.string().describe("Message type"),
  timestamp: z.date().describe("Message timestamp"),
  metadata: z.record(z.any()).nullable().describe("Additional message metadata"),
  createdAt: z.date().describe("Creation timestamp"),
  deletedAt: z.date().nullable().describe("Deletion timestamp"),
});

export const updateMessageSchema = insertMessageSchema.partial();

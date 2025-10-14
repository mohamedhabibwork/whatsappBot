import { z } from "zod";
import { BaseQueue } from "../base-queue";

// Message schemas
const sendMessageSchema = z.object({
  instanceId: z.string().uuid(),
  chatId: z.string(),
  message: z.string(),
  type: z.enum(["text", "image", "video", "audio", "document"]).default("text"),
  mediaUrl: z.string().url().optional(),
});

const instanceStatusSchema = z.object({
  instanceId: z.string().uuid(),
  status: z.enum(["connected", "disconnected", "qr", "error"]),
  qrCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  error: z.string().optional(),
});

const messageReceivedSchema = z.object({
  instanceId: z.string().uuid(),
  messageId: z.string(),
  chatId: z.string(),
  fromMe: z.boolean(),
  sender: z.string(),
  recipient: z.string(),
  body: z.string(),
  type: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type SendMessageData = z.infer<typeof sendMessageSchema>;
export type InstanceStatusData = z.infer<typeof instanceStatusSchema>;
export type MessageReceivedData = z.infer<typeof messageReceivedSchema>;

// Send Message Queue
export class SendMessageQueue extends BaseQueue<typeof sendMessageSchema> {
  constructor() {
    super("whatsapp.send-message", sendMessageSchema);
  }

  protected async processMessage(data: SendMessageData): Promise<void> {
    // This will be implemented by the WhatsApp service
    console.log("Processing send message:", data);
  }
}

// Instance Status Queue
export class InstanceStatusQueue extends BaseQueue<
  typeof instanceStatusSchema
> {
  constructor() {
    super("whatsapp.instance-status", instanceStatusSchema);
  }

  protected async processMessage(data: InstanceStatusData): Promise<void> {
    // This will be implemented by the WhatsApp service
    console.log("Processing instance status:", data);
  }
}

// Message Received Queue
export class MessageReceivedQueue extends BaseQueue<
  typeof messageReceivedSchema
> {
  constructor() {
    super("whatsapp.message-received", messageReceivedSchema);
  }

  protected async processMessage(data: MessageReceivedData): Promise<void> {
    // This will be implemented by the message handler
    console.log("Processing received message:", data);
  }
}

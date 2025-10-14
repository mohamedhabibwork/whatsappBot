import { z } from "zod";
import { BaseQueue } from "./base-queue";

export const WhatsAppMessageJobSchema = z.object({
  instanceId: z.string().uuid(),
  tenantId: z.string().uuid(),
  phone: z.string(),
  message: z.string(),
  isGroup: z.boolean().optional(),
  sessionName: z.string(),
  token: z.string(),
  campaignId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

export type WhatsAppMessageJob = z.infer<typeof WhatsAppMessageJobSchema>;

export class WhatsAppMessageQueue extends BaseQueue<typeof WhatsAppMessageJobSchema> {
  constructor() {
    super("whatsapp-messages", WhatsAppMessageJobSchema, {
      durable: true,
      maxRetries: 3,
      retryDelay: 5000,
    });
  }

  protected async processMessage(data: WhatsAppMessageJob): Promise<void> {
    // This will be implemented by the worker
    console.log("WhatsApp message queued:", data);
  }
}

export const whatsappMessageQueue = new WhatsAppMessageQueue();

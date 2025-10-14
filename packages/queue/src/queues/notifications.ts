import { z } from "zod";
import { BaseQueue } from "../base-queue";

const emailNotificationSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  html: z.string().optional(),
  from: z.string().email().optional(),
});

const webhookNotificationSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  headers: z.record(z.string()).optional(),
  body: z.record(z.any()),
  retryOnFail: z.boolean().default(true),
});

export type EmailNotificationData = z.infer<typeof emailNotificationSchema>;
export type WebhookNotificationData = z.infer<typeof webhookNotificationSchema>;

// Email Notification Queue
export class EmailNotificationQueue extends BaseQueue<
  typeof emailNotificationSchema
> {
  constructor() {
    super("notifications.email", emailNotificationSchema);
  }

  protected async processMessage(data: EmailNotificationData): Promise<void> {
    // Implement email sending logic here
    console.log("Sending email:", data);
  }
}

// Webhook Notification Queue
export class WebhookNotificationQueue extends BaseQueue<
  typeof webhookNotificationSchema
> {
  constructor() {
    super("notifications.webhook", webhookNotificationSchema);
  }

  protected async processMessage(data: WebhookNotificationData): Promise<void> {
    // Implement webhook calling logic here
    console.log("Calling webhook:", data);

    try {
      const response = await fetch(data.url, {
        method: data.method,
        headers: {
          "Content-Type": "application/json",
          ...data.headers,
        },
        body: JSON.stringify(data.body),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      console.log("Webhook successful:", data.url);
    } catch (error) {
      console.error("Webhook failed:", error);
      if (data.retryOnFail) {
        throw error; // Will trigger retry mechanism
      }
    }
  }
}

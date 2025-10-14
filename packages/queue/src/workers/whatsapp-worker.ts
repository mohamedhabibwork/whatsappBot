import { whatsappMessageQueue } from "../whatsapp-queue";
import { WhatsAppClient } from "@repo/whatsapp-client-sdk";
import { db } from "@repo/database";
import { 
  campaignRecipients, 
  campaigns 
} from "@repo/database";
import { eq } from "drizzle-orm";
import type { WhatsAppMessageJob } from "../whatsapp-queue";
// Note: Socket events will be emitted from the API layer
// Worker focuses on message processing and database updates

// Process WhatsApp messages from queue
async function processWhatsAppMessage(job: WhatsAppMessageJob): Promise<void> {
  try {
    console.log(`Processing WhatsApp message to ${job.phone}`);

    // Initialize WhatsApp client
    const baseURL = process.env.WHATSAPP_SERVER_URL || "http://localhost:21465";
    const secretKey = process.env.WHATSAPP_SERVER_SECRET || "";

    const client = new WhatsAppClient({
      baseURL,
      secretKey,
      session: job.sessionName,
      token: job.token,
    });

    // Send message via WhatsApp SDK
    const result = await client.messages.sendMessage({
      phone: job.phone,
      message: job.message,
      isGroup: job.isGroup || false,
    });

    console.log(`✓ WhatsApp message sent successfully: ${result.id}`);

    // Update campaign recipient status if applicable
    if (job.recipientId && job.campaignId) {
      await db
        .update(campaignRecipients)
        .set({
          status: "sent",
          sentAt: new Date(),
          messageData: {
            messageId: result.id,
            ack: result.ack,
          },
          updatedAt: new Date(),
        })
        .where(eq(campaignRecipients.id, job.recipientId));

      // Update campaign sent count
      await db.execute(
        `UPDATE campaigns 
         SET sent_count = sent_count + 1, 
             updated_at = NOW() 
         WHERE id = '${job.campaignId}'`
      );

      console.log(`✓ Updated campaign recipient status: ${job.recipientId}`);
    }

  } catch (error: any) {
    console.error("WhatsApp worker error:", error);

    // Update campaign recipient as failed if applicable
    if (job.recipientId && job.campaignId) {
      try {
        await db
          .update(campaignRecipients)
          .set({
            status: "failed",
            failedAt: new Date(),
            errorMessage: error.message || "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(campaignRecipients.id, job.recipientId));

        // Update campaign failed count
        await db.execute(
          `UPDATE campaigns 
           SET failed_count = failed_count + 1, 
               updated_at = NOW() 
           WHERE id = '${job.campaignId}'`
        );
      } catch (updateError) {
        console.error("Failed to update campaign recipient:", updateError);
      }
    }

    throw error; // Will trigger retry
  }
}

// Override processMessage in queue
(whatsappMessageQueue as any).processMessage = processWhatsAppMessage;

export async function startWhatsAppWorker() {
  await whatsappMessageQueue.initialize();
  await whatsappMessageQueue.consume();
  console.log("✓ WhatsApp worker started");
}

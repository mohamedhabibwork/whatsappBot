import {
  SendMessageQueue,
  InstanceStatusQueue,
  MessageReceivedQueue,
} from "./whatsapp";
import {
  EmailNotificationQueue,
  WebhookNotificationQueue,
} from "./notifications";

// Export queue classes
export {
  SendMessageQueue,
  InstanceStatusQueue,
  MessageReceivedQueue,
  EmailNotificationQueue,
  WebhookNotificationQueue,
};

// Export types
export type {
  SendMessageData,
  InstanceStatusData,
  MessageReceivedData,
} from "./whatsapp";

export type {
  EmailNotificationData,
  WebhookNotificationData,
} from "./notifications";

// Initialize all queues
export async function initializeQueues() {
  const queues = [
    new SendMessageQueue(),
    new InstanceStatusQueue(),
    new MessageReceivedQueue(),
    new EmailNotificationQueue(),
    new WebhookNotificationQueue(),
  ];

  await Promise.all(queues.map((queue) => queue.initialize()));
  console.log("All queues initialized");

  return {
    sendMessage: queues[0],
    instanceStatus: queues[1],
    messageReceived: queues[2],
    emailNotification: queues[3],
    webhookNotification: queues[4],
  };
}

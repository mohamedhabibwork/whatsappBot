import { getFCM, isFCMEnabled } from "./fcm-client";
import type { Message, MulticastMessage } from "firebase-admin/messaging";

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export class NotificationService {
  /**
   * Send notification to a single FCM token
   */
  async sendToToken(
    token: string,
    payload: NotificationPayload,
  ): Promise<boolean> {
    if (!isFCMEnabled()) {
      console.warn("FCM not enabled, skipping notification");
      return false;
    }

    try {
      const message: Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            priority: "high",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: "/icon.png",
            badge: "/badge.png",
          },
        },
      };

      const response = await getFCM().send(message);
      console.log("✓ Notification sent successfully:", response);
      return true;
    } catch (error: any) {
      console.error("Failed to send notification:", error);

      // Handle invalid tokens
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        console.log("Invalid token, should be removed from database:", token);
      }

      return false;
    }
  }

  /**
   * Send notification to multiple FCM tokens
   */
  async sendToTokens(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    if (!isFCMEnabled()) {
      console.warn("FCM not enabled, skipping notifications");
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: [],
      };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    try {
      const message: MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            priority: "high",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: "/icon.png",
            badge: "/badge.png",
          },
        },
      };

      const response = await getFCM().sendEachForMulticast(message);

      // Collect invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      console.log(
        `✓ Sent ${response.successCount}/${tokens.length} notifications`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      console.error("Failed to send multicast notifications:", error);
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: [],
      };
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    payload: NotificationPayload,
  ): Promise<boolean> {
    if (!isFCMEnabled()) {
      console.warn("FCM not enabled, skipping notification");
      return false;
    }

    try {
      const message: Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
      };

      const response = await getFCM().send(message);
      console.log("✓ Topic notification sent successfully:", response);
      return true;
    } catch (error) {
      console.error("Failed to send topic notification:", error);
      return false;
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<boolean> {
    if (!isFCMEnabled()) {
      console.warn("FCM not enabled, skipping topic subscription");
      return false;
    }

    try {
      const response = await getFCM().subscribeToTopic(tokens, topic);
      console.log(
        `✓ Subscribed ${response.successCount} tokens to topic: ${topic}`,
      );
      return true;
    } catch (error) {
      console.error("Failed to subscribe to topic:", error);
      return false;
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(
    tokens: string[],
    topic: string,
  ): Promise<boolean> {
    if (!isFCMEnabled()) {
      console.warn("FCM not enabled, skipping topic unsubscription");
      return false;
    }

    try {
      const response = await getFCM().unsubscribeFromTopic(tokens, topic);
      console.log(
        `✓ Unsubscribed ${response.successCount} tokens from topic: ${topic}`,
      );
      return true;
    } catch (error) {
      console.error("Failed to unsubscribe from topic:", error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();

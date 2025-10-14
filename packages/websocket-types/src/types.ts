export type Language = "en" | "ar";

export type WebSocketMessageType =
  | "connected"
  | "ping"
  | "pong"
  | "subscribe"
  | "subscribed"
  | "unsubscribe"
  | "unsubscribed"
  | "message"
  | "broadcast"
  | "broadcast_sent"
  | "error"
  | "stats"
  | "notification"
  | "auth_event"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "message_created"
  | "message_updated"
  | "message_deleted"
  | "whatsapp_status"
  | "whatsapp_qr"
  | "whatsapp_message";

export interface BaseWebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload?: T;
  timestamp: string;
  language?: Language;
}

export interface ConnectedMessage
  extends BaseWebSocketMessage<{
    clientId: string;
    authenticated: boolean;
    userId?: string;
  }> {
  type: "connected";
}

export interface MessageMessage
  extends BaseWebSocketMessage<{
    from: string;
    data: any;
  }> {
  type: "message";
}

export interface BroadcastMessage
  extends BaseWebSocketMessage<{
    message: string;
    from: string;
    clientId: string;
  }> {
  type: "broadcast";
}

export interface BroadcastSentMessage
  extends BaseWebSocketMessage<{
    message: string;
    timestamp: string;
  }> {
  type: "broadcast_sent";
}

export interface PingMessage extends BaseWebSocketMessage {
  type: "ping";
}

export interface PongMessage
  extends BaseWebSocketMessage<{
    timestamp: string;
  }> {
  type: "pong";
}

export interface SubscribeMessage
  extends BaseWebSocketMessage<{
    channel: string;
  }> {
  type: "subscribe";
}

export interface SubscribedMessage
  extends BaseWebSocketMessage<{
    channel: string;
  }> {
  type: "subscribed";
}

export interface UnsubscribeMessage
  extends BaseWebSocketMessage<{
    channel: string;
  }> {
  type: "unsubscribe";
}

export interface UnsubscribedMessage
  extends BaseWebSocketMessage<{
    channel: string;
  }> {
  type: "unsubscribed";
}

export interface ErrorMessage
  extends BaseWebSocketMessage<{
    message: string;
    code?: string;
    details?: any;
  }> {
  type: "error";
}

export interface StatsMessage
  extends BaseWebSocketMessage<{
    totalClients: number;
    authenticatedUsers: number;
    guestClients: number;
  }> {
  type: "stats";
}

export interface NotificationMessage
  extends BaseWebSocketMessage<{
    title: string;
    message: string;
    severity?: "info" | "success" | "warning" | "error";
    action?: {
      label: string;
      url: string;
    };
  }> {
  type: "notification";
}

export interface AuthEventMessage
  extends BaseWebSocketMessage<{
    event:
      | "login"
      | "logout"
      | "register"
      | "email_verified"
      | "password_changed"
      | "profile_updated";
    userId: string;
  }> {
  type: "auth_event";
}

export interface UserCreatedMessage
  extends BaseWebSocketMessage<{
    userId: string;
    email: string;
    name: string;
  }> {
  type: "user_created";
}

export interface UserUpdatedMessage
  extends BaseWebSocketMessage<{
    userId: string;
    changes: string[];
  }> {
  type: "user_updated";
}

export interface UserDeletedMessage
  extends BaseWebSocketMessage<{
    userId: string;
  }> {
  type: "user_deleted";
}

export interface MessageCreatedMessage
  extends BaseWebSocketMessage<{
    messageId: string;
    from: string;
    to: string;
    content: string;
  }> {
  type: "message_created";
}

export interface MessageUpdatedMessage
  extends BaseWebSocketMessage<{
    messageId: string;
    changes: string[];
  }> {
  type: "message_updated";
}

export interface MessageDeletedMessage
  extends BaseWebSocketMessage<{
    messageId: string;
  }> {
  type: "message_deleted";
}

export interface WhatsAppStatusMessage
  extends BaseWebSocketMessage<{
    instanceId: string;
    status: "connected" | "disconnected" | "qr" | "loading";
  }> {
  type: "whatsapp_status";
}

export interface WhatsAppQRMessage
  extends BaseWebSocketMessage<{
    instanceId: string;
    qrCode: string;
  }> {
  type: "whatsapp_qr";
}

export interface WhatsAppMessageMessage
  extends BaseWebSocketMessage<{
    instanceId: string;
    messageId: string;
    from: string;
    body: string;
  }> {
  type: "whatsapp_message";
}

export type WebSocketMessage =
  | ConnectedMessage
  | BroadcastSentMessage
  | MessageMessage
  | BroadcastMessage
  | PingMessage
  | PongMessage
  | SubscribeMessage
  | SubscribedMessage
  | UnsubscribeMessage
  | UnsubscribedMessage
  | ErrorMessage
  | StatsMessage
  | NotificationMessage
  | AuthEventMessage
  | UserCreatedMessage
  | UserUpdatedMessage
  | UserDeletedMessage
  | MessageCreatedMessage
  | MessageUpdatedMessage
  | MessageDeletedMessage
  | WhatsAppStatusMessage
  | WhatsAppQRMessage
  | WhatsAppMessageMessage;

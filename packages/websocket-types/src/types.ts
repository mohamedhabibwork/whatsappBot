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
  | "whatsapp_message"
  | "contact_created"
  | "contact_updated"
  | "contact_deleted"
  | "group_created"
  | "group_updated"
  | "group_deleted"
  | "campaign_created"
  | "campaign_updated"
  | "campaign_deleted"
  | "campaign_status_changed"
  | "template_created"
  | "template_updated"
  | "template_deleted"
  | "webhook_created"
  | "webhook_updated"
  | "webhook_deleted"
  | "webhook_triggered";

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

export interface ContactCreatedMessage
  extends BaseWebSocketMessage<{
    contactId: string;
    tenantId: string;
    phoneNumber: string;
    name?: string;
  }> {
  type: "contact_created";
}

export interface ContactUpdatedMessage
  extends BaseWebSocketMessage<{
    contactId: string;
    tenantId: string;
    changes: string[];
  }> {
  type: "contact_updated";
}

export interface ContactDeletedMessage
  extends BaseWebSocketMessage<{
    contactId: string;
    tenantId: string;
  }> {
  type: "contact_deleted";
}

export interface GroupCreatedMessage
  extends BaseWebSocketMessage<{
    groupId: string;
    tenantId: string;
    name: string;
  }> {
  type: "group_created";
}

export interface GroupUpdatedMessage
  extends BaseWebSocketMessage<{
    groupId: string;
    tenantId: string;
    changes: string[];
  }> {
  type: "group_updated";
}

export interface GroupDeletedMessage
  extends BaseWebSocketMessage<{
    groupId: string;
    tenantId: string;
  }> {
  type: "group_deleted";
}

export interface CampaignCreatedMessage
  extends BaseWebSocketMessage<{
    campaignId: string;
    tenantId: string;
    name: string;
  }> {
  type: "campaign_created";
}

export interface CampaignUpdatedMessage
  extends BaseWebSocketMessage<{
    campaignId: string;
    tenantId: string;
    changes: string[];
  }> {
  type: "campaign_updated";
}

export interface CampaignDeletedMessage
  extends BaseWebSocketMessage<{
    campaignId: string;
    tenantId: string;
  }> {
  type: "campaign_deleted";
}

export interface CampaignStatusChangedMessage
  extends BaseWebSocketMessage<{
    campaignId: string;
    tenantId: string;
    status: string;
    previousStatus: string;
  }> {
  type: "campaign_status_changed";
}

export interface TemplateCreatedMessage
  extends BaseWebSocketMessage<{
    templateId: string;
    tenantId: string;
    name: string;
  }> {
  type: "template_created";
}

export interface TemplateUpdatedMessage
  extends BaseWebSocketMessage<{
    templateId: string;
    tenantId: string;
    changes: string[];
  }> {
  type: "template_updated";
}

export interface TemplateDeletedMessage
  extends BaseWebSocketMessage<{
    templateId: string;
    tenantId: string;
  }> {
  type: "template_deleted";
}

export interface WebhookCreatedMessage
  extends BaseWebSocketMessage<{
    webhookId: string;
    tenantId: string;
    name: string;
  }> {
  type: "webhook_created";
}

export interface WebhookUpdatedMessage
  extends BaseWebSocketMessage<{
    webhookId: string;
    tenantId: string;
    changes: string[];
  }> {
  type: "webhook_updated";
}

export interface WebhookDeletedMessage
  extends BaseWebSocketMessage<{
    webhookId: string;
    tenantId: string;
  }> {
  type: "webhook_deleted";
}

export interface WebhookTriggeredMessage
  extends BaseWebSocketMessage<{
    webhookId: string;
    tenantId: string;
    event: string;
    success: boolean;
  }> {
  type: "webhook_triggered";
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
  | WhatsAppMessageMessage
  | ContactCreatedMessage
  | ContactUpdatedMessage
  | ContactDeletedMessage
  | GroupCreatedMessage
  | GroupUpdatedMessage
  | GroupDeletedMessage
  | CampaignCreatedMessage
  | CampaignUpdatedMessage
  | CampaignDeletedMessage
  | CampaignStatusChangedMessage
  | TemplateCreatedMessage
  | TemplateUpdatedMessage
  | TemplateDeletedMessage
  | WebhookCreatedMessage
  | WebhookUpdatedMessage
  | WebhookDeletedMessage
  | WebhookTriggeredMessage;

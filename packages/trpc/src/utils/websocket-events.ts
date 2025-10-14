import type { Language } from "@repo/websocket-types";

type BroadcastFunction = (
  type: string,
  payload: any,
  language?: Language
) => void;

let broadcastFn: BroadcastFunction | null = null;

export function setBroadcastFunction(fn: BroadcastFunction) {
  broadcastFn = fn;
}

export function notifyTenantUsers(
  tenantId: string,
  type: string,
  payload: any,
  language: Language = "en"
) {
  if (broadcastFn) {
    broadcastFn(type, payload, language);
  } else {
    console.log(`[WebSocket] Tenant ${tenantId} event: ${type}`, payload);
  }
}

export function emitContactEvent(
  type: "contact_created" | "contact_updated" | "contact_deleted" | "contacts_bulk_deleted" | "contacts_bulk_updated",
  contactId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    contactId,
    tenantId,
    ...data,
  }, language);
}

export function emitGroupEvent(
  type: "group_created" | "group_updated" | "group_deleted" | "groups_bulk_deleted" | "groups_bulk_updated",
  groupId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    groupId,
    tenantId,
    ...data,
  }, language);
}

export function emitCampaignEvent(
  type: "campaign_created" | "campaign_updated" | "campaign_deleted" | "campaign_status_changed" | "campaigns_bulk_deleted" | "campaigns_bulk_updated",
  campaignId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    campaignId,
    tenantId,
    ...data,
  }, language);
}

export function emitTemplateEvent(
  type: "template_created" | "template_updated" | "template_deleted",
  templateId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    templateId,
    tenantId,
    ...data,
  }, language);
}

export function emitWebhookEvent(
  type: "webhook_created" | "webhook_updated" | "webhook_deleted" | "webhook_triggered",
  webhookId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    webhookId,
    tenantId,
    ...data,
  }, language);
}

export function emitWhatsAppEvent(
  type: "whatsapp_instance_created" | "whatsapp_instance_updated" | "whatsapp_instance_deleted" | 
        "whatsapp_instance_connected" | "whatsapp_instance_disconnected" | "whatsapp_qr_generated" |
        "whatsapp_message_sent" | "whatsapp_message_received" | "whatsapp_bulk_sent",
  instanceId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    instanceId,
    tenantId,
    ...data,
  }, language);
}

export function emitMessageEvent(
  type: "message_sent" | "message_received" | "message_delivered" | "message_read" | "message_failed",
  messageId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    messageId,
    tenantId,
    ...data,
  }, language);
}

export function emitSubscriptionEvent(
  type: "subscription_created" | "subscription_updated" | "subscription_cancelled" | 
        "subscription_renewed" | "subscription_expired" | "usage_limit_reached" | "usage_updated",
  subscriptionId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    subscriptionId,
    tenantId,
    ...data,
  }, language);
}

export function emitPaymentEvent(
  type: "payment_created" | "payment_succeeded" | "payment_failed" | "payment_refunded",
  paymentId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    paymentId,
    tenantId,
    ...data,
  }, language);
}

export function emitInvoiceEvent(
  type: "invoice_created" | "invoice_updated" | "invoice_paid" | "invoice_sent" | "invoice_overdue",
  invoiceId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    invoiceId,
    tenantId,
    ...data,
  }, language);
}

export function emitNotificationEvent(
  type: "notification_created" | "notification_read" | "notification_deleted" | "notifications_bulk_read",
  notificationId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    notificationId,
    tenantId,
    ...data,
  }, language);
}

export function emitTenantEvent(
  type: "tenant_created" | "tenant_updated" | "tenant_deleted" | "tenant_member_added" | 
        "tenant_member_removed" | "tenant_member_role_changed" | "tenant_invitation_sent",
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    tenantId,
    ...data,
  }, language);
}

export function emitUserEvent(
  type: "user_updated" | "user_profile_changed" | "user_password_changed" | "user_email_verified",
  userId: string,
  tenantId: string,
  data: any = {},
  language: Language = "en"
) {
  notifyTenantUsers(tenantId, type, {
    userId,
    tenantId,
    ...data,
  }, language);
}

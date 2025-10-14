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

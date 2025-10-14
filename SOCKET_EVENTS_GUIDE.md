# Socket Events Documentation

## Overview

Comprehensive real-time socket events for all API operations. All events are automatically broadcast to tenant users for live updates.

---

## Event Structure

All socket events follow this structure:

```typescript
{
  type: string,           // Event type
  payload: {
    [entityId]: string,   // ID of the entity (e.g., instanceId, contactId)
    tenantId: string,     // Tenant ID
    ...data               // Additional event data
  },
  language?: "en" | "ar"  // Optional language
}
```

---

## WhatsApp Instance Events

### `whatsapp_instance_created`
Emitted when a new WhatsApp instance is created.

```typescript
{
  type: "whatsapp_instance_created",
  payload: {
    instanceId: "uuid",
    tenantId: "uuid",
    name: "My WhatsApp",
    sessionName: "session_123"
  }
}
```

**Triggered by:**
- `whatsapp.create` mutation

---

### `whatsapp_instance_updated`
Emitted when an instance is updated.

```typescript
{
  type: "whatsapp_instance_updated",
  payload: {
    instanceId: "uuid",
    tenantId: "uuid",
    changes: {
      name?: string,
      status?: string,
      isActive?: boolean
    }
  }
}
```

**Triggered by:**
- `whatsapp.update` mutation

---

### `whatsapp_instance_deleted`
Emitted when an instance is deleted.

```typescript
{
  type: "whatsapp_instance_deleted",
  payload: {
    instanceId: "uuid",
    tenantId: "uuid",
    name: "My WhatsApp"
  }
}
```

**Triggered by:**
- `whatsapp.delete` mutation

---

### `whatsapp_instance_connected`
Emitted when an instance successfully connects.

```typescript
{
  type: "whatsapp_instance_connected",
  payload: {
    instanceId: "uuid",
    tenantId: "uuid",
    phoneNumber?: string
  }
}
```

**Triggered by:**
- Webhook from WhatsApp server
- Status check detecting connection

---

### `whatsapp_instance_disconnected`
Emitted when an instance disconnects.

```typescript
{
  type: "whatsapp_instance_disconnected",
  payload: {
    instanceId: "uuid",
    tenantId: "uuid",
    sessionName: string
  }
}
```

**Triggered by:**
- `whatsapp.disconnect` mutation
- Connection loss detection

---

### `whatsapp_qr_generated`
Emitted when a new QR code is generated.

```typescript
{
  type: "whatsapp_qr_generated",
  payload: {
    instanceId: "uuid",
    tenantId: "uuid",
    qrCode: string
  }
}
```

**Triggered by:**
- `whatsapp.getQrCode` query
- `whatsapp.reconnect` mutation

---

## Message Events

### `whatsapp_message_sent`
Emitted when a message is successfully sent.

```typescript
{
  type: "whatsapp_message_sent",
  payload: {
    instanceId: "uuid",
    tenantId: "uuid",
    messageId: string,
    phone: string
  }
}
```

**Triggered by:**
- `whatsapp.sendMessage` mutation
- `whatsapp.sendWithTemplate` mutation
- Queue worker processing

---

### `whatsapp_message_received`
Emitted when a message is received (via webhook).

```typescript
{
  type: "whatsapp_message_received",
  payload: {
    instanceId: "uuid",
    tenantId: "uuid",
    messageId: string,
    from: string,
    message: string
  }
}
```

**Triggered by:**
- WhatsApp webhook handler

---

### `whatsapp_bulk_sent`
Emitted when bulk messages are queued.

```typescript
{
  type: "whatsapp_bulk_sent",
  payload: {
    instanceId: "uuid",
    tenantId: "uuid",
    queued: number,
    total: number,
    type: "contacts" | "group",
    groupName?: string
  }
}
```

**Triggered by:**
- `whatsapp.sendBulkToContacts` mutation
- `whatsapp.sendBulkToGroup` mutation

---

## Campaign Events

### `campaign_created`
Emitted when a campaign is created.

```typescript
{
  type: "campaign_created",
  payload: {
    campaignId: "uuid",
    tenantId: "uuid",
    name: string,
    totalRecipients: number
  }
}
```

**Triggered by:**
- `campaigns.create` mutation

---

### `campaign_updated`
Emitted when a campaign is updated.

```typescript
{
  type: "campaign_updated",
  payload: {
    campaignId: "uuid",
    tenantId: "uuid",
    changes: object
  }
}
```

**Triggered by:**
- `campaigns.update` mutation

---

### `campaign_deleted`
Emitted when a campaign is deleted.

```typescript
{
  type: "campaign_deleted",
  payload: {
    campaignId: "uuid",
    tenantId: "uuid",
    name: string
  }
}
```

**Triggered by:**
- `campaigns.delete` mutation

---

### `campaign_status_changed`
Emitted when campaign status changes.

```typescript
{
  type: "campaign_status_changed",
  payload: {
    campaignId: "uuid",
    tenantId: "uuid",
    status: "running" | "completed" | "cancelled",
    previousStatus: string,
    queuedMessages?: number
  }
}
```

**Triggered by:**
- `campaigns.start` mutation
- `campaigns.cancel` mutation
- Campaign completion

---

## Contact Events

### `contact_created`
Emitted when a contact is created.

```typescript
{
  type: "contact_created",
  payload: {
    contactId: "uuid",
    tenantId: "uuid",
    name: string,
    phoneNumber: string
  }
}
```

**Triggered by:**
- `contacts.create` mutation

---

### `contact_updated`
Emitted when a contact is updated.

```typescript
{
  type: "contact_updated",
  payload: {
    contactId: "uuid",
    tenantId: "uuid",
    changes: object
  }
}
```

**Triggered by:**
- `contacts.update` mutation

---

### `contact_deleted`
Emitted when a contact is deleted.

```typescript
{
  type: "contact_deleted",
  payload: {
    contactId: "uuid",
    tenantId: "uuid"
  }
}
```

**Triggered by:**
- `contacts.delete` mutation

---

### `contacts_bulk_deleted`
Emitted when multiple contacts are deleted.

```typescript
{
  type: "contacts_bulk_deleted",
  payload: {
    contactId: "bulk",
    tenantId: "uuid",
    count: number,
    ids: string[]
  }
}
```

**Triggered by:**
- `contacts.bulkDelete` mutation

---

## Group Events

### `group_created`
Emitted when a group is created.

```typescript
{
  type: "group_created",
  payload: {
    groupId: "uuid",
    tenantId: "uuid",
    name: string
  }
}
```

**Triggered by:**
- `groups.create` mutation

---

### `group_updated`
Emitted when a group is updated.

```typescript
{
  type: "group_updated",
  payload: {
    groupId: "uuid",
    tenantId: "uuid",
    changes: object
  }
}
```

**Triggered by:**
- `groups.update` mutation

---

### `group_deleted`
Emitted when a group is deleted.

```typescript
{
  type: "group_deleted",
  payload: {
    groupId: "uuid",
    tenantId: "uuid"
  }
}
```

**Triggered by:**
- `groups.delete` mutation

---

## Subscription Events

### `subscription_created`
Emitted when a subscription is created.

```typescript
{
  type: "subscription_created",
  payload: {
    subscriptionId: "uuid",
    tenantId: "uuid",
    planId: "uuid",
    status: string
  }
}
```

**Triggered by:**
- `subscriptions.create` mutation

---

### `subscription_updated`
Emitted when a subscription is updated.

```typescript
{
  type: "subscription_updated",
  payload: {
    subscriptionId: "uuid",
    tenantId: "uuid",
    changes: object
  }
}
```

**Triggered by:**
- `subscriptions.update` mutation

---

### `subscription_cancelled`
Emitted when a subscription is cancelled.

```typescript
{
  type: "subscription_cancelled",
  payload: {
    subscriptionId: "uuid",
    tenantId: "uuid",
    cancelAtPeriodEnd: boolean
  }
}
```

**Triggered by:**
- `subscriptions.cancel` mutation

---

### `subscription_renewed`
Emitted when a subscription is renewed.

```typescript
{
  type: "subscription_renewed",
  payload: {
    subscriptionId: "uuid",
    tenantId: "uuid",
    periodStart: Date,
    periodEnd: Date
  }
}
```

**Triggered by:**
- `subscriptions.renew` mutation

---

### `usage_limit_reached`
Emitted when usage limit is reached.

```typescript
{
  type: "usage_limit_reached",
  payload: {
    subscriptionId: "uuid",
    tenantId: "uuid",
    featureKey: string,
    limit: number,
    current: number
  }
}
```

**Triggered by:**
- Usage tracking system

---

### `usage_updated`
Emitted when usage is updated.

```typescript
{
  type: "usage_updated",
  payload: {
    subscriptionId: "uuid",
    tenantId: "uuid",
    featureKey: string,
    usageCount: number,
    limit: number
  }
}
```

**Triggered by:**
- Usage tracking system

---

## Template Events

### `template_created`
Emitted when a message template is created.

```typescript
{
  type: "template_created",
  payload: {
    templateId: "uuid",
    tenantId: "uuid",
    name: string
  }
}
```

**Triggered by:**
- `messageTemplates.create` mutation

---

### `template_updated`
Emitted when a template is updated.

```typescript
{
  type: "template_updated",
  payload: {
    templateId: "uuid",
    tenantId: "uuid",
    changes: object
  }
}
```

**Triggered by:**
- `messageTemplates.update` mutation

---

### `template_deleted`
Emitted when a template is deleted.

```typescript
{
  type: "template_deleted",
  payload: {
    templateId: "uuid",
    tenantId: "uuid"
  }
}
```

**Triggered by:**
- `messageTemplates.delete` mutation

---

## Notification Events

### `notification_created`
Emitted when a notification is created.

```typescript
{
  type: "notification_created",
  payload: {
    notificationId: "uuid",
    tenantId: "uuid",
    title: string,
    message: string,
    type: string
  }
}
```

**Triggered by:**
- `notifications.create` mutation
- System events

---

### `notification_read`
Emitted when a notification is marked as read.

```typescript
{
  type: "notification_read",
  payload: {
    notificationId: "uuid",
    tenantId: "uuid"
  }
}
```

**Triggered by:**
- `notifications.markAsRead` mutation

---

### `notification_deleted`
Emitted when a notification is deleted.

```typescript
{
  type: "notification_deleted",
  payload: {
    notificationId: "uuid",
    tenantId: "uuid"
  }
}
```

**Triggered by:**
- `notifications.delete` mutation

---

## Tenant Events

### `tenant_created`
Emitted when a tenant is created.

```typescript
{
  type: "tenant_created",
  payload: {
    tenantId: "uuid",
    name: string,
    slug: string
  }
}
```

**Triggered by:**
- `tenants.create` mutation

---

### `tenant_updated`
Emitted when a tenant is updated.

```typescript
{
  type: "tenant_updated",
  payload: {
    tenantId: "uuid",
    changes: object
  }
}
```

**Triggered by:**
- `tenants.update` mutation

---

### `tenant_member_added`
Emitted when a member is added to a tenant.

```typescript
{
  type: "tenant_member_added",
  payload: {
    tenantId: "uuid",
    userId: "uuid",
    role: string
  }
}
```

**Triggered by:**
- `tenants.addMember` mutation
- Invitation acceptance

---

### `tenant_member_removed`
Emitted when a member is removed from a tenant.

```typescript
{
  type: "tenant_member_removed",
  payload: {
    tenantId: "uuid",
    userId: "uuid"
  }
}
```

**Triggered by:**
- `tenants.removeMember` mutation

---

### `tenant_member_role_changed`
Emitted when a member's role changes.

```typescript
{
  type: "tenant_member_role_changed",
  payload: {
    tenantId: "uuid",
    userId: "uuid",
    oldRole: string,
    newRole: string
  }
}
```

**Triggered by:**
- `tenants.updateMemberRole` mutation

---

## Frontend Integration

### React/Vue Example

```typescript
import { useEffect } from 'react';
import { socket } from './socket';

function WhatsAppDashboard() {
  useEffect(() => {
    // Listen for instance created
    socket.on('whatsapp_instance_created', (data) => {
      console.log('New instance created:', data);
      // Update UI, refetch data, show notification
    });

    // Listen for message sent
    socket.on('whatsapp_message_sent', (data) => {
      console.log('Message sent:', data);
      // Update message list
    });

    // Listen for campaign status
    socket.on('campaign_status_changed', (data) => {
      console.log('Campaign status:', data);
      // Update campaign progress
    });

    // Cleanup
    return () => {
      socket.off('whatsapp_instance_created');
      socket.off('whatsapp_message_sent');
      socket.off('campaign_status_changed');
    });
  }, []);

  return <div>...</div>;
}
```

---

### Real-time Updates Example

```typescript
// Live campaign progress
socket.on('campaign_status_changed', (data) => {
  if (data.status === 'running') {
    showNotification(`Campaign started: ${data.queuedMessages} messages queued`);
  }
});

// Live message delivery
socket.on('whatsapp_message_sent', (data) => {
  updateMessageStatus(data.messageId, 'sent');
  incrementSentCount();
});

// Usage limit warnings
socket.on('usage_limit_reached', (data) => {
  showWarning(`${data.featureKey} limit reached: ${data.current}/${data.limit}`);
});

// Instance connection status
socket.on('whatsapp_instance_connected', (data) => {
  updateInstanceStatus(data.instanceId, 'connected');
  showSuccess('WhatsApp connected successfully');
});

socket.on('whatsapp_instance_disconnected', (data) => {
  updateInstanceStatus(data.instanceId, 'disconnected');
  showError('WhatsApp disconnected');
});
```

---

## Event Filtering

Events are automatically filtered by tenant. Users only receive events for their tenant.

```typescript
// Server-side (automatic)
function notifyTenantUsers(tenantId, type, payload) {
  // Only users in this tenant receive the event
  io.to(`tenant:${tenantId}`).emit(type, payload);
}
```

---

## Best Practices

### 1. **Reconnection Handling**
```typescript
socket.on('connect', () => {
  console.log('Socket connected');
  // Rejoin tenant room
  socket.emit('join-tenant', { tenantId });
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
  // Show reconnection UI
});
```

### 2. **Event Debouncing**
```typescript
import { debounce } from 'lodash';

const handleBulkUpdate = debounce((data) => {
  refetchData();
}, 1000);

socket.on('contacts_bulk_updated', handleBulkUpdate);
```

### 3. **Optimistic Updates**
```typescript
async function sendMessage(data) {
  // Optimistic update
  addMessageToUI({ ...data, status: 'sending' });

  // Send to server
  await trpc.whatsapp.sendMessage.mutate(data);

  // Socket event will confirm
  socket.once('whatsapp_message_sent', (event) => {
    updateMessageStatus(event.messageId, 'sent');
  });
}
```

### 4. **Error Handling**
```typescript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  showErrorNotification('Connection error');
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
  attemptReconnect();
});
```

---

## Testing Socket Events

```typescript
// Emit test event (development only)
socket.emit('test-event', {
  type: 'whatsapp_message_sent',
  payload: {
    instanceId: 'test-uuid',
    tenantId: 'tenant-uuid',
    messageId: 'msg_123',
    phone: '+1234567890'
  }
});

// Listen for all events (debugging)
socket.onAny((eventName, data) => {
  console.log('Event:', eventName, data);
});
```

---

## Event Summary

| Category | Events | Count |
|----------|--------|-------|
| WhatsApp | instance_created, instance_updated, instance_deleted, instance_connected, instance_disconnected, qr_generated, message_sent, message_received, bulk_sent | 9 |
| Campaigns | campaign_created, campaign_updated, campaign_deleted, campaign_status_changed | 4 |
| Contacts | contact_created, contact_updated, contact_deleted, contacts_bulk_deleted | 4 |
| Groups | group_created, group_updated, group_deleted | 3 |
| Subscriptions | subscription_created, subscription_updated, subscription_cancelled, subscription_renewed, usage_limit_reached, usage_updated | 6 |
| Templates | template_created, template_updated, template_deleted | 3 |
| Notifications | notification_created, notification_read, notification_deleted | 3 |
| Tenants | tenant_created, tenant_updated, tenant_member_added, tenant_member_removed, tenant_member_role_changed | 5 |
| **Total** | | **37 events** |

---

## Support

For issues or questions:
1. Check socket connection status
2. Verify tenant room joining
3. Review event payload structure
4. Monitor browser console for events
5. Test with socket.io client debugger

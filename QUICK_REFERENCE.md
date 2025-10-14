# Quick Reference Guide

## Database Schemas with RLS

All tenant-related schemas now have Row-Level Security enabled:

| Schema | RLS Policy | Purpose |
|--------|-----------|---------|
| `contacts` | ✅ Tenant Isolation | Contact management |
| `groups` | ✅ Tenant Isolation | Group management |
| `message_templates` | ✅ Tenant Isolation | Message templates |
| `campaigns` | ✅ Tenant Isolation | Campaign management |
| `messages_history` | ✅ Tenant Isolation | Message tracking |
| `webhooks` | ✅ Tenant Isolation | Webhook configs |
| `webhook_logs` | ❌ No RLS | Logs (linked to webhooks) |
| `campaign_recipients` | ❌ No RLS | Recipients (linked to campaigns) |
| `group_contacts` | ❌ No RLS | Junction table |

## WebSocket Event Reference

### Quick Event List

```typescript
// Contacts
"contact_created"
"contact_updated"
"contact_deleted"

// Groups
"group_created"
"group_updated"
"group_deleted"

// Campaigns
"campaign_created"
"campaign_updated"
"campaign_deleted"
"campaign_status_changed"

// Templates
"template_created"
"template_updated"
"template_deleted"

// Webhooks
"webhook_created"
"webhook_updated"
"webhook_deleted"
"webhook_triggered"
```

## tRPC API Endpoints

### Contacts
```typescript
trpc.contacts.list({ tenantId, limit, offset })
trpc.contacts.getById({ id })
trpc.contacts.create({ tenantId, phoneNumber, name? })
trpc.contacts.update({ id, phoneNumber?, name?, isActive? })
trpc.contacts.delete({ id })
```

### Groups
```typescript
trpc.groups.list({ tenantId, limit, offset })
trpc.groups.getById({ id })
trpc.groups.create({ tenantId, name, description? })
trpc.groups.update({ id, name?, description?, isActive? })
trpc.groups.delete({ id })
trpc.groups.addContacts({ groupId, contactIds })
trpc.groups.removeContacts({ groupId, contactIds })
```

### Message Templates
```typescript
trpc.messageTemplates.list({ tenantId, limit, offset })
trpc.messageTemplates.getById({ id })
trpc.messageTemplates.create({ tenantId, name, content, variables? })
trpc.messageTemplates.update({ id, name?, content?, variables?, isActive? })
trpc.messageTemplates.delete({ id })
```

### Campaigns
```typescript
trpc.campaigns.list({ tenantId, limit, offset })
trpc.campaigns.getById({ id })
trpc.campaigns.create({ 
  tenantId, 
  whatsappInstanceId, 
  messageTemplateId?,
  name, 
  message, 
  scheduledAt?,
  recipientType: "contacts" | "groups",
  recipientIds 
})
trpc.campaigns.update({ id, name?, message?, scheduledAt?, status? })
trpc.campaigns.delete({ id })
trpc.campaigns.start({ id })
trpc.campaigns.cancel({ id })
```

### Webhooks
```typescript
trpc.webhooks.list({ tenantId, limit, offset })
trpc.webhooks.getById({ id })
trpc.webhooks.create({ tenantId, name, url, events })
trpc.webhooks.update({ id, name?, url?, events?, isActive? })
trpc.webhooks.delete({ id })
trpc.webhooks.regenerateSecret({ id })
trpc.webhooks.getLogs({ webhookId, limit, offset })
```

### Messages History
```typescript
trpc.messagesHistory.list({ 
  tenantId, 
  whatsappInstanceId?, 
  contactId?, 
  chatId?,
  limit, 
  offset 
})
trpc.messagesHistory.getById({ id })
trpc.messagesHistory.create({ 
  tenantId, 
  whatsappInstanceId, 
  contactId?,
  messageId?,
  chatId, 
  direction: "inbound" | "outbound",
  type?,
  content?,
  metadata?,
  status?
})
trpc.messagesHistory.updateStatus({ 
  id, 
  status: "sent" | "delivered" | "read" | "failed" 
})
```

## Common Code Snippets

### Setting Tenant Context (RLS)

```typescript
import { db } from "@repo/database";
import { sql } from "drizzle-orm";

// Set tenant context before queries
await db.execute(sql`SET app.current_tenant_id = ${tenantId}`);
```

### Creating a Contact with WebSocket Event

```typescript
const result = await trpc.contacts.create.mutate({
  tenantId: "uuid",
  phoneNumber: "+1234567890",
  name: "John Doe"
});
// WebSocket event "contact_created" is automatically emitted
```

### Listening to WebSocket Events (Client)

```typescript
const ws = new WebSocket('ws://localhost:3001/ws?token=JWT_TOKEN&language=en');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'contact_created') {
    // Add contact to UI
    addContactToList(msg.payload);
  }
  
  if (msg.type === 'campaign_status_changed') {
    // Update campaign status
    updateCampaignStatus(msg.payload.campaignId, msg.payload.status);
  }
};
```

### Creating a Campaign

```typescript
// 1. Create contacts
const contact1 = await trpc.contacts.create.mutate({
  tenantId, phoneNumber: "+1111111111", name: "Alice"
});
const contact2 = await trpc.contacts.create.mutate({
  tenantId, phoneNumber: "+2222222222", name: "Bob"
});

// 2. Create group
const group = await trpc.groups.create.mutate({
  tenantId, name: "VIP Customers"
});

// 3. Add contacts to group
await trpc.groups.addContacts.mutate({
  groupId: group.group.id,
  contactIds: [contact1.contact.id, contact2.contact.id]
});

// 4. Create campaign
const campaign = await trpc.campaigns.create.mutate({
  tenantId,
  whatsappInstanceId: "instance-uuid",
  name: "New Year Promotion",
  message: "Happy New Year! Get 20% off!",
  recipientType: "groups",
  recipientIds: [group.group.id]
});

// 5. Start campaign
await trpc.campaigns.start.mutate({ id: campaign.campaign.id });
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_bot

# API Server
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
```

## Migration Commands

```bash
# Generate migration
cd packages/database
bun run db:generate

# Apply migration
bun run db:migrate

# Open Drizzle Studio
bun run db:studio
```

## Testing Checklist

- [ ] RLS policies prevent cross-tenant access
- [ ] WebSocket events fire on CRUD operations
- [ ] Multiple clients receive real-time updates
- [ ] Campaign creation includes all recipients
- [ ] Webhook logs are recorded
- [ ] Message history tracks all messages
- [ ] Soft deletes work correctly (deletedAt)
- [ ] Tenant context is set before queries
- [ ] Authentication works for WebSocket
- [ ] Rate limiting prevents abuse

## Troubleshooting

**No data returned from queries:**
- Check if `app.current_tenant_id` is set
- Verify RLS policies are enabled
- Check tenant ID is correct

**WebSocket not connecting:**
- Verify JWT token is valid
- Check WebSocket URL and port
- Ensure server is running

**Events not received:**
- Check WebSocket connection status
- Verify broadcast function is initialized
- Check browser console for errors

**Campaign not sending:**
- Verify WhatsApp instance is connected
- Check campaign status
- Verify recipients exist
- Check campaign logs

# Bulk Messaging System Guide

## Overview

A comprehensive bulk messaging system with queue processing, template support, and variable replacement for WhatsApp campaigns.

## Features

✅ **Bulk messaging** to contacts, groups, and campaigns  
✅ **Template variable replacement** with multiple formats  
✅ **Queue-based async processing** using RabbitMQ  
✅ **Subscription usage tracking** with limits enforcement  
✅ **Campaign management** with status tracking  
✅ **Retry mechanism** for failed messages  

---

## Architecture

### Components

1. **Template Variable System** (`packages/trpc/src/utils/template-variables.ts`)
   - Variable replacement ({{var}}, {var}, ${var})
   - Contact data mapping
   - Variable extraction and validation

2. **WhatsApp Message Queue** (`packages/queue/src/whatsapp-queue.ts`)
   - RabbitMQ integration
   - Job schema validation
   - Retry configuration

3. **Queue Worker** (`packages/queue/src/workers/whatsapp-worker.ts`)
   - Async message processing
   - Campaign status updates
   - Error handling and retries

4. **Bulk Messaging Endpoints** (`packages/trpc/src/routers/whatsapp.ts`)
   - Send to contacts
   - Send to groups
   - Send with templates
   - Campaign execution

---

## Template Variables

### Supported Formats

```
{{variable}}   - Standard format
{variable}     - Simple format
${variable}    - ES6 format
```

### Built-in Variables

Automatically available for every contact:

- `{{name}}` - Full contact name
- `{{firstName}}` - First name only
- `{{phone}}` - Phone number
- `{{language}}` - Contact language
- `{{timezone}}` - Contact timezone

### Custom Variables

Pass custom variables in API calls:

```typescript
customVariables: {
  companyName: "Acme Corp",
  discountCode: "SAVE20",
  expiryDate: "2025-12-31"
}
```

### Template Example

```
Hello {{firstName}}!

Your discount code {{discountCode}} is valid until {{expiryDate}}.

Shop now at {{companyName}}.

Reply STOP to unsubscribe.
```

---

## API Endpoints

### 1. Send Bulk to Contacts

Send messages to multiple contacts with optional template.

```typescript
await trpc.whatsapp.sendBulkToContacts.mutate({
  instanceId: "uuid",
  contactIds: ["uuid1", "uuid2", "uuid3"],
  message: "Hello {{name}}! This is a test message.",
  // OR use template
  templateId: "uuid",
  customVariables: {
    discountCode: "SAVE20"
  }
});
```

**Response:**
```typescript
{
  success: true,
  queued: 3,
  total: 3
}
```

### 2. Send Bulk to Group

Send messages to all contacts in a group.

```typescript
await trpc.whatsapp.sendBulkToGroup.mutate({
  instanceId: "uuid",
  groupId: "uuid",
  templateId: "uuid",
  customVariables: {
    eventDate: "2025-12-15"
  }
});
```

**Response:**
```typescript
{
  success: true,
  queued: 25,
  total: 25,
  groupName: "VIP Customers"
}
```

### 3. Send with Template

Send to single contact using template.

```typescript
await trpc.whatsapp.sendWithTemplate.mutate({
  instanceId: "uuid",
  contactId: "uuid",
  templateId: "uuid",
  customVariables: {
    orderNumber: "12345"
  }
});
```

**Response:**
```typescript
{
  success: true,
  messageId: "msg_123",
  processedMessage: "Hello John! Your order #12345 is ready."
}
```

### 4. Start Campaign

Execute a campaign (queues messages to all recipients).

```typescript
await trpc.campaigns.start.mutate({
  id: "campaign-uuid"
});
```

**Response:**
```typescript
{
  campaign: {...},
  queuedMessages: 100,
  totalRecipients: 100
}
```

---

## Queue Worker

### Starting the Worker

```typescript
import { startWhatsAppWorker } from "@repo/queue";

await startWhatsAppWorker();
```

### Worker Behavior

1. **Processes messages** from queue
2. **Sends via WhatsApp SDK**
3. **Updates campaign status** (sent/failed)
4. **Tracks delivery** statistics
5. **Retries on failure** (max 3 times)

### Environment Variables

```bash
WHATSAPP_SERVER_URL=http://localhost:21465
WHATSAPP_SERVER_SECRET=your-secret-key
RABBITMQ_URL=amqp://admin:admin@localhost:5672
```

---

## Usage Examples

### Example 1: Welcome Message Campaign

```typescript
// 1. Create template
const template = await trpc.messageTemplates.create.mutate({
  tenantId,
  name: "Welcome Message",
  content: "Welcome {{firstName}}! Thanks for joining {{companyName}}. Use code {{welcomeCode}} for 10% off.",
  variables: ["firstName", "companyName", "welcomeCode"]
});

// 2. Send to new customers
await trpc.whatsapp.sendBulkToContacts.mutate({
  instanceId,
  contactIds: newCustomerIds,
  templateId: template.id,
  customVariables: {
    companyName: "Acme Corp",
    welcomeCode: "WELCOME10"
  }
});
```

### Example 2: Event Reminder

```typescript
// 1. Get event group
const group = await trpc.groups.getById.query({ id: eventGroupId });

// 2. Send reminder
await trpc.whatsapp.sendBulkToGroup.mutate({
  instanceId,
  groupId: group.id,
  message: "Reminder: {{firstName}}, our event is tomorrow at 3 PM. See you there!"
});
```

### Example 3: Order Status Update

```typescript
// For each completed order
for (const order of completedOrders) {
  await trpc.whatsapp.sendWithTemplate.mutate({
    instanceId,
    contactId: order.contactId,
    templateId: orderCompleteTemplateId,
    customVariables: {
      orderNumber: order.number,
      trackingLink: order.trackingUrl
    }
  });
}
```

---

## Campaign Workflow

### 1. Create Campaign

```typescript
const campaign = await trpc.campaigns.create.mutate({
  tenantId,
  whatsappInstanceId: instanceId,
  name: "Black Friday Sale",
  message: "{{firstName}}, don't miss our Black Friday sale!",
  messageTemplateId: templateId
});
```

### 2. Add Recipients

```typescript
// Add from contacts
await trpc.campaigns.addRecipients.mutate({
  campaignId: campaign.id,
  contactIds: [...]
});

// OR add from group
await trpc.campaigns.addRecipientsFromGroup.mutate({
  campaignId: campaign.id,
  groupId: "uuid"
});
```

### 3. Start Campaign

```typescript
const result = await trpc.campaigns.start.mutate({
  id: campaign.id
});

console.log(`Queued ${result.queuedMessages} messages`);
```

### 4. Monitor Progress

```typescript
const status = await trpc.campaigns.getById.query({
  id: campaign.id
});

console.log({
  total: status.totalRecipients,
  sent: status.sentCount,
  failed: status.failedCount,
  status: status.status // running, completed, cancelled
});
```

---

## Subscription Usage Tracking

All bulk messages track usage automatically:

```typescript
// Check limits before sending
const usage = await trpc.subscriptions.checkUsageLimit.query({
  tenantId,
  featureKey: "messages_sent"
});

if (!usage.allowed) {
  console.log(`Limit exceeded: ${usage.current}/${usage.limit}`);
  return;
}

// Send messages (usage tracked automatically)
await trpc.whatsapp.sendBulkToContacts.mutate({...});
```

---

## Error Handling

### Failed Messages

- **Automatic retries**: 3 attempts with 5-second delay
- **Status tracking**: Updates recipient status to "failed"
- **Error logging**: Stores error message in database

### Usage Limits

```typescript
try {
  await trpc.whatsapp.sendBulkToContacts.mutate({...});
} catch (error) {
  if (error.code === 'FORBIDDEN') {
    console.error('Subscription limit exceeded');
  }
}
```

---

## Best Practices

### 1. Template Design
- Keep messages concise
- Test variable replacement
- Include opt-out instructions
- Personalize with contact name

### 2. Bulk Sending
- Use queues for large batches (>10 messages)
- Monitor campaign progress
- Set appropriate rate limits
- Handle timezone differences

### 3. Error Recovery
- Review failed messages regularly
- Retry manually if needed
- Update contact information
- Monitor queue health

### 4. Performance
- Batch operations when possible
- Use templates for consistency
- Monitor queue length
- Scale workers as needed

---

## Monitoring

### Queue Status

```bash
# Check RabbitMQ management
http://localhost:15672

# Queue stats
- Messages in queue
- Processing rate
- Error rate
```

### Campaign Analytics

```typescript
const stats = await trpc.campaigns.getStats.query({
  tenantId,
  startDate,
  endDate
});

console.log({
  totalCampaigns: stats.total,
  messagesSent: stats.sent,
  successRate: (stats.sent / stats.total) * 100
});
```

---

## Troubleshooting

### Messages Not Sending

1. ✓ Check WhatsApp instance is connected
2. ✓ Verify queue worker is running
3. ✓ Check subscription limits
4. ✓ Review error logs

### Template Variables Not Replaced

1. ✓ Verify template syntax
2. ✓ Check variable names match
3. ✓ Ensure contact data exists
4. ✓ Test with sample data

### High Failure Rate

1. ✓ Verify phone number format
2. ✓ Check WhatsApp server status
3. ✓ Review rate limits
4. ✓ Validate instance token

---

## Migration from Direct Sending

### Before (Direct)
```typescript
for (const contact of contacts) {
  await client.messages.sendMessage({
    phone: contact.phone,
    message: `Hello ${contact.name}`
  });
}
```

### After (Queue-based)
```typescript
await trpc.whatsapp.sendBulkToContacts.mutate({
  instanceId,
  contactIds: contacts.map(c => c.id),
  message: "Hello {{name}}"
});
```

**Benefits:**
- ✅ Async processing
- ✅ Automatic retries
- ✅ Usage tracking
- ✅ Better error handling
- ✅ Campaign analytics

---

## Support

For issues or questions:
1. Check queue worker logs
2. Review campaign status
3. Monitor subscription usage
4. Test with single message first

## Next Steps

1. ✓ Start WhatsApp worker
2. ✓ Create message templates
3. ✓ Test with small batch
4. ✓ Monitor first campaign
5. ✓ Scale as needed

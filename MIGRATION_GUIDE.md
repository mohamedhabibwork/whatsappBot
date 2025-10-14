# Database Migration Guide

## New Schemas Added

This migration adds the following database schemas for WhatsApp bot functionality:

### 1. **Contacts** (`contacts`)
- Simple contact management with phone numbers
- Tenant-scoped
- Fields: `id`, `tenantId`, `phoneNumber`, `name`, `isActive`, timestamps

### 2. **Groups** (`groups`)
- Contact grouping for campaign management
- Tenant-scoped
- Fields: `id`, `tenantId`, `name`, `description`, `isActive`, timestamps

### 3. **Group Contacts** (`group_contacts`)
- Many-to-many relationship between groups and contacts
- Fields: `groupId`, `contactId`, `createdAt`

### 4. **Message Templates** (`message_templates`)
- Reusable message templates with variable support
- Tenant-scoped
- Fields: `id`, `tenantId`, `name`, `content`, `variables`, `isActive`, timestamps

### 5. **Campaigns** (`campaigns`)
- Bulk messaging campaigns
- Linked to WhatsApp instances and message templates
- Tracks campaign status and statistics
- Fields: `id`, `tenantId`, `whatsappInstanceId`, `messageTemplateId`, `name`, `message`, `status`, `scheduledAt`, `startedAt`, `completedAt`, `totalRecipients`, `sentCount`, `failedCount`, timestamps

### 6. **Campaign Recipients** (`campaign_recipients`)
- Individual recipient tracking for campaigns
- Links campaigns to contacts
- Tracks delivery status per recipient
- Fields: `id`, `campaignId`, `contactId`, `status`, `sentAt`, `deliveredAt`, `readAt`, `failedAt`, `errorMessage`, `messageData`, timestamps

### 7. **Messages History** (`messages_history`)
- Complete message history tracking
- Supports inbound and outbound messages
- Tenant-scoped with WhatsApp instance linking
- Fields: `id`, `tenantId`, `whatsappInstanceId`, `contactId`, `messageId`, `chatId`, `direction`, `type`, `content`, `metadata`, `status`, `sentAt`, `deliveredAt`, `readAt`, `createdAt`

### 8. **Webhooks** (`webhooks`)
- Webhook configuration for external integrations
- Event-based triggering
- Secure with secret tokens
- Tenant-scoped
- Fields: `id`, `tenantId`, `name`, `url`, `events`, `secret`, `isActive`, timestamps

### 9. **Webhook Logs** (`webhook_logs`)
- Webhook execution history
- Tracks success/failure and retry attempts
- Fields: `id`, `webhookId`, `event`, `payload`, `response`, `statusCode`, `success`, `errorMessage`, `attemptCount`, `createdAt`, `completedAt`

## Running the Migration

1. **Generate the migration:**
   ```bash
   cd packages/database
   bun run db:generate
   ```

2. **Review the generated SQL migration** in `packages/database/drizzle/` directory

3. **Apply the migration:**
   ```bash
   bun run db:migrate
   ```

4. **Verify the migration:**
   ```bash
   bun run db:studio
   ```

## tRPC API Endpoints

All new routers are available under the following namespaces:

- `trpc.contacts.*` - Contact management
- `trpc.groups.*` - Group management
- `trpc.messageTemplates.*` - Message template management
- `trpc.campaigns.*` - Campaign management
- `trpc.webhooks.*` - Webhook management
- `trpc.messagesHistory.*` - Message history queries

### Example Usage:

```typescript
// Create a contact
const contact = await trpc.contacts.create.mutate({
  tenantId: "tenant-uuid",
  phoneNumber: "+1234567890",
  name: "John Doe"
});

// Create a group
const group = await trpc.groups.create.mutate({
  tenantId: "tenant-uuid",
  name: "Marketing List",
  description: "Q1 Marketing Campaign"
});

// Add contacts to group
await trpc.groups.addContacts.mutate({
  groupId: group.group.id,
  contactIds: [contact.contact.id]
});

// Create a campaign
const campaign = await trpc.campaigns.create.mutate({
  tenantId: "tenant-uuid",
  whatsappInstanceId: "instance-uuid",
  name: "Q1 Promotion",
  message: "Hello! Check out our new offers!",
  recipientType: "groups",
  recipientIds: [group.group.id]
});

// Start the campaign
await trpc.campaigns.start.mutate({
  id: campaign.campaign.id
});
```

## WebSocket Events

Real-time events are emitted for all CRUD operations:

### Contact Events
- `contact_created`
- `contact_updated`
- `contact_deleted`

### Group Events
- `group_created`
- `group_updated`
- `group_deleted`

### Campaign Events
- `campaign_created`
- `campaign_updated`
- `campaign_deleted`
- `campaign_status_changed`

### Template Events
- `template_created`
- `template_updated`
- `template_deleted`

### Webhook Events
- `webhook_created`
- `webhook_updated`
- `webhook_deleted`
- `webhook_triggered`

## Notes

- All schemas follow the existing multi-tenant pattern
- Soft deletes are implemented using `deletedAt` timestamp
- All foreign keys have proper cascade delete behavior
- Contact names are NOT translated (as per requirements)
- No enums in database - status values are stored as text
- All schemas are strongly typed with TypeScript inference
- WebSocket integration is ready for real-time updates

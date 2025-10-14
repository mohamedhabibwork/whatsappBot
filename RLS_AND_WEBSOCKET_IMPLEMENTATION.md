# Row-Level Security (RLS) and WebSocket Events Implementation

## Overview

This document describes the implementation of Row-Level Security (RLS) policies and real-time WebSocket events for the WhatsApp bot platform.

## Row-Level Security (RLS)

### What is RLS?

Row-Level Security (RLS) is a PostgreSQL feature that restricts which rows users can access in database tables. It provides an additional layer of security at the database level, ensuring tenant isolation.

### Implementation

All tenant-related schemas now include RLS policies using Drizzle ORM's `pgPolicy` API:

#### Schemas with RLS Enabled

1. **contacts** - Contact management
2. **groups** - Group management
3. **message_templates** - Message templates
4. **campaigns** - Campaign management
5. **webhooks** - Webhook configurations
6. **messages_history** - Message history tracking

### Policy Configuration

Each schema includes a tenant isolation policy:

```typescript
pgPolicy("tenant_isolation_policy", {
  for: "all",
  to: "public",
  using: sql`tenant_id = current_setting('app.current_tenant_id')::uuid`,
})
```

**Policy Details:**
- **Name:** `tenant_isolation_policy`
- **Applies to:** All operations (SELECT, INSERT, UPDATE, DELETE)
- **Target:** Public role
- **Condition:** Rows are only accessible if their `tenant_id` matches the current session's tenant ID

### Setting Tenant Context

Before executing queries, you must set the tenant context in your database session:

```sql
SET app.current_tenant_id = 'your-tenant-uuid';
```

In application code (example):

```typescript
// Set tenant context before queries
await db.execute(sql`SET app.current_tenant_id = ${tenantId}`);

// Now queries will only return/affect rows for this tenant
const contacts = await db.select().from(contacts);
```

### Benefits

1. **Defense in Depth:** Even if application logic fails, database enforces tenant isolation
2. **Automatic Filtering:** No need to add `WHERE tenant_id = ?` to every query
3. **Security:** Prevents accidental cross-tenant data access
4. **Compliance:** Helps meet data isolation requirements

### Migration Considerations

When you run migrations, the RLS policies will be created automatically. Ensure:

1. Your database user has permission to create policies
2. Test with different tenant contexts to verify isolation
3. Update your connection/session management to set `app.current_tenant_id`

## WebSocket Events

### Overview

Real-time WebSocket events are now emitted for all CRUD operations on tenant-related entities. This enables live updates across connected clients.

### Event Types

#### Contact Events
- `contact_created` - New contact added
- `contact_updated` - Contact modified
- `contact_deleted` - Contact removed

#### Group Events
- `group_created` - New group created
- `group_updated` - Group modified
- `group_deleted` - Group removed

#### Campaign Events
- `campaign_created` - New campaign created
- `campaign_updated` - Campaign modified
- `campaign_deleted` - Campaign removed
- `campaign_status_changed` - Campaign status changed (draft → running → completed)

#### Template Events
- `template_created` - New message template created
- `template_updated` - Template modified
- `template_deleted` - Template removed

#### Webhook Events
- `webhook_created` - New webhook created
- `webhook_updated` - Webhook modified
- `webhook_deleted` - Webhook removed
- `webhook_triggered` - Webhook executed

### Event Payload Structure

All events follow this structure:

```typescript
{
  type: "contact_created",
  payload: {
    contactId: "uuid",
    tenantId: "uuid",
    phoneNumber: "+1234567890",
    name: "John Doe"
  },
  timestamp: "2025-01-15T00:00:00.000Z",
  language: "en"
}
```

### Implementation Details

#### 1. WebSocket Event Emitters

Located in `packages/trpc/src/utils/websocket-events.ts`:

```typescript
// Emit contact event
emitContactEvent("contact_created", contactId, tenantId, {
  phoneNumber: "+1234567890",
  name: "John Doe"
});

// Emit campaign status change
emitCampaignEvent("campaign_status_changed", campaignId, tenantId, {
  status: "running",
  previousStatus: "draft"
});
```

#### 2. tRPC Router Integration

All mutation operations in tRPC routers emit WebSocket events:

**Example - Contact Creation:**
```typescript
const [newContact] = await ctx.db
  .insert(contacts)
  .values({ ... })
  .returning();

// Emit WebSocket event
emitContactEvent("contact_created", newContact.id, newContact.tenantId, {
  phoneNumber: newContact.phoneNumber,
  name: newContact.name,
});
```

#### 3. Server Configuration

The API server connects the WebSocket broadcast function in `apps/api/src/index.ts`:

```typescript
setBroadcastFunction((type: string, payload: any, language?: Language) => {
  wsManager.broadcast({
    type: type as any,
    payload,
    timestamp: new Date().toISOString(),
    language,
  });
});
```

### Client Usage

#### Connecting to WebSocket

```typescript
const ws = new WebSocket('ws://localhost:3001/ws?token=YOUR_JWT_TOKEN&language=en');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'contact_created':
      console.log('New contact:', message.payload);
      // Update UI
      break;
      
    case 'campaign_status_changed':
      console.log('Campaign status:', message.payload.status);
      // Update campaign status in UI
      break;
  }
};
```

#### Subscribing to Specific Channels (Optional)

```typescript
// Subscribe to tenant-specific events
ws.send(JSON.stringify({
  type: 'subscribe',
  payload: { channel: `tenant:${tenantId}` }
}));
```

### Event Flow

1. **User Action** → tRPC mutation called
2. **Database Update** → Data modified in PostgreSQL
3. **Event Emission** → `emitXxxEvent()` called
4. **Broadcast** → WebSocket manager broadcasts to all connected clients
5. **Client Update** → Frontend receives event and updates UI

### Benefits

1. **Real-time Updates:** Users see changes immediately without polling
2. **Multi-user Collaboration:** Changes from one user appear instantly for others
3. **Reduced Server Load:** No need for constant polling
4. **Better UX:** Instant feedback and live data synchronization

## Testing

### Testing RLS

```sql
-- Set tenant context
SET app.current_tenant_id = 'tenant-1-uuid';

-- This should only return contacts for tenant-1
SELECT * FROM contacts;

-- Change tenant context
SET app.current_tenant_id = 'tenant-2-uuid';

-- This should only return contacts for tenant-2
SELECT * FROM contacts;
```

### Testing WebSocket Events

1. Open two browser tabs with the application
2. Connect both to WebSocket
3. Create a contact in tab 1
4. Verify tab 2 receives `contact_created` event
5. Verify the contact appears in tab 2's UI

## Security Considerations

### RLS Security

1. **Always set tenant context** before queries
2. **Validate tenant access** in application layer (defense in depth)
3. **Use prepared statements** to prevent SQL injection
4. **Audit RLS policies** regularly

### WebSocket Security

1. **Authenticate connections** using JWT tokens
2. **Validate tenant membership** before broadcasting
3. **Rate limit** WebSocket connections
4. **Sanitize payloads** before broadcasting

## Performance Considerations

### RLS Performance

- RLS policies add a small overhead to queries
- Ensure `tenant_id` columns are indexed
- Use connection pooling with tenant context

### WebSocket Performance

- Events are broadcast to all connected clients
- Consider implementing channel-based subscriptions for large deployments
- Monitor WebSocket connection count
- Implement reconnection logic in clients

## Troubleshooting

### RLS Issues

**Problem:** Queries return no results
- **Solution:** Verify `app.current_tenant_id` is set correctly

**Problem:** Cross-tenant data visible
- **Solution:** Check if RLS is enabled: `SELECT * FROM pg_policies WHERE tablename = 'contacts';`

### WebSocket Issues

**Problem:** Events not received
- **Solution:** Check WebSocket connection status and authentication

**Problem:** Duplicate events
- **Solution:** Verify client isn't creating multiple WebSocket connections

## Next Steps

1. **Run migrations** to apply RLS policies
2. **Update connection logic** to set tenant context
3. **Test RLS** with multiple tenants
4. **Implement WebSocket** client-side handlers
5. **Monitor performance** and optimize as needed

## Additional Resources

- [Drizzle ORM RLS Documentation](https://orm.drizzle.team/docs/rls)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

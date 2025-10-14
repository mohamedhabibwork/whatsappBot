# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Run Database Migrations

```bash
cd packages/database
bun run db:generate
bun run db:migrate
```

This will:
- Create all new tables (contacts, groups, campaigns, etc.)
- Apply Row-Level Security policies
- Set up indexes

### Step 2: Start the Server

```bash
# From project root
bun install
bun run dev
```

The API will be available at:
- HTTP: `http://localhost:3001`
- WebSocket: `ws://localhost:3001/ws`
- tRPC: `http://localhost:3001/api/trpc`

### Step 3: Test the API

#### Create a Contact

```bash
curl -X POST http://localhost:3001/api/trpc/contacts.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-ID: YOUR_TENANT_ID" \
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "phoneNumber": "+1234567890",
    "name": "John Doe"
  }'
```

#### List Contacts

```bash
curl http://localhost:3001/api/trpc/contacts.list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-ID: YOUR_TENANT_ID"
```

#### Check Performance Stats

```bash
curl http://localhost:3001/api/performance/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 4: Connect WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3001/ws?token=YOUR_JWT_TOKEN&language=en');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message.type, message.payload);
  
  // Handle events
  switch (message.type) {
    case 'contact_created':
      console.log('New contact:', message.payload);
      break;
    case 'campaign_status_changed':
      console.log('Campaign status:', message.payload.status);
      break;
  }
};
```

## 📝 Common Operations

### Create a Campaign

```typescript
// 1. Create contacts
const contact1 = await trpc.contacts.create.mutate({
  tenantId: "YOUR_TENANT_ID",
  phoneNumber: "+1111111111",
  name: "Alice"
});

// 2. Create a group
const group = await trpc.groups.create.mutate({
  tenantId: "YOUR_TENANT_ID",
  name: "VIP Customers"
});

// 3. Add contacts to group
await trpc.groups.addContacts.mutate({
  groupId: group.group.id,
  contactIds: [contact1.contact.id]
});

// 4. Create campaign
const campaign = await trpc.campaigns.create.mutate({
  tenantId: "YOUR_TENANT_ID",
  whatsappInstanceId: "YOUR_INSTANCE_ID",
  name: "New Year Sale",
  message: "Happy New Year! Get 50% off!",
  recipientType: "groups",
  recipientIds: [group.group.id]
});

// 5. Start campaign
await trpc.campaigns.start.mutate({
  id: campaign.campaign.id
});
```

### Create a Message Template

```typescript
const template = await trpc.messageTemplates.create.mutate({
  tenantId: "YOUR_TENANT_ID",
  name: "Welcome Message",
  content: "Hello {{name}}, welcome to {{company}}!",
  variables: ["name", "company"]
});
```

### Set Up a Webhook

```typescript
const webhook = await trpc.webhooks.create.mutate({
  tenantId: "YOUR_TENANT_ID",
  name: "Campaign Notifications",
  url: "https://your-domain.com/webhook",
  events: ["campaign_created", "campaign_status_changed"]
});

console.log('Webhook secret:', webhook.webhook.secret);
```

## 🔍 Monitoring

### View Performance Stats

```bash
curl http://localhost:3001/api/performance/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

Output:
```json
{
  "database": {
    "totalQueries": 156,
    "averageDuration": 23.45,
    "slowQueriesCount": 2,
    "slowQueries": [...],
    "queriesByTenant": {
      "tenant-1": 100,
      "tenant-2": 56
    }
  },
  "uptime": 3600,
  "memory": {
    "used": 128,
    "total": 256,
    "rss": 512
  }
}
```

### Check WebSocket Stats

```bash
curl http://localhost:3001/api/ws/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🧪 Testing RLS

```sql
-- Connect to database
psql $DATABASE_URL

-- Set tenant context
SET app.current_tenant_id = 'tenant-1-uuid';

-- Query should only return tenant-1 data
SELECT * FROM contacts;

-- Change tenant
SET app.current_tenant_id = 'tenant-2-uuid';

-- Query should only return tenant-2 data
SELECT * FROM contacts;
```

## 🐛 Troubleshooting

### Issue: No data returned

**Check tenant context:**
```typescript
import { getCurrentTenantContext } from '@repo/database';
const current = await getCurrentTenantContext(db);
console.log('Current tenant:', current);
```

**Verify user has access:**
```typescript
const userTenants = await trpc.tenants.list.query();
console.log('User tenants:', userTenants);
```

### Issue: WebSocket not connecting

**Check connection:**
```javascript
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  console.log('WebSocket closed:', event.code, event.reason);
};
```

### Issue: Slow queries

**Check performance stats:**
```bash
curl http://localhost:3001/api/performance/stats \
  -H "Authorization: Bearer TOKEN" | jq '.database.slowQueries'
```

**Add indexes:**
```sql
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_phone ON contacts(phone_number);
```

## 📚 Next Steps

1. ✅ Server running
2. ✅ Database migrated
3. ✅ API tested
4. 🔄 Create your first tenant
5. 🔄 Add contacts and groups
6. 🔄 Create a campaign
7. 🔄 Monitor performance
8. 🔄 Set up webhooks
9. 🔄 Implement frontend
10. 🔄 Deploy to production

## 🔗 Useful Links

- **API Documentation:** See `QUICK_REFERENCE.md`
- **RLS Guide:** See `RLS_AND_WEBSOCKET_IMPLEMENTATION.md`
- **Performance Guide:** See `TENANT_CONTEXT_AND_PERFORMANCE.md`
- **Migration Guide:** See `MIGRATION_GUIDE.md`

## 💡 Tips

1. **Always set tenant context** via header or query param
2. **Monitor slow queries** regularly
3. **Use WebSocket** for real-time updates
4. **Check performance stats** to optimize
5. **Test RLS** with multiple tenants
6. **Add indexes** for frequently queried columns
7. **Use pagination** for large datasets
8. **Cache frequently** accessed data

---

**You're all set!** 🎉

The system is ready to use. Start creating contacts, groups, and campaigns!

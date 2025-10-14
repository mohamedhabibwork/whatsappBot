# Tenant Context and Performance Monitoring Implementation

## Overview

This document describes the implementation of automatic tenant context setting for Row-Level Security (RLS) and comprehensive performance monitoring.

## Tenant Context Management

### Automatic Tenant Context Setting

The system now automatically sets the PostgreSQL tenant context (`app.current_tenant_id`) for all tRPC requests, enabling Row-Level Security policies to work seamlessly.

### How It Works

1. **Request Flow:**
   ```
   Client Request → Auth Middleware → Extract Tenant ID → tRPC Context → Set RLS Context → Execute Query
   ```

2. **Tenant ID Resolution Priority:**
   - `X-Tenant-ID` header (highest priority)
   - `tenantId` query parameter
   - User's default tenant (first tenant in user_tenant_roles)

3. **Automatic RLS Activation:**
   - When `tenantId` is present in context, `SET LOCAL app.current_tenant_id` is executed
   - All subsequent queries in that request are automatically filtered by tenant
   - Context is cleared after request completion

### Usage Examples

#### Client-Side: Setting Tenant Context

**Option 1: Using Header (Recommended)**
```typescript
const response = await fetch('/api/trpc/contacts.list', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'X-Tenant-ID': 'tenant-uuid-here'
  }
});
```

**Option 2: Using Query Parameter**
```typescript
const response = await fetch('/api/trpc/contacts.list?tenantId=tenant-uuid-here', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

**Option 3: Using tRPC Client**
```typescript
import { trpc } from './trpc-client';

// Set tenant ID in headers
const client = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
      headers: () => ({
        'Authorization': `Bearer ${getToken()}`,
        'X-Tenant-ID': getCurrentTenantId(),
      }),
    }),
  ],
});

// Now all queries are automatically scoped to the tenant
const contacts = await client.contacts.list.query({
  limit: 50,
  offset: 0,
});
```

#### Server-Side: Manual Tenant Context

For non-tRPC operations, you can manually set tenant context:

```typescript
import { db, setTenantContext, withTenantContext } from '@repo/database';

// Option 1: Set context manually
await setTenantContext(db, tenantId);
const contacts = await db.select().from(contacts);

// Option 2: Use withTenantContext wrapper
const contacts = await withTenantContext(db, tenantId, async () => {
  return await db.select().from(contacts);
});
```

### Tenant Context Utilities

#### `setTenantContext(db, tenantId)`
Sets the tenant context for the current database session.

```typescript
await setTenantContext(db, 'tenant-uuid');
```

#### `clearTenantContext(db)`
Clears the tenant context.

```typescript
await clearTenantContext(db);
```

#### `getCurrentTenantContext(db)`
Gets the current tenant context (returns null if not set).

```typescript
const currentTenant = await getCurrentTenantContext(db);
console.log('Current tenant:', currentTenant);
```

#### `withTenantContext(db, tenantId, fn)`
Executes a function within a tenant context, automatically cleaning up.

```typescript
const result = await withTenantContext(db, tenantId, async () => {
  // All queries here are scoped to tenantId
  const contacts = await db.select().from(contacts);
  const groups = await db.select().from(groups);
  return { contacts, groups };
});
```

## Performance Monitoring

### Features

1. **Request Performance Tracking**
   - Automatic tracking of all HTTP requests
   - Request duration measurement
   - Slow request detection and logging

2. **Database Query Monitoring**
   - Query execution time tracking
   - Slow query detection (threshold: 1000ms)
   - Per-tenant query statistics

3. **Performance Metrics API**
   - Real-time performance statistics
   - Memory usage monitoring
   - System uptime tracking

### Performance Middleware

The performance middleware is automatically applied to all requests:

```typescript
// Automatically enabled in apps/api/src/index.ts
app.use("*", performanceMiddleware);
```

**Features:**
- Adds `X-Request-ID` header to all responses
- Logs request duration
- Warns about slow requests (>1000ms)
- Tracks performance context

### Database Performance Monitoring

#### Automatic Query Tracking

All database queries are automatically tracked when using the standard `db` instance:

```typescript
import { db } from '@repo/database';

// This query is automatically tracked
const contacts = await db.select().from(contacts);
// Performance metrics are recorded automatically
```

#### Manual Query Measurement

For custom operations:

```typescript
import { measureQuery } from '@repo/database';

const result = await measureQuery(
  'custom-operation',
  async () => {
    // Your operation here
    return await someComplexOperation();
  },
  { tenantId: 'tenant-uuid', userId: 'user-uuid' }
);
```

#### Monitored Database Instance

Create a performance-monitored database instance:

```typescript
import { createMonitoredDb } from '@repo/database';

const monitoredDb = createMonitoredDb(db, {
  tenantId: 'tenant-uuid',
  userId: 'user-uuid'
});

// All operations are tracked with context
const contacts = await monitoredDb.select().from(contacts);
```

### Performance Stats API

#### Endpoint: `GET /api/performance/stats`

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "database": {
    "totalQueries": 1523,
    "averageDuration": 45.23,
    "slowQueriesCount": 3,
    "slowQueries": [
      {
        "query": "SELECT * FROM campaigns WHERE ...",
        "duration": 1234.56,
        "timestamp": "2025-01-15T00:00:00.000Z",
        "tenantId": "tenant-uuid"
      }
    ],
    "queriesByTenant": {
      "tenant-1-uuid": 856,
      "tenant-2-uuid": 667
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

#### Usage Example

```typescript
const response = await fetch('http://localhost:3001/api/performance/stats', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

const stats = await response.json();
console.log('Average query duration:', stats.database.averageDuration, 'ms');
console.log('Slow queries:', stats.database.slowQueriesCount);
```

### Performance Monitoring Best Practices

1. **Monitor Slow Queries**
   - Check `/api/performance/stats` regularly
   - Investigate queries taking >1000ms
   - Add indexes where needed

2. **Tenant-Specific Analysis**
   - Review `queriesByTenant` to identify heavy users
   - Optimize queries for high-volume tenants
   - Consider query result caching

3. **Memory Management**
   - Monitor memory usage trends
   - Performance metrics are limited to 1000 entries (prevents memory leaks)
   - Clear metrics periodically if needed

4. **Request Performance**
   - Monitor `X-Request-ID` in logs for debugging
   - Track slow requests (>1000ms)
   - Optimize API endpoints with high latency

### Logging and Alerts

#### Slow Query Logging

Queries exceeding 1000ms are automatically logged:

```
[SLOW QUERY] 1234ms - SELECT * FROM campaigns WHERE ...
{
  tenantId: 'tenant-uuid',
  userId: 'user-uuid',
  duration: 1234
}
```

#### Slow Request Logging

Requests exceeding 1000ms are automatically logged:

```
[SLOW REQUEST] POST /api/trpc/campaigns.create took 1234.56ms
{
  requestId: 'request-uuid',
  duration: 1234.56,
  method: 'POST',
  path: '/api/trpc/campaigns.create',
  status: 200
}
```

### Performance Optimization Tips

1. **Database Indexes**
   ```sql
   -- Ensure tenant_id is indexed on all RLS tables
   CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
   CREATE INDEX idx_campaigns_tenant_id ON campaigns(tenant_id);
   ```

2. **Query Optimization**
   - Use `limit()` and `offset()` for pagination
   - Select only needed columns
   - Use joins efficiently

3. **Caching**
   - Cache frequently accessed data in Redis
   - Use query result caching for read-heavy operations
   - Implement cache invalidation on updates

4. **Connection Pooling**
   - Configure appropriate pool size
   - Monitor connection usage
   - Use connection timeout settings

## Testing

### Testing Tenant Context

```typescript
import { db, setTenantContext, getCurrentTenantContext } from '@repo/database';

// Test setting tenant context
await setTenantContext(db, 'tenant-1');
const current = await getCurrentTenantContext(db);
console.assert(current === 'tenant-1', 'Tenant context should be set');

// Test RLS filtering
const contacts = await db.select().from(contacts);
// Should only return contacts for tenant-1
```

### Testing Performance Monitoring

```typescript
import { performanceMonitor, measureQuery } from '@repo/database';

// Clear metrics
performanceMonitor.clear();

// Execute some queries
await measureQuery('test-query', async () => {
  return await db.select().from(contacts);
});

// Check stats
const stats = performanceMonitor.getStats();
console.log('Total queries:', stats.totalQueries);
console.log('Average duration:', stats.averageDuration);
```

## Troubleshooting

### Issue: Queries return no data

**Possible causes:**
1. Tenant context not set
2. Wrong tenant ID
3. User doesn't have access to tenant

**Solution:**
```typescript
// Check current tenant context
const currentTenant = await getCurrentTenantContext(db);
console.log('Current tenant:', currentTenant);

// Verify user has access
const userTenants = await db
  .select()
  .from(userTenantRoles)
  .where(eq(userTenantRoles.userId, userId));
console.log('User tenants:', userTenants);
```

### Issue: Cross-tenant data visible

**Possible causes:**
1. RLS policies not applied
2. Tenant context not set correctly

**Solution:**
```sql
-- Verify RLS is enabled
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'contacts';

-- Check current setting
SELECT current_setting('app.current_tenant_id', true);
```

### Issue: Performance degradation

**Possible causes:**
1. Missing indexes
2. Slow queries
3. Too many queries per request

**Solution:**
```typescript
// Check performance stats
const stats = await fetch('/api/performance/stats');
const data = await stats.json();

// Identify slow queries
console.log('Slow queries:', data.database.slowQueries);

// Check queries by tenant
console.log('Queries by tenant:', data.database.queriesByTenant);
```

## Environment Variables

```env
# Performance monitoring
SLOW_QUERY_THRESHOLD=1000  # ms
MAX_METRICS_SIZE=1000      # number of metrics to keep

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_bot
```

## Next Steps

1. ✅ Tenant context automatically set for all tRPC requests
2. ✅ Performance monitoring enabled
3. ✅ Stats API available
4. 🔄 Monitor performance metrics regularly
5. 🔄 Optimize slow queries
6. 🔄 Add database indexes as needed
7. 🔄 Implement caching for frequently accessed data
8. 🔄 Set up alerting for performance issues

## Additional Resources

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Performance Optimization Guide](https://www.postgresql.org/docs/current/performance-tips.html)
- [Drizzle ORM Performance](https://orm.drizzle.team/docs/performance)

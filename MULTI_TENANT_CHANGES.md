# Multi-Tenant & Performance Improvements

## Changes Made

### 1. Environment Variables (.env.example)

✅ **Added comprehensive environment configuration:**

- Database, Redis, RabbitMQ settings
- JWT and refresh token secrets
- Mail service configuration (SMTP)
- Application URLs and CORS
- Rate limiting configuration
- Logging settings

### 2. Database Schema Changes

#### **Removed from `users` table:**

- `role` field (moved to many-to-many relationship)

#### **New Tables Added:**

**`tenants` table:**

```typescript
{
  id: uuid(PK);
  name: text;
  slug: text(unique);
  domain: text;
  isActive: boolean;
  settings: jsonb;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**`user_tenant_roles` table (many-to-many):**

```typescript
{
  userId: uuid (FK to users)
  tenantId: uuid (FK to tenants)
  role: text // 'owner', 'admin', 'member', 'viewer'
  createdAt: timestamp
  updatedAt: timestamp
  PRIMARY KEY (userId, tenantId)
}
```

### 3. Required Updates

#### Auth Router (`packages/trpc/src/routers/auth.ts`)

Needs updates to:

- Remove `role` from user creation
- Remove `role` from JWT token generation
- Add tenant creation on registration
- Add user-tenant-role assignment
- Update all queries to remove `role` references

#### Auth Utils (`packages/auth-utils`)

Update JWT payload:

```typescript
export interface JWTPayload {
  userId: string;
  email: string;
  // Remove: role: string;
}
```

#### Context & Middleware

Update to support tenant context:

```typescript
export interface CreateContextOptions {
  userId?: string;
  tenantId?: string;
  // Remove: userRole?: string;
}
```

### 4. Caching Strategy (To Implement)

**User Cache:**

```typescript
// Cache user data for 5 minutes
const cacheKey = `user:${userId}`;
await redisClient.set(cacheKey, JSON.stringify(user), 300);
```

**Tenant Cache:**

```typescript
// Cache tenant data for 1 hour
const cacheKey = `tenant:${tenantId}`;
await redisClient.set(cacheKey, JSON.stringify(tenant), 3600);
```

**User-Tenant-Role Cache:**

```typescript
// Cache user roles in tenant for 10 minutes
const cacheKey = `user:${userId}:tenant:${tenantId}:role`;
await redisClient.set(cacheKey, role, 600);
```

### 5. Queue System (To Implement)

**Email Queue:**

```typescript
// Send emails asynchronously
await emailQueue.add("send-verification", {
  to: email,
  template: "verifyEmail",
  data: { name, verificationUrl },
});
```

**Notification Queue:**

```typescript
// Send WebSocket notifications async
await notificationQueue.add("auth-event", {
  userId,
  event: "login",
  tenantId,
});
```

## Implementation Status

### ✅ Completed:

- .env.example with all variables
- Database schema (tenants, user_tenant_roles)
- Removed role from users table

### 🔄 In Progress:

- Update auth router for multi-tenancy
- Implement caching layer
- Implement queue system

### ⏳ Pending:

- Update middleware for tenant context
- Update tRPC context
- Create tenant management router
- Update frontend to support tenant selection

## Migration Steps

1. **Run database migration:**

```bash
cd packages/database
bun run db:generate
bun run db:migrate
```

2. **Update environment:**

```bash
cp .env.example .env
# Fill in all values
```

3. **Install dependencies (if needed):**

```bash
bun install
```

## API Changes

### Registration Flow (Updated):

```typescript
// Before
register({ email, password, name, language })
// Creates user with default role='user'

// After
register({ email, password, name, language, tenantName? })
// 1. Creates user
// 2. Creates/joins tenant
// 3. Assigns role in user_tenant_roles
```

### Login Response (Updated):

```typescript
// Before
{
  accessToken,
  user: { id, email, name, role }
}

// After
{
  accessToken,
  user: { id, email, name },
  tenants: [
    { id, name, slug, role: 'owner' },
    { id, name, slug, role: 'member' }
  ]
}
```

### Context Usage (Updated):

```typescript
// Before
ctx.userRole === "admin";

// After - check role in specific tenant
const role = await getUserTenantRole(ctx.userId, tenantId);
role === "admin";
```

## Benefits

### Multi-Tenancy:

- ✅ Users can belong to multiple organizations/tenants
- ✅ Different roles per tenant
- ✅ Tenant isolation
- ✅ Flexible permission system

### Performance:

- ✅ Redis caching for frequently accessed data
- ✅ Queue system for async operations
- ✅ Reduced database queries
- ✅ Faster API responses

### Security:

- ✅ Tenant-based data isolation
- ✅ Fine-grained access control
- ✅ Audit trail per tenant
- ✅ Separate JWT secrets

## Next Steps

1. Complete auth router refactoring
2. Implement caching service
3. Implement queue workers
4. Update middleware
5. Create tenant management endpoints
6. Test multi-tenant scenarios

---

**Last Updated:** October 13, 2025

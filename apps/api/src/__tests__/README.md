# API Tests

## Overview

Comprehensive test suite for all tRPC API endpoints using Bun's built-in test runner.

## Test Coverage

### Endpoints Tested

1. **Contacts API** (`contacts.test.ts`)
   - ✅ List contacts
   - ✅ Get contact by ID
   - ✅ Create contact
   - ✅ Update contact
   - ✅ Delete contact
   - ✅ Cross-tenant access prevention
   - ✅ Authentication requirement

2. **Groups API** (`groups.test.ts`)
   - ✅ List groups
   - ✅ Get group by ID with contacts
   - ✅ Create group
   - ✅ Update group
   - ✅ Add contacts to group
   - ✅ Remove contacts from group
   - ✅ Delete group

3. **Campaigns API** (`campaigns.test.ts`)
   - ✅ List campaigns
   - ✅ Create campaign with contacts
   - ✅ Create campaign with groups
   - ✅ Get campaign by ID with recipients
   - ✅ Update campaign
   - ✅ Start campaign
   - ✅ Cancel campaign
   - ✅ Delete campaign
   - ✅ Prevent deletion of running campaign

4. **Message Templates API** (`message-templates.test.ts`)
   - ✅ List templates
   - ✅ Get template by ID
   - ✅ Create template
   - ✅ Update template
   - ✅ Delete template

5. **Webhooks API** (`webhooks.test.ts`)
   - ✅ List webhooks
   - ✅ Get webhook by ID
   - ✅ Create webhook
   - ✅ Update webhook
   - ✅ Regenerate secret
   - ✅ Delete webhook
   - ✅ Get webhook logs

## Running Tests

### Prerequisites

1. **Database must be running:**
   ```bash
   # Ensure PostgreSQL is running
   # Ensure DATABASE_URL is set in .env
   ```

2. **Seed the database:**
   ```bash
   cd packages/database
   bun run db:seed
   ```

3. **Start the API server:**
   ```bash
   cd apps/api
   bun run dev
   ```

### Run All Tests

```bash
cd apps/api
bun test
```

### Run Specific Test File

```bash
bun test src/__tests__/contacts.test.ts
```

### Run Tests in Watch Mode

```bash
bun test --watch
```

### Run Tests with Coverage

```bash
bun test --coverage
```

## Test Structure

### Setup (`setup.ts`)

The setup file provides:
- Database seeding before tests
- Test context with seeded data
- Helper functions for authenticated requests
- Cleanup after tests

### Test Context

Each test has access to:
```typescript
{
  users: User[],      // Seeded users
  tenants: Tenant[],  // Seeded tenants
  instances: WhatsAppInstance[],
  contacts: Contact[],
  groups: Group[],
  tokens: {
    admin: string,    // JWT token for admin user
    user1: string,    // JWT token for user1
    user2: string,    // JWT token for user2
  }
}
```

### Making Authenticated Requests

```typescript
import { makeAuthHeaders } from "./setup";

const response = await fetch(url, {
  method: "POST",
  headers: makeAuthHeaders(ctx.tokens.admin, ctx.tenants[0].id),
  body: JSON.stringify(data),
});
```

## Test Data

### Seeded Users

1. **Admin User**
   - Email: `admin@example.com`
   - Password: `Admin123!`
   - Role: Owner of both tenants

2. **Test User 1**
   - Email: `user1@example.com`
   - Password: `User123!`
   - Role: Admin of tenant 1, Member of tenant 2

3. **Test User 2**
   - Email: `user2@example.com`
   - Password: `User123!`
   - Role: Member of tenant 1

### Seeded Tenants

1. **Acme Corporation** (`acme-corp`)
2. **Tech Startup Inc** (`tech-startup`)

### Seeded Data

- 5 contacts across tenants
- 3 groups across tenants
- 2 WhatsApp instances
- 3 message templates
- 2 webhooks

## Writing New Tests

### Template

```typescript
import { describe, it, expect, beforeAll } from "bun:test";
import { setupTests, getTestContext, makeAuthHeaders } from "./setup";

const API_URL = "http://localhost:3001/api/trpc";

beforeAll(async () => {
  await setupTests();
});

describe("Your API", () => {
  it("should do something", async () => {
    const ctx = getTestContext();
    const response = await fetch(`${API_URL}/your.endpoint`, {
      method: "POST",
      headers: makeAuthHeaders(ctx.tokens.admin, ctx.tenants[0].id),
      body: JSON.stringify({ /* your data */ }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.result.data).toBeDefined();
  });
});
```

## Best Practices

1. **Always use seeded data** - Don't hardcode IDs
2. **Clean up after yourself** - Delete resources created in tests
3. **Test error cases** - Not just happy paths
4. **Test permissions** - Verify tenant isolation
5. **Use descriptive test names** - Make failures easy to understand

## Troubleshooting

### Tests Failing

1. **Check server is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check database connection:**
   ```bash
   cd packages/database
   bun run db:studio
   ```

3. **Re-seed database:**
   ```bash
   cd packages/database
   bun run db:seed
   ```

### Common Issues

**Issue: "Connection refused"**
- Solution: Start the API server

**Issue: "No data found"**
- Solution: Run database seeder

**Issue: "Authentication failed"**
- Solution: Check JWT_SECRET in .env matches

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
      
      - run: bun install
      
      - run: cd packages/database && bun run db:migrate
      
      - run: cd packages/database && bun run db:seed
      
      - run: cd apps/api && bun run dev &
      
      - run: sleep 5
      
      - run: cd apps/api && bun test
```

## Performance Testing

For load testing, use tools like:
- [k6](https://k6.io/)
- [Artillery](https://artillery.io/)
- [Apache JMeter](https://jmeter.apache.org/)

Example k6 script:
```javascript
import http from 'k6/http';

export default function () {
  const url = 'http://localhost:3001/api/trpc/contacts.list';
  const payload = JSON.stringify({
    tenantId: 'your-tenant-id',
    limit: 50,
    offset: 0,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN',
      'X-Tenant-ID': 'your-tenant-id',
    },
  };
  
  http.post(url, payload, params);
}
```

## Next Steps

1. Add integration tests for WebSocket events
2. Add E2E tests with real WhatsApp instances
3. Add performance benchmarks
4. Add security penetration tests
5. Add visual regression tests for frontend

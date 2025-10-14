# Testing Guide

## Overview

This guide covers testing for the WhatsApp Bot platform, including database seeding, API endpoint testing, and best practices.

## Quick Start

### 1. Seed the Database

```bash
cd packages/database
bun run db:seed
```

This will create:
- 3 test users (admin, user1, user2)
- 2 tenants (Acme Corp, Tech Startup)
- 5 contacts
- 3 groups
- 2 WhatsApp instances
- 3 message templates
- 2 webhooks

**Note:** The seeder checks if data exists before creating, so it's safe to run multiple times.

### 2. Start the API Server

```bash
cd apps/api
bun run dev
```

### 3. Run Tests

```bash
cd apps/api
bun test
```

## Database Seeding

### Manual Seeding

```bash
cd packages/database
bun run db:seed
```

### Programmatic Seeding

```typescript
import { seedDatabase } from "@repo/database";

// Seed with verbose output
await seedDatabase({ verbose: true });

// Seed silently
await seedDatabase({ verbose: false });
```

### Seeded Data

#### Users
| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin123! | Owner (both tenants) |
| user1@example.com | User123! | Admin (tenant 1), Member (tenant 2) |
| user2@example.com | User123! | Member (tenant 1) |

#### Tenants
1. **Acme Corporation** (slug: `acme-corp`)
2. **Tech Startup Inc** (slug: `tech-startup`)

#### Contacts
- 3 contacts for Acme Corp
- 2 contacts for Tech Startup

#### Groups
- 2 groups for Acme Corp
- 1 group for Tech Startup

## API Testing

### Test Structure

```
apps/api/src/__tests__/
├── setup.ts                    # Test utilities and setup
├── contacts.test.ts            # Contact API tests
├── groups.test.ts              # Group API tests
├── campaigns.test.ts           # Campaign API tests
├── message-templates.test.ts   # Template API tests
├── webhooks.test.ts            # Webhook API tests
└── README.md                   # Test documentation
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/__tests__/contacts.test.ts

# Watch mode
bun test --watch

# With coverage
bun test --coverage
```

### Test Coverage

#### Contacts API (7 tests)
- ✅ List contacts
- ✅ Get contact by ID
- ✅ Create contact
- ✅ Update contact
- ✅ Delete contact
- ✅ Cross-tenant access prevention
- ✅ Authentication requirement

#### Groups API (7 tests)
- ✅ List groups
- ✅ Get group with contacts
- ✅ Create group
- ✅ Update group
- ✅ Add contacts to group
- ✅ Remove contacts from group
- ✅ Delete group

#### Campaigns API (10 tests)
- ✅ List campaigns
- ✅ Create with contacts
- ✅ Create with groups
- ✅ Get campaign with recipients
- ✅ Update campaign
- ✅ Start campaign
- ✅ Cancel campaign
- ✅ Delete campaign
- ✅ Prevent deletion of running campaign

#### Message Templates API (5 tests)
- ✅ List templates
- ✅ Get template by ID
- ✅ Create template
- ✅ Update template
- ✅ Delete template

#### Webhooks API (8 tests)
- ✅ List webhooks
- ✅ Get webhook by ID
- ✅ Create webhook
- ✅ Update webhook
- ✅ Regenerate secret
- ✅ Delete webhook
- ✅ Get webhook logs

**Total: 37 test cases**

### Writing Tests

Example test:

```typescript
import { describe, it, expect, beforeAll } from "bun:test";
import { setupTests, getTestContext, makeAuthHeaders } from "./setup";

const API_URL = "http://localhost:3001/api/trpc";

beforeAll(async () => {
  await setupTests();
});

describe("Your Feature", () => {
  it("should work correctly", async () => {
    const ctx = getTestContext();
    
    const response = await fetch(`${API_URL}/your.endpoint`, {
      method: "POST",
      headers: makeAuthHeaders(ctx.tokens.admin, ctx.tenants[0].id),
      body: JSON.stringify({
        // your data
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.result.data).toBeDefined();
  });
});
```

## Manual Testing

### Using cURL

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
curl -X POST http://localhost:3001/api/trpc/contacts.list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-ID: YOUR_TENANT_ID" \
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "limit": 50,
    "offset": 0
  }'
```

### Using Postman/Insomnia

1. **Import Collection:**
   - Create a new collection
   - Set base URL: `http://localhost:3001/api/trpc`
   - Add environment variables for tokens and tenant IDs

2. **Set Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer {{token}}
   X-Tenant-ID: {{tenantId}}
   ```

3. **Create Requests:**
   - Method: POST
   - Body: JSON with endpoint parameters

## Performance Testing

### Using k6

Install k6:
```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo apt-get install k6
```

Create test script (`load-test.js`):

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10, // 10 virtual users
  duration: '30s', // Run for 30 seconds
};

export default function () {
  const url = 'http://localhost:3001/api/trpc/contacts.list';
  const payload = JSON.stringify({
    tenantId: 'YOUR_TENANT_ID',
    limit: 50,
    offset: 0,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN',
      'X-Tenant-ID': 'YOUR_TENANT_ID',
    },
  };

  const res = http.post(url, payload, params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run test:
```bash
k6 run load-test.js
```

## Integration Testing

### WebSocket Testing

```typescript
const ws = new WebSocket('ws://localhost:3001/ws?token=YOUR_TOKEN&language=en');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
  
  // Assert event types
  if (message.type === 'contact_created') {
    console.log('✓ Contact created event received');
  }
};

// Create a contact and verify WebSocket event
await fetch('http://localhost:3001/api/trpc/contacts.create', {
  method: 'POST',
  headers: makeAuthHeaders(token, tenantId),
  body: JSON.stringify({
    tenantId,
    phoneNumber: '+1234567890',
    name: 'Test'
  }),
});

// Wait for WebSocket event
await new Promise(resolve => setTimeout(resolve, 1000));
```

## Test Data Management

### Reset Database

```bash
# Drop and recreate database
cd packages/database
bun run db:push

# Re-seed
bun run db:seed
```

### Clean Specific Data

```typescript
import { db, contacts } from "@repo/database";
import { eq } from "drizzle-orm";

// Delete test contacts
await db.delete(contacts).where(eq(contacts.name, "Test Contact"));
```

## CI/CD Testing

### GitHub Actions

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
          POSTGRES_DB: whatsapp_bot_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Run migrations
        run: cd packages/database && bun run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test
      
      - name: Seed database
        run: cd packages/database && bun run db:seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test
      
      - name: Start API server
        run: cd apps/api && bun run dev &
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test
          PORT: 3001
      
      - name: Wait for server
        run: sleep 5
      
      - name: Run tests
        run: cd apps/api && bun test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test
```

## Best Practices

1. **Use Seeded Data**
   - Always use data from `getTestContext()`
   - Don't hardcode IDs

2. **Clean Up**
   - Delete resources created in tests
   - Use soft deletes where applicable

3. **Test Isolation**
   - Each test should be independent
   - Don't rely on test execution order

4. **Error Testing**
   - Test both success and failure cases
   - Verify error messages and status codes

5. **Security Testing**
   - Test authentication requirements
   - Test tenant isolation
   - Test permission levels

6. **Performance Testing**
   - Monitor response times
   - Test with realistic data volumes
   - Check for N+1 queries

## Troubleshooting

### Tests Failing

1. **Server not running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Database not seeded:**
   ```bash
   cd packages/database && bun run db:seed
   ```

3. **Wrong environment:**
   - Check `.env` file
   - Verify `DATABASE_URL`
   - Verify `JWT_SECRET`

### Common Errors

**"Connection refused"**
- Start the API server: `bun run dev`

**"No data found"**
- Run seeder: `bun run db:seed`

**"Authentication failed"**
- Check JWT_SECRET matches between test and server

**"Tenant not found"**
- Verify tenant ID from seeded data

## Next Steps

1. ✅ Database seeder created
2. ✅ API tests created
3. 🔄 Run tests and verify
4. 🔄 Add WebSocket integration tests
5. 🔄 Add E2E tests
6. 🔄 Set up CI/CD pipeline
7. 🔄 Add performance benchmarks

---

**Happy Testing!** 🧪

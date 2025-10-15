# tRPC OpenAPI Implementation Guide

## Overview
Complete implementation of OpenAPI/Swagger documentation for the WhatsApp Bot API using trpc-openapi.

## ✅ Completed Work

### 1. Database Schemas (100% Complete)
All database schema files have been updated with comprehensive Zod schemas for OpenAPI compatibility:

- ✅ `payments.ts` - Payment schemas with translations support
- ✅ `contacts.ts` - Contact management schemas
- ✅ `tenants.ts` - Multi-tenant schemas
- ✅ `users.ts` - User management schemas (password excluded from select)
- ✅ `groups.ts` - Group management schemas
- ✅ `campaigns.ts` - Campaign schemas with status enums
- ✅ `invoices.ts` - Invoice schemas with billing address
- ✅ `subscriptions.ts` - Subscription lifecycle schemas
- ✅ `plans.ts` - Plan schemas with translated names/descriptions
- ✅ `message-templates.ts` - Template schemas with variables
- ✅ `webhooks.ts` - Webhook configuration schemas
- ✅ `messages.ts` - Message schemas for WhatsApp integration

Each schema exports:
- `insertXSchema` - For create operations (omits auto-generated fields)
- `selectXSchema` - For read operations (includes all fields with descriptions)
- `updateXSchema` - For update operations (partial of insert schema)

### 2. Router Updates

#### Completed Routers:
- ✅ **contacts.ts** - Full input/output schemas for all procedures
  - list, getById, create, update, delete, bulkDelete, bulkUpdateStatus
  
- ✅ **payments.ts** - Full input/output schemas for all procedures
  - list, getById, create, update, markAsCompleted, markAsFailed, refund, addTranslation, deleteTranslation, completePayment

#### Pattern to Follow for Remaining Routers:

```typescript
import { selectXSchema, insertXSchema } from "@repo/database";

export const xRouter = router({
  list: protectedProcedure
    .input(/* existing input */)
    .output(z.object({ items: z.array(selectXSchema) }))
    .query(/* existing logic */),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ item: selectXSchema }))
    .query(/* existing logic */),

  create: protectedProcedure
    .input(insertXSchema)
    .output(z.object({ item: selectXSchema }))
    .mutation(/* existing logic */),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(insertXSchema.partial()))
    .output(z.object({ item: selectXSchema }))
    .mutation(/* existing logic */),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(/* existing logic */),
});
```

### 3. Dependencies
Added to `packages/database/package.json`:
```json
{
  "dependencies": {
    "drizzle-zod": "^0.5.1",
    "zod": "^3.24.1"
  }
}
```

## 📝 Remaining Work

### Routers Needing Output Schemas:

1. **auth.ts** - Authentication endpoints
   - register, login, verify, refresh, logout, etc.

2. **tenants.ts** - Tenant management
   - list, create, update, delete, invite, etc.

3. **users.ts** - User management
   - list, getById, update, delete, etc.

4. **groups.ts** - Group management
   - list, getById, create, update, delete, addContacts, removeContacts

5. **campaigns.ts** - Campaign management
   - list, getById, create, update, delete, start, stop, etc.

6. **invoices.ts** - Invoice management
   - list, getById, create, update, delete, markAsPaid, etc.

7. **subscriptions.ts** - Subscription management
   - list, getById, create, update, cancel, renew, etc.

8. **plans.ts** - Plan management
   - list, getById, create, update, delete

9. **message-templates.ts** - Template management
   - list, getById, create, update, delete

10. **messages.ts** - Message handling
    - list, getById, send, etc.

11. **messages-history.ts** - Message history
    - list, getById

12. **webhooks.ts** - Webhook management
    - list, getById, create, update, delete, test

13. **whatsapp.ts** - WhatsApp operations
    - getInstance, startSession, sendMessage, etc.

14. **notifications.ts** - Notification management
    - list, getById, markAsRead, etc.

## 🔧 Implementation Checklist

For each router file:

1. [ ] Import necessary select/insert schemas from `@repo/database`
2. [ ] Add `.output()` to all query procedures
3. [ ] Add `.output()` to all mutation procedures
4. [ ] Ensure output schemas match actual return types
5. [ ] Use proper Zod types (avoid `z.any()` where possible)
6. [ ] Test procedures still work correctly

## 🌐 OpenAPI Configuration

The OpenAPI document is configured in `packages/trpc/src/openapi.ts`:

```typescript
export const openApiDocument = generateOpenApiDocument(openApiRouter, {
  title: "WhatsApp Bot API",
  description: "A comprehensive WhatsApp bot API...",
  version: "1.0.0",
  baseUrl: process.env.API_BASE_URL || "http://localhost:3001/api",
  tags: [
    "system", "auth", "users", "tenants", "plans", 
    "subscriptions", "invoices", "payments", "contacts", 
    "groups", "templates", "campaigns", "webhooks", 
    "messages", "notifications", "whatsapp"
  ],
});
```

## 📚 Key Patterns & Best Practices

### 1. Schema Organization
```typescript
// In schema file
export const insertXSchema = createInsertSchema(table, {
  field: z.string().describe("Field description"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectXSchema = createSelectSchema(table, {
  field: z.string().describe("Field description"),
});

export const updateXSchema = insertXSchema.partial();
```

### 2. Router Procedures
```typescript
// Query with output
.query: protectedProcedure
  .input(/* params */)
  .output(z.object({ data: selectSchema }))
  .query(async ({ ctx, input }) => { /* ... */ })

// Mutation with output
.create: protectedProcedure
  .input(insertSchema)
  .output(z.object({ item: selectSchema }))
  .mutation(async ({ ctx, input }) => { /* ... */ })

// Delete with boolean output
.delete: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ ctx, input }) => { /* ... */ })
```

### 3. Translated Fields
For fields with translations (e.g., plan names):
```typescript
const translatedNameSchema = z.object({
  en: z.string().describe("English name"),
  ar: z.string().describe("Arabic name"),
});
```

### 4. Dates & Timestamps
- Use `z.date()` for date fields
- Add `.describe()` for OpenAPI documentation
- Mark optional dates as `.nullable()`

### 5. Enums
Define status enums explicitly:
```typescript
status: z.enum(["active", "inactive", "pending"]).describe("Status")
```

## 🧪 Testing

After implementation:

1. **Check TypeScript compilation**:
   ```bash
   cd packages/trpc
   bun run tsc --noEmit
   ```

2. **Generate OpenAPI document**:
   ```bash
   bun run generate-openapi
   ```

3. **Verify Swagger UI**:
   - Start API server: `bun run dev`
   - Open: http://localhost:3001/docs
   - Test endpoints via Swagger UI

4. **Test tRPC calls still work**:
   ```bash
   bun test
   ```

## 📄 Generated Documentation

Once complete, the system will generate:
- `openapi.json` - OpenAPI 3.0 specification
- Interactive Swagger UI at `/docs`
- Type-safe tRPC client with full IDE autocomplete

## 🔗 References

- [tRPC Documentation](https://trpc.io/)
- [trpc-openapi Documentation](https://github.com/jlalmes/trpc-openapi)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Drizzle Zod](https://orm.drizzle.team/docs/zod)
- [Zod Documentation](https://zod.dev/)

## 📊 Progress Summary

- Database Schemas: ✅ 12/12 (100%)
- Router Output Schemas: ⏳ 2/17 (12%)
- Total Procedures: ~150+ endpoints

## Next Steps

1. Add output schemas to remaining routers following the pattern
2. Test all endpoints with Swagger UI
3. Update frontend API client to use generated types
4. Add request/response examples to schemas
5. Configure authentication in OpenAPI spec

# tRPC Schemas and Meta Implementation Guide

## Overview
This guide documents the standardization of Input/Output schemas and OpenAPI meta information across all tRPC routers.

## Completed Routers

### ✅ auth.ts
- **All endpoints have**: Input schemas, Output schemas, OpenAPI meta
- **Exported schemas**: 
  - Input: `registerSchema`, `loginSchema`, `verifyEmailSchema`, `resendVerificationSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `changePasswordSchema`, `refreshTokenSchema`, `updateProfileSchema`, `logoutInputSchema`
  - Output: `registerOutputSchema`, `loginOutputSchema`, `verifyEmailOutputSchema`, `resendVerificationOutputSchema`, `forgotPasswordOutputSchema`, `resetPasswordOutputSchema`, `changePasswordOutputSchema`, `refreshTokenOutputSchema`, `meOutputSchema`, `updateProfileOutputSchema`, `logoutOutputSchema`

### ✅ contacts.ts
- **All endpoints have**: Input schemas, Output schemas, OpenAPI meta
- **Exported schemas**:
  - Input: `listContactsInputSchema`, `getContactByIdInputSchema`, `createContactInputSchema`, `updateContactInputSchema`, `deleteContactInputSchema`, `bulkDeleteContactsInputSchema`, `bulkUpdateContactsStatusInputSchema`
  - Output: `listContactsOutputSchema`, `getContactByIdOutputSchema`, `createContactOutputSchema`, `updateContactOutputSchema`, `deleteContactOutputSchema`, `bulkDeleteContactsOutputSchema`, `bulkUpdateContactsStatusOutputSchema`

### ✅ users.ts
- **All endpoints have**: Input schemas, Output schemas, OpenAPI meta
- **Exported schemas**:
  - Input: `listUsersInputSchema`, `updateProfileInputSchema`, `deleteUserInputSchema`
  - Output: `listUsersOutputSchema`, `meOutputSchema`, `updateProfileOutputSchema`, `deleteUserOutputSchema`

## Pattern for Remaining Routers

### Standard Schema Naming Convention

For each endpoint `endpointName`, create:
- **Input Schema**: `{endpointName}InputSchema`
- **Output Schema**: `{endpointName}OutputSchema`

### Meta Structure

```typescript
.meta({
  openapi: {
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: "/resource/path",
    tags: ["resource"],
    summary: "Short description",
    description: "Detailed description",
    protect: true | false, // true for protected endpoints
  },
})
```

### File Structure Template

```typescript
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
// ... other imports

// ============ Input Schemas ============
export const listResourceInputSchema = z.object({
  tenantId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const getResourceByIdInputSchema = z.object({
  id: z.string().uuid(),
});

export const createResourceInputSchema = z.object({
  // ... fields
});

export const updateResourceInputSchema = z.object({
  id: z.string().uuid(),
  // ... fields (optional)
});

export const deleteResourceInputSchema = z.object({
  id: z.string().uuid(),
});

// ============ Output Schemas ============
export const listResourceOutputSchema = z.object({
  resources: z.array(/* resource schema */),
});

export const getResourceByIdOutputSchema = z.object({
  resource: /* resource schema */,
});

export const createResourceOutputSchema = z.object({
  resource: /* resource schema */,
});

export const updateResourceOutputSchema = z.object({
  resource: /* resource schema */,
});

export const deleteResourceOutputSchema = z.object({
  success: z.boolean(),
});

// ============ Router Definition ============
export const resourceRouter = router({
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/resource/list",
        tags: ["resource"],
        summary: "List resources",
        description: "Get paginated list of resources",
        protect: true,
      },
    })
    .input(listResourceInputSchema)
    .output(listResourceOutputSchema)
    .query(async ({ ctx, input }) => {
      // implementation
    }),
    
  getById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/resource/{id}",
        tags: ["resource"],
        summary: "Get resource by ID",
        description: "Get a single resource by ID",
        protect: true,
      },
    })
    .input(getResourceByIdInputSchema)
    .output(getResourceByIdOutputSchema)
    .query(async ({ ctx, input }) => {
      // implementation
    }),
    
  // ... other endpoints
});
```

## Pending Routers

### ⏳ groups.ts
Apply same pattern with group-specific schemas

### ⏳ notifications.ts
Apply same pattern with notification-specific schemas

### ⏳ messages.ts
Apply same pattern with message-specific schemas

### ⏳ message-templates.ts
Apply same pattern with template-specific schemas

### ⏳ messages-history.ts
Apply same pattern with history-specific schemas

### ⏳ campaigns.ts
Apply same pattern with campaign-specific schemas

### ⏳ webhooks.ts
Apply same pattern with webhook-specific schemas

### ⏳ whatsapp.ts
Large file with many endpoints - apply same pattern

### ⏳ invoices.ts
Apply same pattern with invoice-specific schemas

### ⏳ payments.ts
Apply same pattern with payment-specific schemas

### ⏳ plans.ts
Apply same pattern with plan-specific schemas

### ⏳ subscriptions.ts
Apply same pattern with subscription-specific schemas

### ⏳ tenants.ts
Apply same pattern with tenant-specific schemas

## Benefits

1. **Type Safety**: All inputs and outputs are strongly typed
2. **API Documentation**: OpenAPI meta enables automatic Swagger documentation
3. **Consistency**: Standardized naming and structure across all routers
4. **Maintainability**: Easy to find and update schemas
5. **Validation**: Centralized validation logic
6. **Reusability**: Schemas can be imported and reused

## Translation Support

For endpoints with translation support, use:

```typescript
const translatedNameSchema = z.object({
  en: z.string(),
  ar: z.string(),
});

const translatedDescriptionSchema = z.object({
  en: z.string().optional(),
  ar: z.string().optional(),
});
```

## Common HTTP Methods

- `GET`: Query operations (list, get by ID)
- `POST`: Create operations, bulk operations
- `PATCH`: Update operations
- `DELETE`: Delete operations

## Protection Levels

- `protect: false` - Public endpoints (register, login, forgot password)
- `protect: true` - Authenticated user endpoints
- Admin-only endpoints use `adminProcedure` with `protect: true`

## Next Steps

1. Apply this pattern to all pending routers
2. Ensure all schemas are exported
3. Add meta to all endpoints
4. Update API documentation
5. Test all endpoints with Swagger UI

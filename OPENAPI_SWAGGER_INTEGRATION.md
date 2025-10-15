# OpenAPI/Swagger Integration Guide

## Overview

The WhatsApp Bot API has auto-generated Swagger documentation and REST endpoints. The system uses a **separate OpenAPI router** because:

- **tRPC's main router** uses `superjson` transformer (not compatible with trpc-to-openapi)
- **OpenAPI router** uses plain JSON (compatible with REST/Swagger)

Benefits:
1. **Swagger UI documentation** at `http://localhost:3001/api/docs`
2. **REST endpoints** alongside tRPC (e.g., GET `/api/plans`, GET `/api/plans/{id}`)
3. **No conflicts** between tRPC and REST endpoints

## How It Works

### Architecture

```
┌──────────────┐         ┌──────────────┐
│  Main tRPC   │         │   OpenAPI    │
│   Router     │         │    Router    │
│ (superjson)  │         │ (plain JSON) │
└──────┬───────┘         └──────┬───────┘
       │                        │
       v                        v
┌─────────────┐         ┌──────────────┐
│ tRPC Client │         │ REST/OpenAPI │
│  Endpoints  │         │  Endpoints   │
│ /api/trpc/* │         │   /api/*     │
└─────────────┘         └──────┬───────┘
                               │
                      ┌────────v────────┐
                      │ Swagger UI Docs │
                      │   /api/docs     │
                      └─────────────────┘
```

### Files Modified

- **`packages/trpc/src/openapi.ts`**: OpenAPI-compatible router and document generation
- **`apps/api/src/routes/swagger.ts`**: Serves Swagger UI and OpenAPI JSON
- **`apps/api/src/index.ts`**: OpenAPI HTTP handler for REST requests

## Adding REST Endpoints

All REST endpoints are defined in **`packages/trpc/src/openapi.ts`**. This file contains a separate router that doesn't use superjson.

### Basic Example

Open `packages/trpc/src/openapi.ts` and add to the `openApiRouter`:

```typescript
export const openApiRouter = t.router({
  // ... existing endpoints (health, plansList, etc.)
  
  // Add your new endpoint here
  myEndpoint: t.procedure
    .meta({
      openapi: {
        method: "GET",           // HTTP method
        path: "/my-endpoint",    // REST path
        tags: ["myTag"],         // Swagger group
        summary: "Short title",  // List title
        description: "Detailed description",
      },
    })
    .input(z.object({ id: z.string() }))
    .output(z.object({ result: z.string() }))
    .query(async ({ input, ctx }) => {
      // Your logic here
      return { result: "success" };
    }),
});
```

### URL Parameters

For path parameters like `/plans/{id}`, use curly braces:

```typescript
.meta({
  openapi: {
    method: "GET",
    path: "/plans/{id}",  // {id} will be extracted from input
    tags: ["plans"],
    summary: "Get plan by ID",
  },
})
.input(z.object({ id: z.string().uuid() }))
```

### Query Parameters

Query parameters are automatically extracted from the input schema:

```typescript
.meta({
  openapi: {
    method: "GET",
    path: "/plans/list",
    tags: ["plans"],
    summary: "List plans",
  },
})
.input(z.object({
  includeInactive: z.boolean().optional(),  // → ?includeInactive=true
  page: z.number().optional(),              // → ?page=2
}))
```

### POST/PUT with Body

```typescript
.meta({
  openapi: {
    method: "POST",
    path: "/plans",
    tags: ["plans"],
    summary: "Create plan",
    protect: true,  // Requires authentication
  },
})
.input(z.object({
  name: z.string(),
  price: z.string(),
}))
```

### Protected Endpoints

Use `protectedProcedure` or `adminProcedure` and add `protect: true`:

```typescript
export const myRouter = router({
  protectedEndpoint: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/protected",
        tags: ["auth"],
        summary: "Protected endpoint",
        protect: true,  // Shows lock icon in Swagger
      },
    })
    .input(z.void())
    .output(z.object({ data: z.string() }))
    .query(async ({ ctx }) => {
      // ctx.userId is guaranteed to exist
      return { data: "protected data" };
    }),
});
```

## Examples from Current Codebase

Check `packages/trpc/src/openapi.ts` for working examples:

- **Health check**: GET `/api/health`
- **List plans**: GET `/api/plans` (with optional query params: `includeInactive`, `includePrivate`, `includeFeatures`)
- **Get plan by ID**: GET `/api/plans/{id}`

## Accessing the API

### Swagger UI

Visit: `http://localhost:3001/api/docs`

Features:
- Interactive API testing
- Request/response schemas
- Try it out functionality
- Authentication support

### OpenAPI JSON

Visit: `http://localhost:3001/api/docs/openapi.json`

Use this URL for:
- Postman/Insomnia import
- Code generation tools
- API testing frameworks

### REST Endpoints

All OpenAPI-enabled procedures are available as REST endpoints:

```bash
# Example: List plans
curl http://localhost:3001/api/plans/list

# Example: Get plan by ID
curl http://localhost:3001/api/plans/550e8400-e29b-41d4-a716-446655440000

# Example: With authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/protected
```

## Best Practices

### 1. Add OpenAPI to Public Endpoints First

Start with `publicProcedure` endpoints that external consumers might use:
- Health checks
- Public data queries (plans, features)
- Webhook endpoints

### 2. Use Descriptive Summaries

```typescript
// ❌ Bad
summary: "Get data"

// ✅ Good
summary: "Get subscription plan with features by ID"
```

### 3. Group with Tags

```typescript
tags: ["plans"]        // Groups all plan-related endpoints
tags: ["auth"]         // Groups all auth-related endpoints
tags: ["contacts"]     // Groups all contact-related endpoints
```

### 4. Add Output Schemas

Always define `.output()` for better documentation:

```typescript
.output(z.object({
  plans: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.string(),
  })),
}))
```

### 5. HTTP Method Selection

- **GET**: Read data (queries)
- **POST**: Create resources
- **PUT**: Update entire resource
- **PATCH**: Update partial resource
- **DELETE**: Delete resource

## Troubleshooting

### "Unknown procedure type" Error

This error occurs when trying to use the main tRPC router (with superjson) with trpc-to-openapi:

```
error: Unknown procedure type
  at getProcedureType
```

**Solution**: Always add REST endpoints to the **separate `openApiRouter`** in `packages/trpc/src/openapi.ts`, NOT to the main router. The main router uses superjson which is incompatible with trpc-to-openapi.

### Procedure Not Showing in Swagger

1. Check you added it to `openApiRouter` in `packages/trpc/src/openapi.ts`
2. Ensure `.meta({ openapi: {...} })` is present
3. Check that `method` and `path` are defined
4. Verify the procedure has `.input()` and `.output()` defined
5. Restart the dev server

### 401 Unauthorized Errors

For protected endpoints:
1. Click "Authorize" in Swagger UI
2. Enter: `Bearer YOUR_JWT_TOKEN`
3. Click "Authorize" then "Close"

### Type Errors with OpenAPI

If you see TypeScript errors:
- Ensure your input/output schemas are valid Zod schemas
- Avoid using `.transform()` or `.refine()` in OpenAPI procedures
- Use simple Zod types: `z.string()`, `z.number()`, `z.boolean()`, `z.object()`
- Don't use `z.date()` in schemas - use `z.string()` for ISO date strings instead

## Next Steps

1. **Add more endpoints** to `packages/trpc/src/openapi.ts`:
   - Auth endpoints (login, register, logout)
   - Contact management
   - Campaign management
   - Message templates
   - Other public/commonly-used endpoints

2. **Test endpoints** in Swagger UI at `/api/docs`

3. **Share logic** between main tRPC router and OpenAPI router:
   - Extract business logic to separate service functions
   - Import and reuse in both routers
   - Keep OpenAPI router thin (just for REST exposure)

4. **Document edge cases** in the `description` field

5. **Consider versioning** if you plan to make breaking changes (e.g., `/api/v1/plans`)

## Resources

- [trpc-to-openapi npm](https://www.npmjs.com/package/trpc-to-openapi)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)

# Swagger/OpenAPI Setup Summary

## ✅ What Was Done

Auto-generated Swagger documentation and REST endpoints are now integrated into the API app.

### Files Modified

1. **`packages/trpc/src/openapi.ts`**
   - Created separate OpenAPI-compatible router (without superjson)
   - Added example endpoints: health, plans list, plan by ID
   - Generates OpenAPI document

2. **`packages/trpc/src/server.ts`**
   - Exports `openApiRouter` and `openApiDocument`

3. **`apps/api/src/routes/swagger.ts`**
   - Imports auto-generated `openApiDocument`
   - Serves Swagger UI at `/api/docs`
   - Serves OpenAPI JSON at `/api/docs/openapi.json`

4. **`apps/api/src/index.ts`**
   - Added OpenAPI HTTP handler for REST endpoints
   - Routes REST requests to `openApiRouter`

## 🎯 Key Concepts

### Why Two Routers?

```
Main tRPC Router (appRouter)
├─ Uses superjson transformer
├─ Called via tRPC client: /api/trpc/*
└─ NOT compatible with trpc-openapi ❌

OpenAPI Router (openApiRouter)
├─ Uses plain JSON (no transformer)
├─ Called via REST: /api/*
└─ Compatible with trpc-openapi ✅
```

### Architecture

```
User Request
    │
    ├─── /api/trpc/* ───> Main tRPC Router (appRouter)
    │                     └─ tRPC Client (type-safe)
    │
    └─── /api/* ───────> OpenAPI Router (openApiRouter)
                          ├─ REST API
                          └─ Swagger UI Docs
```

## 🚀 Access Points

| What | URL | Description |
|------|-----|-------------|
| **Swagger UI** | `http://localhost:3001/api/docs` | Interactive API documentation |
| **OpenAPI JSON** | `http://localhost:3001/api/docs/openapi.json` | OpenAPI spec (import to Postman/Insomnia) |
| **Health Check** | `GET http://localhost:3001/api/health` | Test endpoint |
| **List Plans** | `GET http://localhost:3001/api/plans` | Get subscription plans |
| **Get Plan** | `GET http://localhost:3001/api/plans/{id}` | Get specific plan |

## 📝 Adding New REST Endpoints

Edit `packages/trpc/src/openapi.ts` and add to the router:

```typescript
export const openApiRouter = t.router({
  // ... existing endpoints
  
  yourEndpoint: t.procedure
    .meta({
      openapi: {
        method: "GET",
        path: "/your-path",
        tags: ["yourTag"],
        summary: "Your endpoint title",
      },
    })
    .input(z.object({ /* input schema */ }))
    .output(z.object({ /* output schema */ }))
    .query(async ({ ctx, input }) => {
      // Your logic here
      return { /* response */ };
    }),
});
```

## 🔧 Important Notes

1. **Always use `openApiRouter`** for REST endpoints (NOT the main `appRouter`)
2. **Dates must be strings** - use `z.string()` not `z.date()`
3. **Avoid transforms** - don't use `.transform()` or complex `.refine()`
4. **Define output schemas** - always add `.output()` for better docs
5. **Restart server** after adding endpoints

## 📚 Example Endpoints Already Added

- **Health Check**: `GET /api/health`
- **List Plans**: `GET /api/plans?includeInactive=false&includePrivate=false`
- **Get Plan by ID**: `GET /api/plans/{id}`

## 🔍 Testing

1. Start the API server: `cd apps/api && bun run dev`
2. Open Swagger UI: http://localhost:3001/api/docs
3. Try endpoints directly in the browser or use curl:

```bash
# Health check
curl http://localhost:3001/api/health

# List plans
curl http://localhost:3001/api/plans

# Get specific plan (replace {id} with actual UUID)
curl http://localhost:3001/api/plans/YOUR-PLAN-ID
```

## 📖 Full Documentation

See `OPENAPI_SWAGGER_INTEGRATION.md` for comprehensive guide with examples, best practices, and troubleshooting.

## ✨ Benefits

- ✅ Auto-generated REST API from tRPC procedures
- ✅ Interactive Swagger UI documentation
- ✅ No conflicts with existing tRPC endpoints
- ✅ Easy to add new endpoints
- ✅ OpenAPI spec for external tools (Postman, code generators)
- ✅ Both tRPC and REST available simultaneously

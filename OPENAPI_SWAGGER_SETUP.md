# OpenAPI/Swagger Integration Guide

## Overview

This project now includes auto-generated OpenAPI documentation using `trpc-openapi` and a Swagger UI interface for exploring the API.

## Setup

### Dependencies Installed

1. **trpc-openapi** - Converts tRPC routers to OpenAPI specifications
2. **swagger-ui-express** - Serves Swagger UI (not directly used, we use CDN version)

### Configuration Files

- **`packages/trpc/src/trpc.ts`** - Updated tRPC initialization to support OpenAPI metadata
- **`packages/trpc/src/openapi.ts`** - OpenAPI document generator configuration
- **`packages/trpc/scripts/generate-openapi.ts`** - Script to generate OpenAPI JSON file
- **`apps/api/src/routes/swagger.ts`** - Swagger UI route handler

## Accessing the Documentation

Once the API server is running, you can access:

- **Swagger UI**: `http://localhost:3001/api/docs`
- **OpenAPI JSON**: `http://localhost:3001/api/docs/openapi.json`

## Adding OpenAPI Metadata to Procedures

To document your tRPC procedures in the OpenAPI spec, add metadata using the `.meta()` method:

### Example: Public Procedure (No Authentication)

```typescript
import { z } from "zod";
import { publicProcedure } from "../trpc";

export const myRouter = router({
  myProcedure: publicProcedure
    .meta({
      openapi: {
        method: "POST",           // HTTP method: GET, POST, PUT, DELETE, PATCH
        path: "/my-endpoint",     // REST endpoint path
        tags: ["myTag"],          // Group in Swagger UI
        summary: "Short description",
        description: "Detailed description of what this endpoint does",
        protect: false,           // Set to true if authentication required
      },
    })
    .input(z.object({
      param1: z.string(),
      param2: z.number(),
    }))
    .output(z.object({
      result: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Implementation
      return { result: "success" };
    }),
});
```

### Example: Protected Procedure (Requires Authentication)

```typescript
import { protectedProcedure } from "../trpc";

export const myRouter = router({
  protectedProcedure: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/protected/data",
        tags: ["protected"],
        summary: "Get protected data",
        description: "This endpoint requires authentication",
        protect: true,            // Requires authentication
      },
    })
    .input(z.object({
      id: z.string(),
    }))
    .output(z.object({
      data: z.any(),
    }))
    .query(async ({ input, ctx }) => {
      // ctx.userId is available here
      return { data: {} };
    }),
});
```

## Generating Static OpenAPI Document

To generate a static OpenAPI JSON file for distribution or CI/CD:

```bash
# From the packages/trpc directory
bun run generate-openapi

# Or from the root directory
cd packages/trpc && bun run generate-openapi
```

This will create `packages/trpc/openapi.json` with the complete OpenAPI specification.

## OpenAPI Configuration

The OpenAPI document is configured in `packages/trpc/src/openapi.ts`:

```typescript
import { generateOpenApiDocument } from "trpc-openapi";
import { appRouter } from "./routers";

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "WhatsApp Bot API",
  description: "API description",
  version: "1.0.0",
  baseUrl: process.env.API_BASE_URL || "http://localhost:3001/api",
  docsUrl: "https://github.com/mohamedhabibwork/whatsappBot",
  tags: [
    "auth",
    "users",
    // ... other tags
  ],
});
```

### Environment Variables

- **`API_BASE_URL`**: Set this to your production API URL (default: `http://localhost:3001/api`)

## Best Practices

### 1. Always Define Input and Output Schemas

```typescript
.input(z.object({ ... }))
.output(z.object({ ... }))
```

This ensures proper documentation and type safety.

### 2. Use Descriptive Tags

Group related endpoints together:
- `auth` - Authentication endpoints
- `users` - User management
- `contacts` - Contact management
- etc.

### 3. Add Detailed Descriptions

```typescript
.meta({
  openapi: {
    summary: "Brief one-liner",
    description: "Detailed multi-line description\n\nCan include:\n- Lists\n- Examples\n- Edge cases",
  },
})
```

### 4. Document Query Parameters and Request Bodies

Zod schemas automatically generate documentation:

```typescript
.input(z.object({
  email: z.string().email().describe("User email address"),
  name: z.string().min(1).max(100).describe("User full name"),
  language: z.enum(["en", "ar"]).describe("Preferred language"),
}))
```

## Multilingual Support

The API supports both English (`en`) and Arabic (`ar`). Make sure to:

1. Include `language` parameter in relevant endpoints
2. Document both language options in the schema
3. Provide error messages in both languages

## Security

- Public endpoints: `protect: false`
- Protected endpoints: `protect: true` (requires Bearer token)
- Use appropriate HTTP methods (GET for queries, POST for mutations)

## Swagger UI Features

The Swagger UI provides:
- **Interactive API testing** - Try out endpoints directly from the browser
- **Request/Response examples** - See data structures
- **Authentication testing** - Add Bearer tokens for protected endpoints
- **Schema validation** - Automatic validation of requests

## Troubleshooting

### Issue: Procedure not showing in Swagger UI

**Solution**: Make sure you've added `.meta({ openapi: {...} })` to the procedure.

### Issue: TypeScript errors with output schema

**Solution**: Ensure the output schema matches what your procedure actually returns.

### Issue: 401 Unauthorized on protected endpoints

**Solution**: Click "Authorize" in Swagger UI and enter your Bearer token.

## CI/CD Integration

To generate OpenAPI specs in your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Generate OpenAPI Spec
  run: |
    cd packages/trpc
    bun run generate-openapi
    
- name: Upload OpenAPI Spec
  uses: actions/upload-artifact@v3
  with:
    name: openapi-spec
    path: packages/trpc/openapi.json
```

## Future Enhancements

- [ ] Add request/response examples to procedures
- [ ] Implement API versioning
- [ ] Add rate limiting documentation
- [ ] Generate SDK clients using Speakeasy CLI
- [ ] Add more detailed error response schemas

## Resources

- [trpc-openapi Documentation](https://github.com/jlalmes/trpc-openapi)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.3)
- [Speakeasy SDK Generator](https://www.speakeasy.com/openapi/frameworks/trpc)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)

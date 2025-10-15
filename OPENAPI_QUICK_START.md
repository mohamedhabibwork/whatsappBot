# OpenAPI/Swagger Quick Start

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Start the API Server

```bash
cd apps/api
bun run dev
```

### 3. Access Swagger UI

Open your browser and navigate to:
```
http://localhost:3001/api/docs
```

## 📝 Adding OpenAPI Metadata to Your Procedures

### Step 1: Import Required Types

```typescript
import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../trpc";
```

### Step 2: Add `.meta()` with OpenAPI Config

```typescript
myProcedure: publicProcedure
  .meta({
    openapi: {
      method: "POST",              // GET, POST, PUT, DELETE, PATCH
      path: "/my/endpoint",        // URL path
      tags: ["myTag"],             // Group in Swagger
      summary: "One-line summary",
      description: "Detailed description",
      protect: false,              // true if auth required
    },
  })
  .input(/* zod schema */)
  .output(/* zod schema */)
  .mutation(/* implementation */);
```

### Step 3: Define Input/Output Schemas

```typescript
.input(z.object({
  name: z.string().describe("User name"),
  email: z.string().email().describe("Email address"),
}))
.output(z.object({
  success: z.boolean(),
  message: z.string(),
}))
```

## 🎯 Examples by Use Case

### Public Endpoint (No Auth)

```typescript
login: publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/auth/login",
      tags: ["auth"],
      summary: "User login",
      protect: false,
    },
  })
  .input(z.object({
    email: z.string().email(),
    password: z.string(),
  }))
  .output(z.object({
    accessToken: z.string(),
    user: z.object({
      id: z.string(),
      email: z.string(),
    }),
  }))
  .mutation(async ({ input, ctx }) => {
    // Implementation
  });
```

### Protected Endpoint (Auth Required)

```typescript
getProfile: protectedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/profile",
      tags: ["users"],
      summary: "Get user profile",
      protect: true,
    },
  })
  .input(z.void())  // No input needed
  .output(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }))
  .query(async ({ ctx }) => {
    // ctx.userId is available
  });
```

### List Endpoint with Pagination

```typescript
listUsers: protectedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/list",
      tags: ["users"],
      summary: "List users",
      protect: true,
    },
  })
  .input(z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
  }))
  .output(z.object({
    users: z.array(z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })),
    total: z.number(),
    page: z.number(),
  }))
  .query(async ({ input, ctx }) => {
    // Implementation
  });
```

## 🔧 Common HTTP Methods

- **GET** - Retrieve data (use `.query()`)
- **POST** - Create resources (use `.mutation()`)
- **PUT** - Update entire resource (use `.mutation()`)
- **PATCH** - Partial update (use `.mutation()`)
- **DELETE** - Delete resource (use `.mutation()`)

## ✅ Checklist for Each Procedure

- [ ] Added `.meta({ openapi: {...} })`
- [ ] Specified HTTP method (`GET`, `POST`, etc.)
- [ ] Set correct path (e.g., `/auth/login`)
- [ ] Added appropriate tag
- [ ] Written clear summary and description
- [ ] Set `protect: true` if auth required
- [ ] Defined `.input()` schema with descriptions
- [ ] Defined `.output()` schema
- [ ] Tested in Swagger UI

## 🧪 Testing in Swagger UI

1. Navigate to `http://localhost:3001/api/docs`
2. Find your endpoint by tag
3. Click "Try it out"
4. For protected endpoints:
   - Click "Authorize" at the top
   - Enter: `Bearer YOUR_ACCESS_TOKEN`
5. Fill in parameters
6. Click "Execute"
7. View response

## 📦 Generate Static OpenAPI File

```bash
cd packages/trpc
bun run generate-openapi
```

This creates `packages/trpc/openapi.json` that you can:
- Share with frontend teams
- Import into Postman/Insomnia
- Use for SDK generation
- Include in documentation

## 🌍 Multi-language Support

For endpoints that support both English and Arabic:

```typescript
.input(z.object({
  language: z.enum(["en", "ar"]).default("en"),
  // ... other fields
}))
```

Return localized messages:

```typescript
return {
  message: input.language === "ar" 
    ? "تم بنجاح" 
    : "Success",
};
```

## 🛠️ Useful Zod Validators

```typescript
z.string()                        // Any string
z.string().email()                // Email
z.string().min(8)                 // Min length
z.string().max(100)               // Max length
z.string().regex(/^[A-Z]+$/)     // Pattern
z.number()                        // Any number
z.number().int()                  // Integer
z.number().min(0).max(100)       // Range
z.boolean()                       // Boolean
z.enum(["option1", "option2"])   // Enum
z.array(z.string())              // Array
z.object({ ... })                // Object
z.string().optional()            // Optional field
z.string().default("value")      // Default value
z.string().describe("Help text") // Documentation
```

## 🚨 Common Issues

### Procedure not appearing in Swagger?
→ Check that you added `.meta({ openapi: {...} })`

### TypeScript error on `.output()`?
→ Ensure schema matches what you return

### 401 Unauthorized?
→ Click "Authorize" and add your token

### Wrong data type in Swagger?
→ Check your Zod schema definitions

## 📚 Next Steps

1. Add OpenAPI metadata to all public procedures first
2. Then add to protected procedures
3. Test each endpoint in Swagger UI
4. Generate SDK using Speakeasy CLI (optional)
5. Share OpenAPI spec with your team

For detailed information, see [OPENAPI_SWAGGER_SETUP.md](./OPENAPI_SWAGGER_SETUP.md)

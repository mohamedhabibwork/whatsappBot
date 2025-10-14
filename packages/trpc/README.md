# @repo/trpc

tRPC API package with type-safe client and server setup.

## Features

- Type-safe API with full TypeScript support
- Built-in authentication middleware
- Role-based access control (user/admin)
- SuperJSON transformer for Date, Map, Set support
- Zod validation

## Server Usage

```typescript
import { appRouter, createContext } from "@repo/trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";

const server = createHTTPServer({
  router: appRouter,
  createContext: ({ req }) => {
    // Extract user from JWT token
    const userId = extractUserFromToken(req.headers.authorization);
    return createContext({ userId });
  },
});

server.listen(3000);
```

## Client Usage

```typescript
import { createClient } from "@repo/trpc/client";

const client = createClient("http://localhost:3000/trpc", () => {
  return localStorage.getItem("token");
});

// Type-safe API calls
const users = await client.users.list.query({ limit: 10 });
const me = await client.users.me.query();
```

## Available Routers

- **users**: User management (list, me, updateProfile, delete)
- **whatsapp**: WhatsApp instance management (list, get, create, update, delete)
- **messages**: Message history (list, getByChatId)

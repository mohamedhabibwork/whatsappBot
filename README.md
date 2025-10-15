# WhatsApp Bot - Enterprise Monorepo

A production-ready WhatsApp bot platform built with modern technologies and clean architecture.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL + Drizzle ORM
- **Cache**: Redis
- **API**: tRPC (type-safe APIs)
- **Queue**: RabbitMQ
- **Auth**: JWT
- **Rate Limiting**: hono-rate-limiter
- **WebSocket**: @hono/node-ws
- **Monorepo**: Turborepo

## Project Structure

### Apps and Packages

- `api`: Backend API server with tRPC, JWT auth, and queue integration
- `web`: Next.js frontend application
- `docs`: Documentation site
- `wppconnect-server`: WhatsApp connection server
- `@repo/database`: Database schemas and Drizzle ORM client
- `@repo/trpc`: tRPC routers and type-safe API definitions
- `@repo/queue`: RabbitMQ queue management
- `@repo/cache`: Redis caching utilities
- `@repo/ui`: Shared React component library
- `@repo/eslint-config`: Shared ESLint configurations
- `@repo/typescript-config`: Shared TypeScript configurations

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

## Quick Start

### Prerequisites

- Bun 1.2.23+
- Docker & Docker Compose (optional, for local development)
- PostgreSQL 16+
- Redis 7+
- RabbitMQ 3+

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd new-whatsapp-bot
```

2. **Install dependencies**

```bash
bun install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start infrastructure (Docker)**

```bash
docker-compose up -d postgres redis rabbitmq
```

5. **Run database migrations**

```bash
cd packages/database
bun run db:generate
bun run db:migrate
```

6. **Start development servers**

```bash
bun run dev
```

The API will be available at `http://localhost:3001`

## Database Management

### Generate migration

```bash
cd packages/database
bun run db:generate
```

### Run migrations

```bash
bun run db:migrate
```

### Push schema directly (dev only)

```bash
bun run db:push
```

### Open Drizzle Studio

```bash
bun run db:studio
```

## API Documentation

### Swagger UI (Interactive API Docs)

Access the interactive API documentation at:
```
http://localhost:3001/api/docs
```

The Swagger UI provides:
- **Interactive testing** - Try endpoints directly from the browser
- **Complete API reference** - All endpoints documented
- **Request/Response schemas** - See data structures
- **Authentication support** - Test protected endpoints

📚 **Quick Start Guide**: See [OPENAPI_QUICK_START.md](./OPENAPI_QUICK_START.md)  
📖 **Detailed Setup**: See [OPENAPI_SWAGGER_SETUP.md](./OPENAPI_SWAGGER_SETUP.md)

### OpenAPI Specification

Download the OpenAPI JSON:
```
http://localhost:3001/api/docs/openapi.json
```

Or generate it locally:
```bash
cd packages/trpc
bun run generate-openapi
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### tRPC API

All tRPC endpoints are available at `/api/trpc/*`

**Available routers:**

- `users.*` - User management
- `whatsapp.*` - WhatsApp instance management
- `messages.*` - Message history

### Example tRPC Usage

```typescript
// Client-side
import { createClient } from "@repo/trpc/client";

const client = createClient("http://localhost:3001/api/trpc", () => {
  return localStorage.getItem("token");
});

// Get current user
const me = await client.users.me.query();

// List WhatsApp instances
const instances = await client.whatsapp.list.query();

// Create new instance
const newInstance = await client.whatsapp.create.mutate({
  name: "My Bot",
  sessionName: "my-bot-session",
});
```

## Queue System

### Available Queues

- **whatsapp.send-message** - Send WhatsApp messages
- **whatsapp.instance-status** - Instance status updates
- **whatsapp.message-received** - Process received messages
- **notifications.email** - Send email notifications
- **notifications.webhook** - Send webhook notifications

### Publishing Messages

```typescript
import { initializeQueues } from "@repo/queue";

const queues = await initializeQueues();

// Send WhatsApp message
await queues.sendMessage.publish({
  instanceId: "uuid-here",
  chatId: "1234567890@c.us",
  message: "Hello!",
  type: "text",
});
```

## Deployment

### Using Docker Compose

```bash
docker-compose up -d
```

This starts:

- PostgreSQL database
- RabbitMQ message broker
- API server

### Environment Variables

See `.env.example` for all available configuration options.

**Required:**

- `DATABASE_URL` - PostgreSQL connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - Secret key for JWT tokens

## Development Tools

This Turborepo has the following tools setup:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting
- [Drizzle ORM](https://orm.drizzle.team/) for database management
- [tRPC](https://trpc.io/) for type-safe APIs

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build
yarn dlx turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build --filter=docs

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build --filter=docs
yarn exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev
yarn exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev --filter=web

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev --filter=web
yarn exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo login

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo login
yarn exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo link

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)

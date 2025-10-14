# @repo/database

Database package using Drizzle ORM with PostgreSQL.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Set up your database URL:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/whatsapp_bot"
```

3. Generate migrations:

```bash
bun run db:generate
```

4. Run migrations:

```bash
bun run db:migrate
```

## Usage

```typescript
import { db, users } from "@repo/database";

// Query users
const allUsers = await db.select().from(users);

// Insert user
await db.insert(users).values({
  email: "user@example.com",
  password: "hashed_password",
  name: "John Doe",
});
```

## Schema

- **users**: User accounts with authentication
- **sessions**: JWT session management
- **whatsappInstances**: WhatsApp bot instances
- **messages**: Message history

## Scripts

- `db:generate`: Generate migration files
- `db:migrate`: Run migrations
- `db:push`: Push schema changes directly (dev only)
- `db:studio`: Open Drizzle Studio

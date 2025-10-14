# Setup Guide

## Step 1: Install Dependencies

```bash
bun install
```

This will install all dependencies for the monorepo and link workspace packages.

## Step 2: Start Infrastructure Services

### Option A: Using Docker Compose (Recommended)

```bash
docker-compose up -d postgres rabbitmq
```

This starts PostgreSQL and RabbitMQ in Docker containers.

### Option B: Manual Installation

Install PostgreSQL 16+ and RabbitMQ 3+ on your system and configure them according to the connection strings in `.env`.

## Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and update the following variables:

- `DATABASE_URL` - Your PostgreSQL connection string
- `RABBITMQ_URL` - Your RabbitMQ connection string
- `JWT_SECRET` - A secure random string for JWT signing (generate with `openssl rand -base64 32`)

## Step 4: Initialize Database

```bash
# Navigate to database package
cd packages/database

# Generate migration files
bun run db:generate

# Run migrations
bun run db:migrate

# Go back to root
cd ../..
```

## Step 5: Start Development Servers

```bash
# Start all apps in development mode
bun run dev
```

Or start specific apps:

```bash
# API only
cd apps/api
bun run dev

# Web only
cd apps/web
bun run dev
```

## Step 6: Verify Setup

1. **Check API Health**

   ```bash
   curl http://localhost:3001/health
   ```

2. **Test User Registration**

   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123",
       "name": "Test User"
     }'
   ```

3. **Test Login**

   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

4. **Check RabbitMQ Management**

   Open http://localhost:15672 (default credentials: guest/guest)

5. **Open Drizzle Studio** (optional)
   ```bash
   cd packages/database
   bun run db:studio
   ```

## Troubleshooting

### Database connection issues

- Ensure PostgreSQL is running: `docker ps` or check your local PostgreSQL service
- Verify `DATABASE_URL` in `.env` matches your setup
- Check PostgreSQL logs: `docker logs whatsapp-bot-db`

### RabbitMQ connection issues

- Ensure RabbitMQ is running: `docker ps`
- Verify `RABBITMQ_URL` in `.env` matches your setup
- Check RabbitMQ logs: `docker logs whatsapp-bot-rabbitmq`

### TypeScript errors

- Run `bun install` again to ensure all dependencies are properly linked
- Clear turbo cache: `rm -rf .turbo`
- Restart your IDE/editor

### Port conflicts

If port 3001, 5432, or 5672 are already in use:

1. Update ports in `.env` and `docker-compose.yml`
2. Restart the affected services

## Production Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Manual Deployment

1. Set `NODE_ENV=production` in `.env`
2. Build all packages: `bun run build`
3. Run migrations: `cd packages/database && bun run db:migrate`
4. Start the API: `cd apps/api && bun run start`

## Next Steps

- Read the main [README.md](./README.md) for API documentation
- Check package-specific READMEs:
  - [Database Package](./packages/database/README.md)
  - [tRPC Package](./packages/trpc/README.md)
  - [Queue Package](./packages/queue/README.md)

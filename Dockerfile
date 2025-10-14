FROM oven/bun:1.2.23-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json bun.lock ./
COPY packages/database/package.json ./packages/database/package.json
COPY packages/trpc/package.json ./packages/trpc/package.json
COPY packages/queue/package.json ./packages/queue/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN bun install --frozen-lockfile

# Build the source code
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Production image, copy all files and run
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bunuser

COPY --from=builder --chown=bunuser:nodejs /app ./

USER bunuser

EXPOSE 3001

ENV PORT=3001

CMD ["bun", "run", "apps/api/src/index.ts"]

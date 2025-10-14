# @repo/cache

Redis-based caching package with type-safe operations.

## Features

- Singleton Redis client with connection pooling
- Type-safe cache operations
- Automatic serialization/deserialization
- TTL (Time To Live) support
- Pattern-based key operations
- Remember pattern for cache-aside strategy

## Setup

1. Install dependencies:

```bash
bun install
```

2. Set up Redis URL:

```bash
export REDIS_URL="redis://localhost:6379"
```

Or start Redis with Docker:

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

## Usage

### Initialize Redis Connection

```typescript
import { redisClient } from "@repo/cache";

// Connect to Redis
await redisClient.connect();
```

### Basic Cache Operations

```typescript
import { cache } from "@repo/cache";

// Set value with TTL (60 seconds)
await cache.set("user:123", { id: 123, name: "John" }, 60);

// Get value
const user = await cache.get<{ id: number; name: string }>("user:123");

// Delete value
await cache.del("user:123");

// Check if key exists
const exists = await cache.exists("user:123");
```

### Advanced Operations

```typescript
// Increment counter
await cache.increment("page:views", 1);

// Get all keys matching pattern
const keys = await cache.keys("user:*");

// Clear all keys matching pattern
await cache.clear("session:*");

// Get TTL for key
const ttl = await cache.ttl("user:123");

// Update expiration
await cache.expire("user:123", 300); // 5 minutes
```

### Remember Pattern (Cache-Aside)

```typescript
// Fetch from cache, or compute and cache if missing
const user = await cache.remember(
  "user:123",
  3600, // TTL: 1 hour
  async () => {
    // This callback only runs if cache is empty
    return await db.select().from(users).where(eq(users.id, 123));
  },
);
```

### Custom Cache Prefix

```typescript
import { Cache } from "@repo/cache";

const userCache = new Cache("users");
const sessionCache = new Cache("sessions");

await userCache.set("123", userData, 3600);
await sessionCache.set("abc", sessionData, 1800);
```

### Direct Redis Access

```typescript
import { redisClient } from "@repo/cache";

const client = redisClient.getClient();

// Use any ioredis method
await client.lpush("queue:jobs", "job1");
await client.zadd("leaderboard", 100, "player1");
```

## API Reference

### Cache Class

- `get<T>(key: string): Promise<T | null>` - Get cached value
- `set(key: string, value: any, ttl?: number): Promise<boolean>` - Set cached value
- `del(key: string): Promise<boolean>` - Delete key
- `exists(key: string): Promise<boolean>` - Check if key exists
- `ttl(key: string): Promise<number>` - Get remaining TTL
- `expire(key: string, seconds: number): Promise<boolean>` - Set expiration
- `keys(pattern: string): Promise<string[]>` - Find keys by pattern
- `clear(pattern: string): Promise<boolean>` - Delete keys by pattern
- `increment(key: string, amount?: number): Promise<number>` - Increment counter
- `decrement(key: string, amount?: number): Promise<number>` - Decrement counter
- `remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T>` - Cache-aside pattern

## Common Patterns

### Session Storage

```typescript
await cache.set(`session:${sessionId}`, sessionData, 86400); // 24 hours
```

### Rate Limiting

```typescript
const key = `ratelimit:${userId}:${endpoint}`;
const count = await cache.increment(key);

if (count === 1) {
  await cache.expire(key, 60); // Reset after 60 seconds
}

if (count > 100) {
  throw new Error("Rate limit exceeded");
}
```

### Query Caching

```typescript
const cacheKey = `query:users:${JSON.stringify(filters)}`;
const users = await cache.remember(cacheKey, 300, async () => {
  return await db.select().from(users).where(filters);
});
```

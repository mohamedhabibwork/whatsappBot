import { Context, Next } from "hono";
import { redisClient } from "@repo/cache";

// Custom rate limiter using Redis
export async function rateLimitMiddleware(c: Context, next: Next) {
  const key = `ratelimit:${getClientId(c)}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const max = 100; // 100 requests per window

  try {
    const redis = redisClient.getClient();

    // Increment the request count
    const count = await redis.incr(key);

    // Set expiry on first request in window
    if (count === 1) {
      await redis.expire(key, Math.floor(windowMs / 1000));
    }

    // Check if over limit
    if (count > max) {
      c.header("X-RateLimit-Limit", max.toString());
      c.header("X-RateLimit-Remaining", "0");
      c.header(
        "X-RateLimit-Reset",
        new Date(Date.now() + windowMs).toISOString(),
      );
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    // Set rate limit headers
    const remaining = Math.max(0, max - count);
    c.header("X-RateLimit-Limit", max.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header(
      "X-RateLimit-Reset",
      new Date(Date.now() + windowMs).toISOString(),
    );

    await next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    // Continue without rate limiting on error
    await next();
  }
}

function getClientId(c: Context): string {
  // Use IP address or user ID from auth
  const auth = c.get("auth");
  if (auth?.userId) {
    return `user:${auth.userId}`;
  }
  return `ip:${c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"}`;
}

// Strict rate limiter for auth endpoints
export async function authRateLimitMiddleware(c: Context, next: Next) {
  const key = `auth-ratelimit:${getClientId(c)}`;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const max = 5; // 5 requests per 15 minutes

  try {
    const redis = redisClient.getClient();

    // Increment the request count
    const count = await redis.incr(key);

    // Set expiry on first request in window
    if (count === 1) {
      await redis.expire(key, Math.floor(windowMs / 1000));
    }

    // Check if over limit
    if (count > max) {
      return c.json({ error: "Too many authentication attempts" }, 429);
    }

    await next();
  } catch (error) {
    console.error("Auth rate limiter error:", error);
    await next();
  }
}

// Simple rate limiter factory
export function createRateLimiter(
  windowMs: number = 15 * 60 * 1000,
  max: number = 100,
) {
  return async (c: Context, next: Next) => {
    const key = `ratelimit:${getClientId(c)}`;

    try {
      const redis = redisClient.getClient();
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, Math.floor(windowMs / 1000));
      }

      if (count > max) {
        return c.json({ error: "Rate limit exceeded" }, 429);
      }

      await next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      await next();
    }
  };
}

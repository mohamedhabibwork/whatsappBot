import { redisClient } from "./client";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class Cache {
  private prefix: string;

  constructor(prefix: string = "app") {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = redisClient.getClient();
      const value = await client.get(this.getKey(key));

      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      const serialized = JSON.stringify(value);

      if (ttl) {
        await client.setex(this.getKey(key), ttl, serialized);
      } else {
        await client.set(this.getKey(key), serialized);
      }

      return true;
    } catch (error) {
      console.error("Cache set error:", error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      await client.del(this.getKey(key));
      return true;
    } catch (error) {
      console.error("Cache del error:", error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      const result = await client.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      console.error("Cache exists error:", error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const client = redisClient.getClient();
      return await client.ttl(this.getKey(key));
    } catch (error) {
      console.error("Cache ttl error:", error);
      return -1;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      await client.expire(this.getKey(key), seconds);
      return true;
    } catch (error) {
      console.error("Cache expire error:", error);
      return false;
    }
  }

  async keys(pattern: string = "*"): Promise<string[]> {
    try {
      const client = redisClient.getClient();
      const keys = await client.keys(this.getKey(pattern));
      return keys.map((key) => key.replace(`${this.prefix}:`, ""));
    } catch (error) {
      console.error("Cache keys error:", error);
      return [];
    }
  }

  async clear(pattern: string = "*"): Promise<boolean> {
    try {
      const client = redisClient.getClient();
      const keys = await client.keys(this.getKey(pattern));

      if (keys.length > 0) {
        await client.del(...keys);
      }

      return true;
    } catch (error) {
      console.error("Cache clear error:", error);
      return false;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const client = redisClient.getClient();
      return await client.incrby(this.getKey(key), amount);
    } catch (error) {
      console.error("Cache increment error:", error);
      return 0;
    }
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      const client = redisClient.getClient();
      return await client.decrby(this.getKey(key), amount);
    } catch (error) {
      console.error("Cache decrement error:", error);
      return 0;
    }
  }

  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, ttl);

    return value;
  }
}

export const cache = new Cache();

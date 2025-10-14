import { redisClient } from "./client";

export class CacheService {
  private defaultTTL = Number(process.env.REDIS_TTL) || 3600;

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.set(key, serialized, ttl || this.defaultTTL);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string | string[]): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error);
    }
  }

  // User-specific cache methods
  async getUser(userId: string) {
    return this.get(`user:${userId}`);
  }

  async setUser(userId: string, user: any, ttl: number = 300) {
    return this.set(`user:${userId}`, user, ttl);
  }

  async invalidateUser(userId: string) {
    return this.invalidatePattern(`user:${userId}*`);
  }

  // Tenant-specific cache methods
  async getTenant(tenantId: string) {
    return this.get(`tenant:${tenantId}`);
  }

  async setTenant(tenantId: string, tenant: any, ttl: number = 3600) {
    return this.set(`tenant:${tenantId}`, tenant, ttl);
  }

  async invalidateTenant(tenantId: string) {
    return this.invalidatePattern(`tenant:${tenantId}*`);
  }

  // User-Tenant-Role cache methods
  async getUserTenantRole(userId: string, tenantId: string) {
    return this.get<string>(`user:${userId}:tenant:${tenantId}:role`);
  }

  async setUserTenantRole(
    userId: string,
    tenantId: string,
    role: string,
    ttl: number = 600,
  ) {
    return this.set(`user:${userId}:tenant:${tenantId}:role`, role, ttl);
  }

  async getUserTenants(userId: string) {
    return this.get(`user:${userId}:tenants`);
  }

  async setUserTenants(userId: string, tenants: any[], ttl: number = 600) {
    return this.set(`user:${userId}:tenants`, tenants, ttl);
  }

  async invalidateUserTenants(userId: string) {
    return this.invalidatePattern(`user:${userId}:tenant*`);
  }
}

export const cacheService = new CacheService();

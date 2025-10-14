import Redis, { RedisOptions } from "ioredis";

class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(options?: RedisOptions): Promise<void> {
    if (this.client && this.client.status === "ready") {
      return;
    }

    if (this.isConnecting) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.connect(options);
    }

    this.isConnecting = true;

    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        ...options,
      });

      this.client.on("error", (err) => {
        console.error("Redis client error:", err);
      });

      this.client.on("connect", () => {
        console.log("Redis client connected");
      });

      this.client.on("ready", () => {
        console.log("Redis client ready");
      });

      this.client.on("close", () => {
        console.log("Redis client connection closed");
      });

      await this.client.ping();
      console.log("Connected to Redis");
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      this.client = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public getClient(): Redis {
    if (!this.client) {
      throw new Error("Redis client not initialized. Call connect() first.");
    }
    return this.client;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  public isConnected(): boolean {
    return this.client !== null && this.client.status === "ready";
  }
}

export const redisClient = RedisClient.getInstance();
export { Redis };

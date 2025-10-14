import amqp, { Connection, Channel } from "amqplib";

export class RabbitMQConnection {
  private static instance: RabbitMQConnection;
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private url: string;
  private isConnecting = false;

  private constructor() {
    this.url = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
  }

  public static getInstance(): RabbitMQConnection {
    if (!RabbitMQConnection.instance) {
      RabbitMQConnection.instance = new RabbitMQConnection();
    }
    return RabbitMQConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.connect();
    }

    this.isConnecting = true;

    try {
      console.log("Connecting to RabbitMQ...");
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      this.connection.on("error", (err) => {
        console.error("RabbitMQ connection error:", err);
        this.connection = null;
        this.channel = null;
      });

      this.connection.on("close", () => {
        console.log("RabbitMQ connection closed");
        this.connection = null;
        this.channel = null;
      });

      console.log("Connected to RabbitMQ");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      this.connection = null;
      this.channel = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public async getChannel(): Promise<Channel> {
    if (!this.channel) {
      await this.connect();
    }
    if (!this.channel) {
      throw new Error("Failed to get RabbitMQ channel");
    }
    return this.channel;
  }

  public async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  public isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

export const rabbitMQ = RabbitMQConnection.getInstance();

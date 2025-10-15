import amqp, { type Channel } from "amqplib";

export class RabbitMQConnection {
  private static instance: RabbitMQConnection;
  private connection: any = null;
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

      this.connection.on("error", (err: Error) => {
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

  public async publish(queueName: string, data: any): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertQueue(queueName, { durable: true });
    const message = JSON.stringify(data);
    channel.sendToQueue(queueName, Buffer.from(message), {
      persistent: true,
    });
  }

  public async consume(
    queueName: string,
    callback: (message: any) => Promise<void>
  ): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertQueue(queueName, { durable: true });

    await channel.consume(
      queueName,
      async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          channel.ack(msg);
        } catch (error) {
          console.error(`Failed to process message from ${queueName}:`, error);
          channel.nack(msg, false, true); // Requeue on error
        }
      },
      { noAck: false }
    );
  }
}

export const rabbitMQ = RabbitMQConnection.getInstance();

export async function initializeQueues(): Promise<void> {
  await rabbitMQ.connect();
  console.log("Queue system initialized");
}

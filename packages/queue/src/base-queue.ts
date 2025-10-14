import { Channel, ConsumeMessage } from "amqplib";
import { rabbitMQ } from "./connection";
import { z } from "zod";

export interface QueueOptions {
  durable?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export abstract class BaseQueue<T extends z.ZodType> {
  protected queueName: string;
  protected schema: T;
  protected options: QueueOptions;

  constructor(queueName: string, schema: T, options: QueueOptions = {}) {
    this.queueName = queueName;
    this.schema = schema;
    this.options = {
      durable: true,
      maxRetries: 3,
      retryDelay: 5000,
      ...options,
    };
  }

  protected async getChannel(): Promise<Channel> {
    return rabbitMQ.getChannel();
  }

  public async initialize(): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertQueue(this.queueName, {
      durable: this.options.durable,
    });
  }

  public async publish(data: z.infer<T>): Promise<void> {
    try {
      const validated = this.schema.parse(data);
      const channel = await this.getChannel();
      const message = JSON.stringify(validated);

      channel.sendToQueue(this.queueName, Buffer.from(message), {
        persistent: true,
      });

      console.log(`Published message to ${this.queueName}:`, validated);
    } catch (error) {
      console.error(`Failed to publish message to ${this.queueName}:`, error);
      throw error;
    }
  }

  protected abstract processMessage(data: z.infer<T>): Promise<void>;

  public async consume(): Promise<void> {
    const channel = await this.getChannel();

    await channel.consume(
      this.queueName,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          const validated = this.schema.parse(content);

          console.log(`Processing message from ${this.queueName}:`, validated);
          await this.processMessage(validated);

          channel.ack(msg);
        } catch (error) {
          console.error(
            `Failed to process message from ${this.queueName}:`,
            error,
          );

          const retryCount = this.getRetryCount(msg);
          if (retryCount < (this.options.maxRetries || 3)) {
            // Requeue with delay
            setTimeout(() => {
              channel.nack(msg, false, true);
            }, this.options.retryDelay || 5000);
          } else {
            // Max retries reached, move to dead letter queue or discard
            console.error(
              `Max retries reached for message in ${this.queueName}`,
            );
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false },
    );

    console.log(`Started consuming messages from ${this.queueName}`);
  }

  private getRetryCount(msg: ConsumeMessage): number {
    const headers = msg.properties.headers || {};
    return headers["x-retry-count"] || 0;
  }

  public async purge(): Promise<void> {
    const channel = await this.getChannel();
    await channel.purgeQueue(this.queueName);
    console.log(`Purged queue: ${this.queueName}`);
  }
}

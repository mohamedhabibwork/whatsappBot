# @repo/queue

RabbitMQ queue management package with type-safe message handling.

## Features

- Type-safe message schemas with Zod validation
- Automatic retry mechanism with configurable attempts
- Connection pooling and error handling
- Multiple queue types for different use cases

## Setup

1. Install RabbitMQ:

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

2. Set RabbitMQ URL:

```bash
export RABBITMQ_URL="amqp://localhost:5672"
```

## Usage

### Initialize Queues

```typescript
import { rabbitMQ, initializeQueues } from "@repo/queue";

// Connect to RabbitMQ
await rabbitMQ.connect();

// Initialize all queues
const queues = await initializeQueues();
```

### Publish Messages

```typescript
// Send WhatsApp message
await queues.sendMessage.publish({
  instanceId: "uuid-here",
  chatId: "1234567890@c.us",
  message: "Hello World!",
  type: "text",
});

// Update instance status
await queues.instanceStatus.publish({
  instanceId: "uuid-here",
  status: "connected",
  phoneNumber: "+1234567890",
});

// Send webhook notification
await queues.webhookNotification.publish({
  url: "https://example.com/webhook",
  method: "POST",
  body: { event: "message.received" },
});
```

### Consume Messages

```typescript
// Start consuming messages
await queues.sendMessage.consume();
await queues.messageReceived.consume();
```

## Available Queues

- **SendMessageQueue**: Send WhatsApp messages
- **InstanceStatusQueue**: Update instance status
- **MessageReceivedQueue**: Process received messages
- **EmailNotificationQueue**: Send email notifications
- **WebhookNotificationQueue**: Send webhook notifications

## Custom Queues

```typescript
import { BaseQueue } from "@repo/queue";
import { z } from "zod";

const mySchema = z.object({
  field: z.string(),
});

class MyQueue extends BaseQueue<typeof mySchema> {
  constructor() {
    super("my-queue", mySchema);
  }

  protected async processMessage(data: z.infer<typeof mySchema>) {
    // Process your message
    console.log(data);
  }
}
```

# @repo/notifications

Firebase Cloud Messaging (FCM) notification service for sending push notifications.

## Installation

```bash
bun install firebase-admin
```

## Configuration

Add to your `.env` file:

```env
# Option 1: Path to service account JSON file
FCM_SERVICE_ACCOUNT_PATH=/path/to/service-account.json

# Option 2: Service account JSON as string
FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

## Setup Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Save the JSON file securely
6. Add path to `.env` or paste JSON content

## Usage

### Initialize FCM

```typescript
import { initializeFCM } from "@repo/notifications";

// Initialize once at app startup
initializeFCM();
```

### Send Notification

```typescript
import { notificationService } from "@repo/notifications";

// Send to single token
await notificationService.sendToToken("fcm-token", {
  title: "New Message",
  body: "You have a new message",
  data: { messageId: "123" },
  imageUrl: "https://example.com/image.png",
});

// Send to multiple tokens
const result = await notificationService.sendToTokens(
  ["token1", "token2", "token3"],
  {
    title: "System Update",
    body: "New features available!",
  },
);

console.log(`Sent: ${result.successCount}, Failed: ${result.failureCount}`);
console.log("Invalid tokens:", result.invalidTokens);

// Send to topic
await notificationService.sendToTopic("news", {
  title: "Breaking News",
  body: "Important update!",
});
```

### Topic Management

```typescript
// Subscribe tokens to topic
await notificationService.subscribeToTopic(
  ["token1", "token2"],
  "tenant_abc123",
);

// Unsubscribe
await notificationService.unsubscribeFromTopic(
  ["token1", "token2"],
  "tenant_abc123",
);
```

## Notification Payload

```typescript
interface NotificationPayload {
  title: string; // Notification title
  body: string; // Notification body
  data?: Record<string, string>; // Custom data (string key-value pairs)
  imageUrl?: string; // Optional image URL
}
```

## Platform-Specific Features

The service automatically configures platform-specific settings:

- **Android**: High priority, default sound
- **iOS (APNS)**: Badge count, default sound
- **Web**: Custom icons and badges

## Error Handling

The service automatically handles:

- Invalid tokens (returns list for cleanup)
- Unregistered tokens
- Network errors
- FCM API errors

## Database Integration

Store FCM tokens in the `fcm_tokens` table:

```typescript
await db.insert(fcmTokens).values({
  userId: "user-id",
  token: "fcm-token",
  deviceType: "android",
  deviceName: "Samsung Galaxy S21",
});
```

## Best Practices

1. **Token Management**: Remove invalid tokens from database
2. **Rate Limiting**: FCM has quota limits, implement rate limiting
3. **Data Payload**: Keep data values as strings (FCM requirement)
4. **Topic Names**: Use kebab-case, e.g., `tenant-abc123`
5. **Error Handling**: Always handle send failures gracefully
6. **Testing**: Use FCM test tokens during development

## Example: Send to All User Devices

```typescript
// Get all user's FCM tokens
const tokens = await db
  .select({ token: fcmTokens.token })
  .from(fcmTokens)
  .where(eq(fcmTokens.userId, userId));

// Send to all devices
const result = await notificationService.sendToTokens(
  tokens.map((t) => t.token),
  {
    title: "New Invitation",
    body: "You have been invited to join a team",
    data: { invitationId: "123", type: "invitation" },
  },
);

// Clean up invalid tokens
if (result.invalidTokens.length > 0) {
  await db
    .delete(fcmTokens)
    .where(inArray(fcmTokens.token, result.invalidTokens));
}
```

## Troubleshooting

**FCM not initialized:**

- Check environment variables are set
- Verify service account JSON is valid
- Check console for initialization errors

**Notifications not received:**

- Verify FCM token is valid
- Check device has internet connection
- Verify app has notification permissions
- Check FCM console for delivery status

**Invalid tokens:**

- Tokens expire when app is uninstalled
- Remove invalid tokens from database
- Request new token from client when needed

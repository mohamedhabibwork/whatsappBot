# Notifications & FCM Implementation

## ✅ Completed Implementation

### 1. **Invitation Email Template**

**File:** `/packages/mail/src/templates.ts`

Added tenant invitation template with bilingual support:

- Subject: "Invitation to join {{tenantName}}" / "دعوة للانضمام إلى {{tenantName}}"
- Includes inviter name, role, expiration, and accept button
- Modern HTML email design

**Method added to MailService:**

```typescript
await mailService.sendTenantInvitationEmail(
  "user@example.com",
  "My Company",
  "John Doe",
  "https://app.com/accept?token=xxx",
  "member",
  "en",
  7, // days
);
```

### 2. **FCM Tokens Table**

**File:** `/packages/database/src/schema/fcm-tokens.ts`

Schema for storing multiple FCM tokens per user:

```typescript
{
  id: uuid
  userId: uuid (FK to users)
  token: text (unique)
  deviceId: text
  deviceType: text // 'android', 'ios', 'web'
  deviceName: text
  createdAt: timestamp
  lastUsedAt: timestamp
}
```

**Features:**

- One-to-many relationship (user can have multiple devices)
- Device identification for management
- Auto-cleanup of invalid tokens

### 3. **Notifications Table**

**File:** `/packages/database/src/schema/notifications.ts`

Notification storage:

```typescript
{
  id: uuid;
  userId: uuid;
  tenantId: uuid(optional);
  type: text; // 'invitation', 'mention', 'message', 'system'
  title: text;
  body: text;
  data: jsonb; // metadata
  isRead: boolean;
  readAt: timestamp;
  createdAt: timestamp;
}
```

### 4. **FCM Notification Package**

**Location:** `/packages/notifications`

Complete Firebase Cloud Messaging integration:

**Files Created:**

- `src/fcm-client.ts` - Firebase Admin initialization
- `src/notification-service.ts` - Notification sending service
- `src/index.ts` - Package exports
- `README.md` - Complete documentation

**Features:**

- Send to single token
- Send to multiple tokens (multicast)
- Send to topics
- Subscribe/unsubscribe from topics
- Automatic invalid token detection
- Platform-specific configurations (Android/iOS/Web)

**Environment Variables:**

```env
# Option 1: Path to Firebase service account
FCM_SERVICE_ACCOUNT_PATH=/path/to/service-account.json

# Option 2: JSON as string
FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

### 5. **Notification Service API**

**Send to Single Device:**

```typescript
import { notificationService } from "@repo/notifications";

await notificationService.sendToToken("fcm-token", {
  title: "New Invitation",
  body: "You have been invited to join My Company",
  data: { invitationId: "123", type: "invitation" },
  imageUrl: "https://example.com/logo.png",
});
```

**Send to Multiple Devices:**

```typescript
const result = await notificationService.sendToTokens(
  ["token1", "token2", "token3"],
  {
    title: "Team Update",
    body: "New member joined!",
  },
);

console.log(`Success: ${result.successCount}, Failed: ${result.failureCount}`);
console.log("Invalid tokens:", result.invalidTokens); // Clean these up!
```

**Topic Management:**

```typescript
// Subscribe users to tenant topic
await notificationService.subscribeToTopic(tokens, `tenant_${tenantId}`);

// Send to all tenant members
await notificationService.sendToTopic(`tenant_${tenantId}`, {
  title: "Tenant Announcement",
  body: "Important update for all members",
});
```

## 📋 Next Steps to Complete

### 1. Update Email Queue Worker

**File:** `/packages/queue/src/workers/email-worker.ts`

Add tenant invitation case:

```typescript
case 'tenantInvitation':
  await mailService.sendTenantInvitationEmail(
    job.to,
    job.data.tenantName,
    job.data.inviterName,
    job.data.url,
    job.data.role,
    job.language,
    job.data.expirationDays || 7
  );
  break;
```

### 2. Update Tenant Invite Endpoint

**File:** `/packages/trpc/src/routers/tenants.ts` (line 123+)

Replace email sending with:

```typescript
// Queue invitation email (already done, but use new template)
await emailQueue.add({
  to: input.email,
  subject:
    input.language === "ar"
      ? `دعوة للانضمام إلى ${tenant.name}`
      : `Invitation to join ${tenant.name}`,
  template: "tenantInvitation",
  language: input.language,
  data: {
    name: input.email,
    url: invitationUrl,
    tenantName: tenant.name,
    inviterName: inviter?.name || "A team member",
    role: input.role,
    expirationDays: 7,
  },
});

// If user already exists, send push notification
const [existingUser] = await ctx.db
  .select()
  .from(users)
  .where(eq(users.email, input.email))
  .limit(1);

if (existingUser) {
  // Get user's FCM tokens
  const fcmTokens = await ctx.db
    .select({ token: fcmTokens.token })
    .from(fcmTokens)
    .where(eq(fcmTokens.userId, existingUser.id));

  if (fcmTokens.length > 0) {
    // Send push notification
    const result = await notificationService.sendToTokens(
      fcmTokens.map((t) => t.token),
      {
        title: input.language === "ar" ? `دعوة جديدة` : "New Invitation",
        body:
          input.language === "ar"
            ? `لقد تمت دعوتك للانضمام إلى ${tenant.name}`
            : `You've been invited to join ${tenant.name}`,
        data: {
          type: "invitation",
          invitationId: invitation.id,
          tenantId: input.tenantId,
        },
      },
    );

    // Clean up invalid tokens
    if (result.invalidTokens.length > 0) {
      await ctx.db
        .delete(fcmTokens)
        .where(inArray(fcmTokens.token, result.invalidTokens));
    }
  }

  // Also create in-app notification
  await ctx.db.insert(notifications).values({
    userId: existingUser.id,
    tenantId: input.tenantId,
    type: "invitation",
    title: input.language === "ar" ? "دعوة جديدة" : "New Invitation",
    body:
      input.language === "ar"
        ? `لقد تمت دعوتك للانضمام إلى ${tenant.name} بواسطة ${inviter?.name}`
        : `${inviter?.name} invited you to join ${tenant.name}`,
    data: {
      invitationId: invitation.id,
      tenantId: input.tenantId,
      role: input.role,
    },
  });
}
```

### 3. Create Notifications tRPC Router

**File:** `/packages/trpc/src/routers/notifications.ts` (NEW)

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { notifications, fcmTokens } from "@repo/database";
import { eq, and, desc } from "drizzle-orm";
import { notificationService } from "@repo/notifications";

export const notificationsRouter = router({
  // Get user's notifications
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userNotifications = await ctx.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.userId))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const unreadCount = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.userId),
            eq(notifications.isRead, false),
          ),
        );

      return {
        notifications: userNotifications,
        unreadCount: unreadCount[0]?.count || 0,
      };
    }),

  // Mark as read
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.userId, ctx.userId),
          ),
        );

      return { success: true };
    }),

  // Mark all as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, ctx.userId),
          eq(notifications.isRead, false),
        ),
      );

    return { success: true };
  }),

  // Register FCM token
  registerToken: protectedProcedure
    .input(
      z.object({
        token: z.string(),
        deviceId: z.string().optional(),
        deviceType: z.enum(["android", "ios", "web"]),
        deviceName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check if token already exists
      const existing = await ctx.db
        .select()
        .from(fcmTokens)
        .where(eq(fcmTokens.token, input.token))
        .limit(1);

      if (existing.length > 0) {
        // Update last used
        await ctx.db
          .update(fcmTokens)
          .set({ lastUsedAt: new Date() })
          .where(eq(fcmTokens.token, input.token));
      } else {
        // Insert new token
        await ctx.db.insert(fcmTokens).values({
          userId: ctx.userId,
          token: input.token,
          deviceId: input.deviceId,
          deviceType: input.deviceType,
          deviceName: input.deviceName,
        });
      }

      return { success: true };
    }),

  // Remove FCM token
  removeToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(fcmTokens)
        .where(
          and(
            eq(fcmTokens.token, input.token),
            eq(fcmTokens.userId, ctx.userId),
          ),
        );

      return { success: true };
    }),

  // List user's devices
  listDevices: protectedProcedure.query(async ({ ctx }) => {
    const devices = await ctx.db
      .select()
      .from(fcmTokens)
      .where(eq(fcmTokens.userId, ctx.userId))
      .orderBy(desc(fcmTokens.lastUsedAt));

    return { devices };
  }),
});
```

### 4. Update Main Router

**File:** `/packages/trpc/src/routers/index.ts`

```typescript
import { notificationsRouter } from "./notifications";

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  tenants: tenantsRouter,
  notifications: notificationsRouter, // ADD THIS
});
```

### 5. Initialize FCM in Server

**File:** `/apps/api/src/index.ts`

```typescript
import { initializeFCM } from "@repo/notifications";

async function initializeServices() {
  // ... existing code ...

  // Initialize FCM
  initializeFCM();
  console.log("✓ FCM initialized");
}
```

### 6. Update Environment Variables

**File:** `.env.example`

Add FCM configuration:

```env
# =============================================================================
# FIREBASE CLOUD MESSAGING (FCM)
# =============================================================================
# Option 1: Path to service account JSON
FCM_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json

# Option 2: Service account JSON as string (for production)
# FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

## 🎯 Usage Examples

### Frontend: Register FCM Token

```typescript
import { messaging } from "firebase/messaging";

// Request notification permission
const permission = await Notification.requestPermission();

if (permission === "granted") {
  const token = await getToken(messaging);

  // Register with backend
  await trpc.notifications.registerToken.mutate({
    token,
    deviceType: "web",
    deviceName: navigator.userAgent,
  });
}
```

### Frontend: Listen for Notifications

```typescript
onMessage(messaging, (payload) => {
  console.log("Notification received:", payload);

  // Show notification
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png",
  });

  // Refresh notifications list
  refetchNotifications();
});
```

### Frontend: Display Notifications

```typescript
const { data } = trpc.notifications.list.useQuery({
  limit: 20,
  offset: 0,
});

return (
  <div>
    <Badge>{data?.unreadCount}</Badge>
    {data?.notifications.map(notif => (
      <Notification
        key={notif.id}
        {...notif}
        onRead={() => markAsRead(notif.id)}
      />
    ))}
  </div>
);
```

## 📊 Database Migration

Run migration to create new tables:

```bash
cd packages/database
bun run db:generate
bun run db:migrate
```

This creates:

- `fcm_tokens` table
- `notifications` table

## 🔒 Security Considerations

1. **FCM Service Account**: Store securely, never commit to git
2. **Token Validation**: Always verify tokens belong to authenticated user
3. **Rate Limiting**: Limit FCM token registration attempts
4. **Data Sanitization**: Validate notification data before sending
5. **Privacy**: Only send notifications to intended recipients
6. **Cleanup**: Regularly remove invalid/expired tokens

## ✅ Summary

**What's Ready:**

- ✅ Invitation email template (bilingual)
- ✅ FCM tokens table (multi-device support)
- ✅ Notifications table
- ✅ FCM notification service package
- ✅ Platform-specific configurations
- ✅ Topic management
- ✅ Invalid token handling

**What Needs Integration:**

- ⏳ Add notification tRPC router
- ⏳ Update tenant invite to send push notifications
- ⏳ Update email queue worker
- ⏳ Initialize FCM in server
- ⏳ Frontend FCM integration

**Estimated Time:** 1-2 hours for integration + testing

---

**Last Updated:** October 13, 2025, 8:25 PM UTC+03:00

import { TRPCError } from "@trpc/server";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  subscriptions,
  subscriptionUsages,
  type SubscriptionUsage,
} from "@repo/database";

type FeatureKey =
  | "messages_sent"
  | "api_calls"
  | "whatsapp_instances"
  | "contacts"
  | "campaigns";

interface UsageTrackingOptions {
  db: any;
  tenantId: string;
  featureKey: FeatureKey;
  incrementBy?: number;
  metadata?: Record<string, unknown>;
}

interface CheckUsageLimitOptions {
  db: any;
  tenantId: string;
  featureKey: FeatureKey;
}

/**
 * Initialize subscription usage for a tenant in the current period
 */
export async function initializeUsage(
  db: any,
  tenantId: string,
  subscriptionId: string,
  featureKey: FeatureKey,
  limit: number | null = null,
): Promise<SubscriptionUsage> {
  // Get current subscription
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Subscription not found",
    });
  }

  // Check if usage already exists for current period
  const [existingUsage] = await db
    .select()
    .from(subscriptionUsages)
    .where(
      and(
        eq(subscriptionUsages.subscriptionId, subscriptionId),
        eq(subscriptionUsages.tenantId, tenantId),
        eq(subscriptionUsages.featureKey, featureKey),
        gte(subscriptionUsages.periodEnd, new Date()),
      ),
    )
    .limit(1);

  if (existingUsage) {
    return existingUsage;
  }

  // Create new usage record
  const [newUsage] = await db
    .insert(subscriptionUsages)
    .values({
      subscriptionId,
      tenantId,
      featureKey,
      usageCount: 0,
      limit,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    })
    .returning();

  return newUsage;
}

/**
 * Track usage and increment the count
 */
export async function trackUsage({
  db,
  tenantId,
  featureKey,
  incrementBy = 1,
  metadata = {},
}: UsageTrackingOptions): Promise<void> {
  // Get active subscription for tenant
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.tenantId, tenantId),
        eq(subscriptions.status, "active"),
      ),
    )
    .limit(1);

  if (!subscription) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "No active subscription found",
    });
  }

  const now = new Date();

  // Get or create usage record for current period
  const [usage] = await db
    .select()
    .from(subscriptionUsages)
    .where(
      and(
        eq(subscriptionUsages.subscriptionId, subscription.id),
        eq(subscriptionUsages.tenantId, tenantId),
        eq(subscriptionUsages.featureKey, featureKey),
        lte(subscriptionUsages.periodStart, now),
        gte(subscriptionUsages.periodEnd, now),
      ),
    )
    .limit(1);

  if (!usage) {
    // Initialize usage for this feature
    const newUsage = await initializeUsage(
      db,
      tenantId,
      subscription.id,
      featureKey,
    );
    
    // Increment the newly created usage
    await db
      .update(subscriptionUsages)
      .set({
        usageCount: incrementBy,
        metadata,
        updatedAt: now,
      })
      .where(eq(subscriptionUsages.id, newUsage.id));
    
    return;
  }

  // Check if limit exceeded
  if (usage.limit !== null && usage.usageCount + incrementBy > usage.limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Usage limit exceeded for ${featureKey}. Limit: ${usage.limit}, Current: ${usage.usageCount}`,
    });
  }

  // Increment usage
  await db
    .update(subscriptionUsages)
    .set({
      usageCount: usage.usageCount + incrementBy,
      metadata,
      updatedAt: now,
    })
    .where(eq(subscriptionUsages.id, usage.id));
}

/**
 * Check if usage limit would be exceeded
 */
export async function checkUsageLimit({
  db,
  tenantId,
  featureKey,
}: CheckUsageLimitOptions): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
}> {
  // Get active subscription for tenant
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.tenantId, tenantId),
        eq(subscriptions.status, "active"),
      ),
    )
    .limit(1);

  if (!subscription) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
    };
  }

  const now = new Date();

  // Get usage for current period
  const [usage] = await db
    .select()
    .from(subscriptionUsages)
    .where(
      and(
        eq(subscriptionUsages.subscriptionId, subscription.id),
        eq(subscriptionUsages.tenantId, tenantId),
        eq(subscriptionUsages.featureKey, featureKey),
        lte(subscriptionUsages.periodStart, now),
        gte(subscriptionUsages.periodEnd, now),
      ),
    )
    .limit(1);

  if (!usage) {
    // No usage record means unlimited or not initialized
    return {
      allowed: true,
      current: 0,
      limit: null,
      remaining: null,
    };
  }

  const remaining = usage.limit !== null ? usage.limit - usage.usageCount : null;
  const allowed = usage.limit === null || usage.usageCount < usage.limit;

  return {
    allowed,
    current: usage.usageCount,
    limit: usage.limit,
    remaining,
  };
}

/**
 * Get usage stats for a tenant
 */
export async function getUsageStats(
  db: any,
  tenantId: string,
): Promise<SubscriptionUsage[]> {
  const now = new Date();

  const usages = await db
    .select()
    .from(subscriptionUsages)
    .where(
      and(
        eq(subscriptionUsages.tenantId, tenantId),
        lte(subscriptionUsages.periodStart, now),
        gte(subscriptionUsages.periodEnd, now),
      ),
    );

  return usages;
}

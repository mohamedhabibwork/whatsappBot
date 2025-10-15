import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import {
  subscriptions,
  invoices,
  invoiceItems,
  payments,
  plans,
  subscriptionFeatures,
  planFeatures,
  subscriptionUsages,
  type NewInvoice,
  type NewInvoiceItem,
  type NewPayment,
  type NewSubscription,
  type NewSubscriptionFeature,
} from "@repo/database";
import {
  emitSubscriptionEvent,
  emitInvoiceEvent,
  emitPaymentEvent,
} from "./websocket-events";

/**
 * Generate invoice number
 */
function generateInvoiceNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `INV-${timestamp}-${random}`;
}

/**
 * Generate payment number
 */
function generatePaymentNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `PAY-${timestamp}-${random}`;
}

/**
 * Create subscription with workflow
 * - Handles free plans (auto-approve without payment)
 * - Creates invoice for paid plans
 * - Initializes subscription features
 * - Emits socket events
 */
export async function createSubscriptionWithWorkflow(
  db: any,
  input: {
    tenantId: string;
    planId: string;
    startDate?: Date;
    metadata?: Record<string, any>;
  },
) {
  // Get plan details
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, input.planId))
    .limit(1);

  if (!plan) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Plan not found",
    });
  }

  if (!plan.isActive) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Plan is not active",
    });
  }

  const startDate = input.startDate || new Date();
  const trialDays = plan.trialDays ?? 0;
  const trialEnd =
    trialDays > 0
      ? new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000)
      : null;

  // Calculate period end based on billing cycle
  let periodEnd = new Date(startDate);
  switch (plan.billingCycle) {
    case "daily":
      periodEnd.setDate(periodEnd.getDate() + 1);
      break;
    case "weekly":
      periodEnd.setDate(periodEnd.getDate() + 7);
      break;
    case "monthly":
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      break;
    case "quarterly":
      periodEnd.setMonth(periodEnd.getMonth() + 3);
      break;
    case "semiannually":
      periodEnd.setMonth(periodEnd.getMonth() + 6);
      break;
    case "yearly":
    case "annually":
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      break;
  }

  const isFree = parseFloat(plan.price) === 0;

  const newSubscription: NewSubscription = {
    tenantId: input.tenantId,
    planId: input.planId,
    status: trialDays > 0 ? "trial" : isFree ? "active" : "pending",
    currentPeriodStart: startDate,
    currentPeriodEnd: periodEnd,
    trialStart: trialDays > 0 ? startDate : null,
    trialEnd,
    price: plan.price,
    currency: plan.currency,
    metadata: input.metadata || {},
  };

  const [subscription] = await db
    .insert(subscriptions)
    .values(newSubscription)
    .returning();

  if (!subscription) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create subscription",
    });
  }

  // Copy plan features to subscription features
  const planFeaturesList = await db
    .select()
    .from(planFeatures)
    .where(eq(planFeatures.planId, input.planId));

  if (planFeaturesList.length > 0) {
    const subscriptionFeaturesList: NewSubscriptionFeature[] =
      planFeaturesList.map((feature: any) => ({
        subscriptionId: subscription.id,
        planFeatureId: feature.id,
        featureKey: feature.featureKey,
        featureValue: feature.featureValue,
        isEnabled: feature.isEnabled,
        metadata: {},
      }));

    await db.insert(subscriptionFeatures).values(subscriptionFeaturesList);
  }

  // Initialize usage tracking for known features
  const featureKeys = [
    "messages_sent",
    "api_calls",
    "whatsapp_instances",
    "contacts",
    "campaigns",
  ];

  const usageRecords = featureKeys.map((key) => ({
    subscriptionId: subscription.id,
    tenantId: input.tenantId,
    featureKey: key,
    usageCount: 0,
    limit: (plan as any)[`max${key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, "")}`] || null,
    periodStart: startDate,
    periodEnd,
    metadata: {},
  }));

  await db.insert(subscriptionUsages).values(usageRecords);

  let invoice = null;
  let payment = null;

  // For free plans, skip payment and activate immediately
  if (isFree) {
    // Already set to active above
    emitSubscriptionEvent(
      "subscription_created",
      subscription.id,
      input.tenantId,
      { subscription, plan, isFree: true },
    );
    return { subscription, invoice: null, payment: null, isFree: true };
  }

  // For paid plans, create invoice and payment record
  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + 7); // Payment due in 7 days

  // Create invoice
  const newInvoice: NewInvoice = {
    invoiceNumber: generateInvoiceNumber(),
    tenantId: input.tenantId,
    subscriptionId: subscription.id,
    status: "pending",
    subtotal: plan.price,
    tax: "0",
    discount: "0",
    total: plan.price,
    currency: plan.currency,
    dueDate,
    metadata: { subscriptionPeriod: { start: startDate, end: periodEnd } },
  };

  [invoice] = await db.insert(invoices).values(newInvoice).returning();

  // Create invoice item
  const invoiceItem: NewInvoiceItem = {
    invoiceId: invoice.id,
    itemableType: "plan",
    itemableId: input.planId,
    description: plan.description || plan.name,
    quantity: 1,
    unitPrice: plan.price,
    amount: plan.price,
    taxRate: "0",
    taxAmount: "0",
    discountAmount: "0",
    metadata: {},
  };

  await db.insert(invoiceItems).values(invoiceItem);

  // Create payment record (pending)
  const newPayment: NewPayment = {
    paymentNumber: generatePaymentNumber(),
    tenantId: input.tenantId,
    invoiceId: invoice.id,
    status: "pending",
    amount: plan.price,
    currency: plan.currency,
    paymentMethod: "pending", // To be updated when payment gateway is implemented
    metadata: { subscriptionId: subscription.id },
  };

  [payment] = await db.insert(payments).values(newPayment).returning();

  // Emit events
  emitSubscriptionEvent(
    "subscription_created",
    subscription.id,
    input.tenantId,
    { subscription, plan, isFree: false },
  );
  emitInvoiceEvent("invoice_created", invoice.id, input.tenantId, { invoice });
  emitPaymentEvent("payment_created", payment.id, input.tenantId, { payment });

  return { subscription, invoice, payment, isFree: false };
}

/**
 * Renew subscription with workflow
 * - Calculates new period
 * - Creates invoice for paid plans
 * - Resets usage counters
 * - Emits socket events
 */
export async function renewSubscriptionWithWorkflow(
  db: any,
  subscriptionId: string,
) {
  const [existingSubscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!existingSubscription) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Subscription not found",
    });
  }

  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, existingSubscription.planId))
    .limit(1);

  if (!plan) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Plan not found",
    });
  }

  const newPeriodStart = existingSubscription.currentPeriodEnd;
  let newPeriodEnd = new Date(newPeriodStart);

  switch (plan.billingCycle) {
    case "daily":
      newPeriodEnd.setDate(newPeriodEnd.getDate() + 1);
      break;
    case "weekly":
      newPeriodEnd.setDate(newPeriodEnd.getDate() + 7);
      break;
    case "monthly":
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      break;
    case "quarterly":
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 3);
      break;
    case "semiannually":
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 6);
      break;
    case "yearly":
    case "annually":
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      break;
  }

  const isFree = parseFloat(plan.price) === 0;

  // Update subscription
  const [updatedSubscription] = await db
    .update(subscriptions)
    .set({
      status: "active",
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  // Reset usage counters for new period
  await db
    .update(subscriptionUsages)
    .set({
      usageCount: 0,
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionUsages.subscriptionId, subscriptionId));

  let invoice = null;
  let payment = null;

  // For free plans, skip payment
  if (isFree) {
    emitSubscriptionEvent(
      "subscription_renewed",
      subscriptionId,
      existingSubscription.tenantId,
      { subscription: updatedSubscription, isFree: true },
    );
    return { subscription: updatedSubscription, invoice: null, payment: null, isFree: true };
  }

  // For paid plans, create invoice and payment
  const dueDate = new Date(newPeriodStart);
  dueDate.setDate(dueDate.getDate() + 7); // Payment due in 7 days

  const newInvoice: NewInvoice = {
    invoiceNumber: generateInvoiceNumber(),
    tenantId: existingSubscription.tenantId,
    subscriptionId: subscriptionId,
    status: "pending",
    subtotal: plan.price,
    tax: "0",
    discount: "0",
    total: plan.price,
    currency: plan.currency,
    dueDate,
    metadata: { subscriptionPeriod: { start: newPeriodStart, end: newPeriodEnd }, renewal: true },
  };

  [invoice] = await db.insert(invoices).values(newInvoice).returning();

  // Create invoice item
  const invoiceItem: NewInvoiceItem = {
    invoiceId: invoice.id,
    itemableType: "plan",
    itemableId: plan.id,
    description: plan.description || plan.name,
    quantity: 1,
    unitPrice: plan.price,
    amount: plan.price,
    taxRate: "0",
    taxAmount: "0",
    discountAmount: "0",
    metadata: {},
  };

  await db.insert(invoiceItems).values(invoiceItem);

  // Create payment record
  const newPayment: NewPayment = {
    paymentNumber: generatePaymentNumber(),
    tenantId: existingSubscription.tenantId,
    invoiceId: invoice.id,
    status: "pending",
    amount: plan.price,
    currency: plan.currency,
    paymentMethod: "pending", // To be updated when payment gateway is implemented
    metadata: { subscriptionId, renewal: true },
  };

  [payment] = await db.insert(payments).values(newPayment).returning();

  // Emit events
  emitSubscriptionEvent(
    "subscription_renewed",
    subscriptionId,
    existingSubscription.tenantId,
    { subscription: updatedSubscription, isFree: false },
  );
  emitInvoiceEvent("invoice_created", invoice.id, existingSubscription.tenantId, { invoice });
  emitPaymentEvent("payment_created", payment.id, existingSubscription.tenantId, { payment });

  return { subscription: updatedSubscription, invoice, payment, isFree: false };
}

/**
 * Cancel subscription with workflow
 * - Updates subscription status
 * - Emits socket events
 */
export async function cancelSubscriptionWithWorkflow(
  db: any,
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true,
) {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Subscription not found",
    });
  }

  const updates: any = {
    cancelAtPeriodEnd,
    updatedAt: new Date(),
  };

  if (!cancelAtPeriodEnd) {
    updates.status = "cancelled";
    updates.cancelledAt = new Date();
  }

  const [updatedSubscription] = await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  emitSubscriptionEvent(
    "subscription_cancelled",
    subscriptionId,
    existing.tenantId,
    { subscription: updatedSubscription, cancelAtPeriodEnd },
  );

  return { subscription: updatedSubscription };
}

/**
 * Complete payment for subscription
 * - Updates payment status
 * - Updates invoice status
 * - Activates subscription if pending
 * - Emits socket events
 */
export async function completePaymentForSubscription(
  db: any,
  paymentId: string,
  transactionId?: string,
) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Payment not found",
    });
  }

  // Update payment
  const [updatedPayment] = await db
    .update(payments)
    .set({
      status: "completed",
      paymentDate: new Date(),
      transactionId: transactionId || payment.transactionId,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId))
    .returning();

  // Update invoice
  if (payment.invoiceId) {
    await db
      .update(invoices)
      .set({
        status: "paid",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, payment.invoiceId));

    emitInvoiceEvent("invoice_paid", payment.invoiceId, payment.tenantId, {
      invoiceId: payment.invoiceId,
    });
  }

  // Find and activate subscription if it's pending
  const subscriptionId = (payment.metadata as any)?.subscriptionId;
  if (subscriptionId) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);

    if (subscription && subscription.status === "pending") {
      await db
        .update(subscriptions)
        .set({
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscriptionId));

      emitSubscriptionEvent(
        "subscription_updated",
        subscriptionId,
        payment.tenantId,
        { status: "active", reason: "payment_completed" },
      );
    }
  }

  emitPaymentEvent("payment_succeeded", paymentId, payment.tenantId, {
    payment: updatedPayment,
  });

  return { payment: updatedPayment };
}

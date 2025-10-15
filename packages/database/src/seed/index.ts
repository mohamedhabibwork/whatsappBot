import { db } from "../client";
import {
  users,
  tenants,
  userTenantRoles,
  whatsappInstances,
  contacts,
  groups,
  groupContacts,
  messageTemplates,
  webhooks,
  plans,
  planFeatures,
  subscriptions,
  subscriptionFeatures,
  subscriptionUsages,
  invoices,
  invoiceItems,
  payments,
} from "../schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@repo/auth-utils";

export interface SeedOptions {
  clearExisting?: boolean;
  verbose?: boolean;
}

/**
 * Check if data already exists
 */
async function checkExists<T>(
  table: any,
  condition: any
): Promise<T | null> {
  const [existing] = await db.select().from(table).where(condition).limit(1);
  return (existing as T) || null;
}

/**
 * Seed users
 */
export async function seedUsers(options: SeedOptions = {}) {
  const { verbose = true } = options;

  const usersData = [
    {
      email: "admin@example.com",
      name: "Admin User",
      password: await hashPassword("Admin123!"),
      emailVerified: true,
    },
    {
      email: "user1@example.com",
      name: "Test User 1",
      password: await hashPassword("User123!"),
      emailVerified: true,
    },
    {
      email: "user2@example.com",
      name: "Test User 2",
      password: await hashPassword("User123!"),
      emailVerified: true,
    },
  ];

  const createdUsers = [];

  for (const userData of usersData) {
    const existing = await checkExists(users, eq(users.email, userData.email));

    if (existing) {
      if (verbose) console.log(`✓ User ${userData.email} already exists`);
      createdUsers.push(existing);
    } else {
      const [newUser] = await db.insert(users).values(userData).returning();
      if (verbose) console.log(`✓ Created user: ${userData.email}`);
      createdUsers.push(newUser);
    }
  }

  return createdUsers;
}

/**
 * Seed tenants
 */
export async function seedTenants(options: SeedOptions = {}) {
  const { verbose = true } = options;

  const tenantsData = [
    {
      name: "Acme Corporation",
      slug: "acme-corp",
      domain: "acme.example.com",
      isActive: true,
    },
    {
      name: "Tech Startup Inc",
      slug: "tech-startup",
      domain: "techstartup.example.com",
      isActive: true,
    },
  ];

  const createdTenants = [];

  for (const tenantData of tenantsData) {
    const existing = await checkExists(tenants, eq(tenants.slug, tenantData.slug));

    if (existing) {
      if (verbose) console.log(`✓ Tenant ${tenantData.slug} already exists`);
      createdTenants.push(existing);
    } else {
      const [newTenant] = await db.insert(tenants).values(tenantData).returning();
      if (verbose) console.log(`✓ Created tenant: ${tenantData.slug}`);
      createdTenants.push(newTenant);
    }
  }

  return createdTenants;
}

/**
 * Seed user-tenant relationships
 */
export async function seedUserTenantRoles(
  usersData: any[],
  tenantsData: any[],
  options: SeedOptions = {}
) {
  const { verbose = true } = options;

  const roles = [
    { userId: usersData[0].id, tenantId: tenantsData[0].id, role: "owner" },
    { userId: usersData[1].id, tenantId: tenantsData[0].id, role: "admin" },
    { userId: usersData[2].id, tenantId: tenantsData[0].id, role: "member" },
    { userId: usersData[0].id, tenantId: tenantsData[1].id, role: "owner" },
    { userId: usersData[1].id, tenantId: tenantsData[1].id, role: "member" },
  ];

  const createdRoles = [];

  for (const roleData of roles) {
    const existing = await checkExists(
      userTenantRoles,
      and(
        eq(userTenantRoles.userId, roleData.userId),
        eq(userTenantRoles.tenantId, roleData.tenantId)
      )
    );

    if (existing) {
      if (verbose) console.log(`✓ User-tenant role already exists`);
      createdRoles.push(existing);
    } else {
      const [newRole] = await db.insert(userTenantRoles).values(roleData).returning();
      if (verbose) console.log(`✓ Created user-tenant role: ${roleData.role}`);
      createdRoles.push(newRole);
    }
  }

  return createdRoles;
}

/**
 * Seed WhatsApp instances
 */
export async function seedWhatsAppInstances(
  usersData: any[],
  tenantsData: any[],
  options: SeedOptions = {}
) {
  const { verbose = true } = options;

  const instancesData = [
    {
      userId: usersData[0].id,
      tenantId: tenantsData[0].id,
      name: "Main Instance",
      sessionName: "acme-main",
      phoneNumber: "+1234567890",
      status: "connected",
      isActive: true,
    },
    {
      userId: usersData[0].id,
      tenantId: tenantsData[1].id,
      name: "Support Instance",
      sessionName: "tech-support",
      phoneNumber: "+0987654321",
      status: "connected",
      isActive: true,
    },
  ];

  const createdInstances = [];

  for (const instanceData of instancesData) {
    const existing = await checkExists(
      whatsappInstances,
      eq(whatsappInstances.sessionName, instanceData.sessionName)
    );

    if (existing) {
      if (verbose) console.log(`✓ WhatsApp instance ${instanceData.sessionName} already exists`);
      createdInstances.push(existing);
    } else {
      const [newInstance] = await db.insert(whatsappInstances).values(instanceData).returning();
      if (verbose) console.log(`✓ Created WhatsApp instance: ${instanceData.sessionName}`);
      createdInstances.push(newInstance);
    }
  }

  return createdInstances;
}

/**
 * Seed contacts
 */
export async function seedContacts(tenantsData: any[], options: SeedOptions = {}) {
  const { verbose = true } = options;

  const contactsData = [
    { tenantId: tenantsData[0].id, phoneNumber: "+1111111111", name: "Alice Johnson" },
    { tenantId: tenantsData[0].id, phoneNumber: "+2222222222", name: "Bob Smith" },
    { tenantId: tenantsData[0].id, phoneNumber: "+3333333333", name: "Charlie Brown" },
    { tenantId: tenantsData[1].id, phoneNumber: "+4444444444", name: "David Wilson" },
    { tenantId: tenantsData[1].id, phoneNumber: "+5555555555", name: "Emma Davis" },
  ];

  const createdContacts = [];

  for (const contactData of contactsData) {
    const existing = await checkExists(
      contacts,
      and(
        eq(contacts.tenantId, contactData.tenantId),
        eq(contacts.phoneNumber, contactData.phoneNumber)
      )
    );

    if (existing) {
      if (verbose) console.log(`✓ Contact ${contactData.phoneNumber} already exists`);
      createdContacts.push(existing);
    } else {
      const [newContact] = await db.insert(contacts).values(contactData).returning();
      if (verbose) console.log(`✓ Created contact: ${contactData.name}`);
      createdContacts.push(newContact);
    }
  }

  return createdContacts;
}

/**
 * Seed groups
 */
export async function seedGroups(tenantsData: any[], options: SeedOptions = {}) {
  const { verbose = true } = options;

  const groupsData = [
    {
      tenantId: tenantsData[0].id,
      name: "VIP Customers",
      description: "High-value customers",
    },
    {
      tenantId: tenantsData[0].id,
      name: "Newsletter Subscribers",
      description: "Monthly newsletter recipients",
    },
    {
      tenantId: tenantsData[1].id,
      name: "Beta Testers",
      description: "Early access users",
    },
  ];

  const createdGroups = [];

  for (const groupData of groupsData) {
    const existing = await checkExists(
      groups,
      and(
        eq(groups.tenantId, groupData.tenantId),
        eq(groups.name, groupData.name)
      )
    );

    if (existing) {
      if (verbose) console.log(`✓ Group ${groupData.name} already exists`);
      createdGroups.push(existing);
    } else {
      const [newGroup] = await db.insert(groups).values(groupData).returning();
      if (verbose) console.log(`✓ Created group: ${groupData.name}`);
      createdGroups.push(newGroup);
    }
  }

  return createdGroups;
}

/**
 * Seed group contacts
 */
export async function seedGroupContacts(
  groupsData: any[],
  contactsData: any[],
  options: SeedOptions = {}
) {
  const { verbose = true } = options;

  const groupContactsData = [
    { groupId: groupsData[0].id, contactId: contactsData[0].id },
    { groupId: groupsData[0].id, contactId: contactsData[1].id },
    { groupId: groupsData[1].id, contactId: contactsData[1].id },
    { groupId: groupsData[1].id, contactId: contactsData[2].id },
    { groupId: groupsData[2].id, contactId: contactsData[3].id },
  ];

  const createdGroupContacts = [];

  for (const gcData of groupContactsData) {
    const existing = await checkExists(
      groupContacts,
      and(
        eq(groupContacts.groupId, gcData.groupId),
        eq(groupContacts.contactId, gcData.contactId)
      )
    );

    if (existing) {
      if (verbose) console.log(`✓ Group-contact relationship already exists`);
      createdGroupContacts.push(existing);
    } else {
      const [newGC] = await db.insert(groupContacts).values(gcData).returning();
      if (verbose) console.log(`✓ Added contact to group`);
      createdGroupContacts.push(newGC);
    }
  }

  return createdGroupContacts;
}

/**
 * Seed message templates
 */
export async function seedMessageTemplates(tenantsData: any[], options: SeedOptions = {}) {
  const { verbose = true } = options;

  const templatesData = [
    {
      tenantId: tenantsData[0].id,
      name: "Welcome Message",
      content: "Hello {{name}}, welcome to {{company}}!",
      variables: ["name", "company"],
    },
    {
      tenantId: tenantsData[0].id,
      name: "Order Confirmation",
      content: "Your order #{{orderNumber}} has been confirmed. Total: ${{amount}}",
      variables: ["orderNumber", "amount"],
    },
    {
      tenantId: tenantsData[1].id,
      name: "Beta Invitation",
      content: "Hi {{name}}, you've been invited to our beta program!",
      variables: ["name"],
    },
  ];

  const createdTemplates = [];

  for (const templateData of templatesData) {
    const existing = await checkExists(
      messageTemplates,
      and(
        eq(messageTemplates.tenantId, templateData.tenantId),
        eq(messageTemplates.name, templateData.name)
      )
    );

    if (existing) {
      if (verbose) console.log(`✓ Template ${templateData.name} already exists`);
      createdTemplates.push(existing);
    } else {
      const [newTemplate] = await db.insert(messageTemplates).values(templateData).returning();
      if (verbose) console.log(`✓ Created template: ${templateData.name}`);
      createdTemplates.push(newTemplate);
    }
  }

  return createdTemplates;
}

/**
 * Seed webhooks
 */
export async function seedWebhooks(tenantsData: any[], options: SeedOptions = {}) {
  const { verbose = true } = options;

  const webhooksData = [
    {
      tenantId: tenantsData[0].id,
      name: "Campaign Notifications",
      url: "https://example.com/webhook/campaigns",
      events: ["campaign_created", "campaign_status_changed"],
      secret: "webhook_secret_123",
    },
    {
      tenantId: tenantsData[1].id,
      name: "Contact Updates",
      url: "https://example.com/webhook/contacts",
      events: ["contact_created", "contact_updated"],
      secret: "webhook_secret_456",
    },
  ];

  const createdWebhooks = [];

  for (const webhookData of webhooksData) {
    const existing = await checkExists(
      webhooks,
      and(
        eq(webhooks.tenantId, webhookData.tenantId),
        eq(webhooks.name, webhookData.name)
      )
    );

    if (existing) {
      if (verbose) console.log(`✓ Webhook ${webhookData.name} already exists`);
      createdWebhooks.push(existing);
    } else {
      const [newWebhook] = await db.insert(webhooks).values(webhookData).returning();
      if (verbose) console.log(`✓ Created webhook: ${webhookData.name}`);
      createdWebhooks.push(newWebhook);
    }
  }

  return createdWebhooks;
}

/**
 * Seed plans
 */
export async function seedPlans(options: SeedOptions = {}) {
  const { verbose = true } = options;

  const plansData = [
    {
      name: { en: "Free", ar: "مجاني" },
      description: { en: "Perfect for getting started", ar: "مثالي للبدء" },
      price: "0",
      currency: "USD",
      billingCycle: "monthly",
      trialDays: 0,
      isActive: true,
      isPublic: true,
      maxUsers: 1,
      maxWhatsappInstances: 1,
      maxMessagesPerMonth: 100,
      metadata: { tier: "free" },
    },
    {
      name: { en: "Pro", ar: "احترافي" },
      description: { en: "For growing businesses", ar: "للشركات المتنامية" },
      price: "49",
      currency: "USD",
      billingCycle: "monthly",
      trialDays: 7,
      isActive: true,
      isPublic: true,
      maxUsers: 5,
      maxWhatsappInstances: 5,
      maxMessagesPerMonth: 10000,
      metadata: { tier: "pro", popular: true },
    },
    {
      name: { en: "Enterprise", ar: "مؤسسات" },
      description: { en: "For large organizations", ar: "للمؤسسات الكبيرة" },
      price: "199",
      currency: "USD",
      billingCycle: "monthly",
      trialDays: 14,
      isActive: true,
      isPublic: true,
      maxUsers: 999999,
      maxWhatsappInstances: 999999,
      maxMessagesPerMonth: 999999,
      metadata: { tier: "enterprise" },
    },
  ];

  const createdPlans = [];

  for (const planData of plansData) {
    const existing = await checkExists(
      plans,
      eq(plans.name, planData.name as any)
    );

    if (existing) {
      if (verbose) console.log(`✓ Plan ${(planData.name as any).en} already exists`);
      createdPlans.push(existing);
    } else {
      const [newPlan] = await db.insert(plans).values(planData as any).returning();
      if (verbose) console.log(`✓ Created plan: ${(planData.name as any).en}`);
      createdPlans.push(newPlan);
    }
  }

  return createdPlans;
}

/**
 * Seed plan features
 */
export async function seedPlanFeatures(plansData: any[], options: SeedOptions = {}) {
  const { verbose = true } = options;

  const featuresData = [
    // Free plan features
    {
      planId: plansData[0].id,
      name: { en: "Basic Messaging", ar: "الرسائل الأساسية" },
      description: { en: "Send up to 100 messages per month", ar: "أرسل ما يصل إلى 100 رسالة شهريًا" },
      featureKey: "messages_sent",
      featureValue: "100",
      isEnabled: true,
      displayOrder: 1,
    },
    {
      planId: plansData[0].id,
      name: { en: "Single WhatsApp Instance", ar: "حساب واتساب واحد" },
      description: { en: "One WhatsApp account connection", ar: "اتصال حساب واتساب واحد" },
      featureKey: "whatsapp_instances",
      featureValue: "1",
      isEnabled: true,
      displayOrder: 2,
    },
    {
      planId: plansData[0].id,
      name: { en: "Community Support", ar: "دعم المجتمع" },
      description: { en: "Access to community forums", ar: "الوصول إلى منتديات المجتمع" },
      featureKey: "support_level",
      featureValue: "community",
      isEnabled: true,
      displayOrder: 3,
    },
    // Pro plan features
    {
      planId: plansData[1].id,
      name: { en: "Advanced Messaging", ar: "الرسائل المتقدمة" },
      description: { en: "Send up to 10,000 messages per month", ar: "أرسل ما يصل إلى 10,000 رسالة شهريًا" },
      featureKey: "messages_sent",
      featureValue: "10000",
      isEnabled: true,
      displayOrder: 1,
    },
    {
      planId: plansData[1].id,
      name: { en: "Multiple Instances", ar: "حسابات متعددة" },
      description: { en: "Connect up to 5 WhatsApp accounts", ar: "اتصل بما يصل إلى 5 حسابات واتساب" },
      featureKey: "whatsapp_instances",
      featureValue: "5",
      isEnabled: true,
      displayOrder: 2,
    },
    {
      planId: plansData[1].id,
      name: { en: "Advanced Analytics", ar: "تحليلات متقدمة" },
      description: { en: "Detailed campaign and message analytics", ar: "تحليلات مفصلة للحملات والرسائل" },
      featureKey: "analytics",
      featureValue: "advanced",
      isEnabled: true,
      displayOrder: 3,
    },
    {
      planId: plansData[1].id,
      name: { en: "Priority Support", ar: "دعم ذو أولوية" },
      description: { en: "Email support with priority response", ar: "دعم البريد الإلكتروني مع استجابة ذات أولوية" },
      featureKey: "support_level",
      featureValue: "priority",
      isEnabled: true,
      displayOrder: 4,
    },
    // Enterprise plan features
    {
      planId: plansData[2].id,
      name: { en: "Unlimited Messaging", ar: "رسائل غير محدودة" },
      description: { en: "Send unlimited messages", ar: "أرسل رسائل غير محدودة" },
      featureKey: "messages_sent",
      featureValue: "unlimited",
      isEnabled: true,
      displayOrder: 1,
    },
    {
      planId: plansData[2].id,
      name: { en: "Unlimited Instances", ar: "حسابات غير محدودة" },
      description: { en: "Connect unlimited WhatsApp accounts", ar: "اتصل بحسابات واتساب غير محدودة" },
      featureKey: "whatsapp_instances",
      featureValue: "unlimited",
      isEnabled: true,
      displayOrder: 2,
    },
    {
      planId: plansData[2].id,
      name: { en: "Custom Integrations", ar: "تكاملات مخصصة" },
      description: { en: "API access and custom integrations", ar: "الوصول إلى API والتكاملات المخصصة" },
      featureKey: "api_access",
      featureValue: "full",
      isEnabled: true,
      displayOrder: 3,
    },
    {
      planId: plansData[2].id,
      name: { en: "Dedicated Support", ar: "دعم مخصص" },
      description: { en: "24/7 phone and email support", ar: "دعم هاتفي وبريد إلكتروني على مدار الساعة" },
      featureKey: "support_level",
      featureValue: "dedicated",
      isEnabled: true,
      displayOrder: 4,
    },
  ];

  const createdFeatures = [];

  for (const featureData of featuresData) {
    const existing = await checkExists(
      planFeatures,
      and(
        eq(planFeatures.planId, featureData.planId),
        eq(planFeatures.featureKey, featureData.featureKey)
      )
    );

    if (existing) {
      if (verbose) console.log(`✓ Plan feature already exists`);
      createdFeatures.push(existing);
    } else {
      const [newFeature] = await db.insert(planFeatures).values(featureData as any).returning();
      if (verbose) console.log(`✓ Created plan feature: ${(featureData.name as any).en}`);
      createdFeatures.push(newFeature);
    }
  }

  return createdFeatures;
}

/**
 * Seed subscriptions
 */
export async function seedSubscriptions(
  tenantsData: any[],
  plansData: any[],
  options: SeedOptions = {}
) {
  const { verbose = true } = options;

  const now = new Date();
  const oneMonthFromNow = new Date(now);
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  const subscriptionsData = [
    // Free plan subscription for Acme
    {
      tenantId: tenantsData[0].id,
      planId: plansData[0].id,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthFromNow,
      price: "0",
      currency: "USD",
      metadata: { source: "seed" },
    },
    // Pro plan subscription for Tech Startup
    {
      tenantId: tenantsData[1].id,
      planId: plansData[1].id,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthFromNow,
      trialEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      price: "49",
      currency: "USD",
      metadata: { source: "seed" },
    },
  ];

  const createdSubscriptions = [];

  for (const subscriptionData of subscriptionsData) {
    const existing = await checkExists(
      subscriptions,
      and(
        eq(subscriptions.tenantId, subscriptionData.tenantId),
        eq(subscriptions.status, "active")
      )
    );

    if (existing) {
      if (verbose) console.log(`✓ Active subscription already exists for tenant`);
      createdSubscriptions.push(existing);
    } else {
      const [newSubscription] = await db.insert(subscriptions).values(subscriptionData).returning();
      if (verbose) console.log(`✓ Created subscription for tenant`);
      createdSubscriptions.push(newSubscription);
    }
  }

  return createdSubscriptions;
}

/**
 * Seed subscription features
 */
export async function seedSubscriptionFeatures(
  subscriptionsData: any[],
  planFeaturesData: any[],
  options: SeedOptions = {}
) {
  const { verbose = true } = options;

  const subscriptionFeaturesData = [];

  // Copy plan features to subscriptions
  for (const subscription of subscriptionsData) {
    const planFeats = planFeaturesData.filter(f => f.planId === subscription.planId);
    
    for (const planFeature of planFeats) {
      subscriptionFeaturesData.push({
        subscriptionId: subscription.id,
        planFeatureId: planFeature.id,
        featureKey: planFeature.featureKey,
        featureValue: planFeature.featureValue,
        isEnabled: planFeature.isEnabled,
        metadata: {},
      });
    }
  }

  const createdSubFeatures = [];

  for (const subFeatureData of subscriptionFeaturesData) {
    const existing = await checkExists(
      subscriptionFeatures,
      and(
        eq(subscriptionFeatures.subscriptionId, subFeatureData.subscriptionId),
        eq(subscriptionFeatures.featureKey, subFeatureData.featureKey)
      )
    );

    if (existing) {
      if (verbose) console.log(`✓ Subscription feature already exists`);
      createdSubFeatures.push(existing);
    } else {
      const [newSubFeature] = await db.insert(subscriptionFeatures).values(subFeatureData).returning();
      if (verbose) console.log(`✓ Created subscription feature`);
      createdSubFeatures.push(newSubFeature);
    }
  }

  return createdSubFeatures;
}

/**
 * Seed subscription usages
 */
export async function seedSubscriptionUsages(
  subscriptionsData: any[],
  tenantsData: any[],
  options: SeedOptions = {}
) {
  const { verbose = true } = options;

  const usagesData = [];

  for (const subscription of subscriptionsData) {
    const tenant = tenantsData.find(t => t.id === subscription.tenantId);
    if (!tenant) continue;

    // Create usage records for key features
    const features = [
      { key: "messages_sent", limit: subscription.planId === subscriptionsData[0].planId ? 100 : 10000, count: 25 },
      { key: "api_calls", limit: null, count: 150 },
      { key: "whatsapp_instances", limit: subscription.planId === subscriptionsData[0].planId ? 1 : 5, count: 1 },
      { key: "contacts", limit: null, count: 5 },
      { key: "campaigns", limit: null, count: 0 },
    ];

    for (const feature of features) {
      usagesData.push({
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        featureKey: feature.key,
        usageCount: feature.count,
        limit: feature.limit,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        metadata: {},
      });
    }
  }

  const createdUsages = [];

  for (const usageData of usagesData) {
    const existing = await checkExists(
      subscriptionUsages,
      and(
        eq(subscriptionUsages.subscriptionId, usageData.subscriptionId),
        eq(subscriptionUsages.featureKey, usageData.featureKey)
      )
    );

    if (existing) {
      if (verbose) console.log(`✓ Subscription usage already exists`);
      createdUsages.push(existing);
    } else {
      const [newUsage] = await db.insert(subscriptionUsages).values(usageData).returning();
      if (verbose) console.log(`✓ Created subscription usage for ${usageData.featureKey}`);
      createdUsages.push(newUsage);
    }
  }

  return createdUsages;
}

/**
 * Seed invoices
 */
export async function seedInvoices(
  tenantsData: any[],
  subscriptionsData: any[],
  options: SeedOptions = {}
) {
  const { verbose = true } = options;

  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 7);

  const invoicesData = [
    // Invoice for Pro subscription
    {
      invoiceNumber: `INV-${Date.now()}-001`,
      tenantId: tenantsData[1].id,
      subscriptionId: subscriptionsData[1]?.id,
      status: "paid",
      subtotal: "49.00",
      tax: "0.00",
      discount: "0.00",
      total: "49.00",
      currency: "USD",
      dueDate,
      paidAt: now,
      metadata: { source: "seed" },
    },
  ];

  const createdInvoices = [];

  for (const invoiceData of invoicesData) {
    if (!invoiceData.subscriptionId) continue;

    const existing = await checkExists(
      invoices,
      eq(invoices.invoiceNumber, invoiceData.invoiceNumber)
    );

    if (existing) {
      if (verbose) console.log(`✓ Invoice ${invoiceData.invoiceNumber} already exists`);
      createdInvoices.push(existing);
    } else {
      const [newInvoice] = await db.insert(invoices).values(invoiceData).returning();
      if (verbose) console.log(`✓ Created invoice: ${invoiceData.invoiceNumber}`);
      createdInvoices.push(newInvoice);
    }
  }

  return createdInvoices;
}

/**
 * Seed invoice items
 */
export async function seedInvoiceItems(
  invoicesData: any[],
  plansData: any[],
  options: SeedOptions = {}
) {
  const { verbose = true } = options;

  const invoiceItemsData = [];

  for (const invoice of invoicesData) {
    // Find the subscription and plan for this invoice
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, invoice.subscriptionId!))
      .limit(1);

    if (subscription) {
      const plan = plansData.find(p => p.id === subscription.planId);
      if (plan) {
        invoiceItemsData.push({
          invoiceId: invoice.id,
          itemableType: "plan",
          itemableId: plan.id,
          description: plan.description,
          quantity: 1,
          unitPrice: plan.price,
          amount: plan.price,
          taxRate: "0.00",
          taxAmount: "0.00",
          discountAmount: "0.00",
          metadata: {},
        });
      }
    }
  }

  const createdInvoiceItems = [];

  for (const itemData of invoiceItemsData) {
    const [newItem] = await db.insert(invoiceItems).values(itemData).returning();
    if (verbose) console.log(`✓ Created invoice item`);
    createdInvoiceItems.push(newItem);
  }

  return createdInvoiceItems;
}

/**
 * Seed payments
 */
export async function seedPayments(
  tenantsData: any[],
  invoicesData: any[],
  options: SeedOptions = {}
) {
  const { verbose = true } = options;

  const now = new Date();

  const paymentsData = [];

  for (const invoice of invoicesData) {
    if (invoice.status === "paid") {
      paymentsData.push({
        paymentNumber: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        status: "completed",
        amount: invoice.total,
        currency: invoice.currency,
        paymentMethod: "free_plan",
        paymentGateway: "none",
        transactionId: `txn_seed_${Date.now()}`,
        paymentDate: now,
        metadata: { source: "seed" },
      });
    }
  }

  const createdPayments = [];

  for (const paymentData of paymentsData) {
    const existing = await checkExists(
      payments,
      eq(payments.paymentNumber, paymentData.paymentNumber)
    );

    if (existing) {
      if (verbose) console.log(`✓ Payment ${paymentData.paymentNumber} already exists`);
      createdPayments.push(existing);
    } else {
      const [newPayment] = await db.insert(payments).values(paymentData).returning();
      if (verbose) console.log(`✓ Created payment: ${paymentData.paymentNumber}`);
      createdPayments.push(newPayment);
    }
  }

  return createdPayments;
}

/**
 * Main seed function
 */
export async function seedDatabase(options: SeedOptions = {}) {
  const { verbose = true } = options;

  try {
    if (verbose) console.log("🌱 Starting database seeding...\n");

    // Seed in order of dependencies
    if (verbose) console.log("📝 Seeding core data...");
    const usersData = await seedUsers(options);
    const tenantsData = await seedTenants(options);
    await seedUserTenantRoles(usersData, tenantsData, options);
    const instancesData = await seedWhatsAppInstances(usersData, tenantsData, options);
    const contactsData = await seedContacts(tenantsData, options);
    const groupsData = await seedGroups(tenantsData, options);
    await seedGroupContacts(groupsData, contactsData, options);
    await seedMessageTemplates(tenantsData, options);
    await seedWebhooks(tenantsData, options);

    if (verbose) console.log("\n💳 Seeding subscription data...");
    const plansData = await seedPlans(options);
    const planFeaturesData = await seedPlanFeatures(plansData, options);
    const subscriptionsData = await seedSubscriptions(tenantsData, plansData, options);
    await seedSubscriptionFeatures(subscriptionsData, planFeaturesData, options);
    await seedSubscriptionUsages(subscriptionsData, tenantsData, options);

    if (verbose) console.log("\n💰 Seeding billing data...");
    const invoicesData = await seedInvoices(tenantsData, subscriptionsData, options);
    await seedInvoiceItems(invoicesData, plansData, options);
    await seedPayments(tenantsData, invoicesData, options);

    if (verbose) {
      console.log("\n=== Database seeding completed successfully! ===");
      console.log("\nSummary:");
      console.log(`  - ${usersData.length} users`);
      console.log(`  - ${tenantsData.length} tenants`);
      console.log(`  - ${instancesData.length} WhatsApp instances`);
      console.log(`  - ${contactsData.length} contacts`);
      console.log(`  - ${groupsData.length} groups`);
      console.log(`  - ${plansData.length} plans`);
      console.log(`  - ${planFeaturesData.length} plan features`);
      console.log(`  - ${subscriptionsData.length} subscriptions`);
      console.log(`  - ${invoicesData.length} invoices`);
      console.log("  - Database ready for use!\n");
      
      console.log("Test Credentials:");
      console.log("  Email: admin@example.com");
      console.log("  Password: Admin123!\n");
      
      console.log("Landing Page:");
      console.log("  Visit http://localhost:3000/en to see pricing");
      console.log(`  ${plansData.length} plans available for signup\n`);
    }

    return {
      users: usersData,
      tenants: tenantsData,
      instances: instancesData,
      contacts: contactsData,
      groups: groupsData,
      plans: plansData,
      planFeatures: planFeaturesData,
      subscriptions: subscriptionsData,
      invoices: invoicesData,
    };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

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
  return existing || null;
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
 * Main seed function
 */
export async function seedDatabase(options: SeedOptions = {}) {
  const { verbose = true } = options;

  try {
    if (verbose) console.log("🌱 Starting database seeding...\n");

    // Seed in order of dependencies
    const usersData = await seedUsers(options);
    const tenantsData = await seedTenants(options);
    await seedUserTenantRoles(usersData, tenantsData, options);
    const instancesData = await seedWhatsAppInstances(usersData, tenantsData, options);
    const contactsData = await seedContacts(tenantsData, options);
    const groupsData = await seedGroups(tenantsData, options);
    await seedGroupContacts(groupsData, contactsData, options);
    await seedMessageTemplates(tenantsData, options);
    await seedWebhooks(tenantsData, options);

    if (verbose) {
      console.log("\n✅ Database seeding completed successfully!");
      console.log(`\nCreated/Found:`);
      console.log(`  - ${usersData.length} users`);
      console.log(`  - ${tenantsData.length} tenants`);
      console.log(`  - ${instancesData.length} WhatsApp instances`);
      console.log(`  - ${contactsData.length} contacts`);
      console.log(`  - ${groupsData.length} groups`);
    }

    return {
      users: usersData,
      tenants: tenantsData,
      instances: instancesData,
      contacts: contactsData,
      groups: groupsData,
    };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

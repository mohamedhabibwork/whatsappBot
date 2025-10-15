# Database Seeder Guide

## Overview

The database seeder now includes comprehensive data for the entire application, including subscription plans, features, invoices, and payments to support the complete workflow.

## What's Included in the Seeder

### 1. **Core Data**
- ✅ **3 Users** (admin, user1, user2)
- ✅ **2 Tenants** (Acme Corporation, Tech Startup Inc)
- ✅ **User-Tenant Roles** (owner, admin, member assignments)
- ✅ **2 WhatsApp Instances** (connected and ready)
- ✅ **5 Contacts** (distributed across tenants)
- ✅ **3 Groups** (VIP Customers, Newsletter Subscribers, Beta Testers)
- ✅ **Group-Contact Relationships**
- ✅ **3 Message Templates** (Welcome, Order Confirmation, Beta Invitation)
- ✅ **2 Webhooks** (Campaign and Contact notifications)

### 2. **Subscription Plans** (NEW)
- ✅ **Free Plan** ($0/month)
  - 100 messages/month
  - 1 WhatsApp instance
  - 1 user
  - Community support
  - Bilingual (EN/AR)

- ✅ **Pro Plan** ($49/month) - Most Popular
  - 10,000 messages/month
  - 5 WhatsApp instances
  - 5 users
  - 7-day trial
  - Priority support
  - Advanced analytics
  - Bilingual (EN/AR)

- ✅ **Enterprise Plan** ($199/month)
  - Unlimited messages
  - Unlimited instances
  - Unlimited users
  - 14-day trial
  - Dedicated 24/7 support
  - Custom integrations
  - Bilingual (EN/AR)

### 3. **Plan Features** (NEW)
- ✅ **13 detailed features** across all plans
- ✅ Bilingual descriptions (English & Arabic)
- ✅ Feature keys for validation (messages_sent, whatsapp_instances, support_level, etc.)
- ✅ Display order for UI rendering

### 4. **Active Subscriptions** (NEW)
- ✅ **Acme Corp** → Free Plan (Active)
- ✅ **Tech Startup** → Pro Plan (Active, in trial period)
- ✅ Current period dates set
- ✅ Trial periods configured

### 5. **Subscription Features** (NEW)
- ✅ All plan features copied to active subscriptions
- ✅ Feature values and limits applied
- ✅ Ready for usage tracking

### 6. **Usage Tracking** (NEW)
- ✅ Usage counters initialized for all subscriptions
- ✅ Tracks: messages_sent, api_calls, whatsapp_instances, contacts, campaigns
- ✅ Current usage: 25 messages sent (Free), 25 messages sent (Pro)
- ✅ Limits applied based on plan

### 7. **Invoices & Payments** (NEW)
- ✅ Invoice generated for Pro plan subscription
- ✅ Invoice status: Paid
- ✅ Invoice items with plan details
- ✅ Payment record with transaction details
- ✅ Complete billing workflow example

## How to Run the Seeder

### Option 1: Using the Seed Script

```bash
# From packages/database directory
cd packages/database
bun run seed

# Or from project root
bun run --cwd packages/database seed
```

### Option 2: Using Drizzle Studio

```bash
# Push schema and run seed
cd packages/database
bun run db:push
bun run seed
```

### Option 3: Programmatically

```typescript
import { seedDatabase } from '@repo/database/seed';

// Run with default options (verbose = true)
await seedDatabase();

// Run silently
await seedDatabase({ verbose: false });

// Returns seeded data
const result = await seedDatabase();
console.log(result.plans); // Access plans
console.log(result.subscriptions); // Access subscriptions
```

## Expected Output

```
🌱 Starting database seeding...

📝 Seeding core data...
✓ User admin@example.com already exists
✓ User user1@example.com already exists
✓ User user2@example.com already exists
✓ Tenant acme-corp already exists
✓ Tenant tech-startup already exists
...

💳 Seeding subscription data...
✓ Created plan: Free
✓ Created plan: Pro
✓ Created plan: Enterprise
✓ Created plan feature: Basic Messaging
✓ Created plan feature: Single WhatsApp Instance
...
✓ Created subscription for tenant
✓ Created subscription feature
✓ Created subscription usage for messages_sent
...

💰 Seeding billing data...
✓ Created invoice: INV-1234567890-001
✓ Created invoice item
✓ Created payment: PAY-1234567890-123

=== Database seeding completed successfully! ===

Summary:
  - 3 users
  - 2 tenants
  - 2 WhatsApp instances
  - 5 contacts
  - 3 groups
  - 3 plans
  - 13 plan features
  - 2 subscriptions
  - 1 invoices
  - Database ready for use!

Test Credentials:
  Email: admin@example.com
  Password: Admin123!

Landing Page:
  Visit http://localhost:3000/en to see pricing
  3 plans available for signup
```

## Test Credentials

| Email | Password | Tenants | Role |
|-------|----------|---------|------|
| admin@example.com | Admin123! | Acme Corp, Tech Startup | Owner |
| user1@example.com | User123! | Acme Corp, Tech Startup | Admin/Member |
| user2@example.com | User123! | Acme Corp | Member |

## Data Relationships

```
Plans (3)
  ├─ Plan Features (13)
  └─ Subscriptions (2)
      ├─ Subscription Features (copied from Plan Features)
      ├─ Subscription Usages (5 per subscription)
      └─ Invoices (1 for Pro plan)
          ├─ Invoice Items (1)
          └─ Payments (1)

Tenants (2)
  ├─ Users (via User-Tenant Roles)
  ├─ WhatsApp Instances (1 per tenant)
  ├─ Contacts (2-3 per tenant)
  ├─ Groups (1-2 per tenant)
  ├─ Message Templates (1-2 per tenant)
  ├─ Webhooks (1 per tenant)
  └─ Subscriptions (1 per tenant)
```

## Verification Queries

### Check Plans
```sql
SELECT 
  name->>'en' as name_en, 
  name->>'ar' as name_ar,
  price, 
  billing_cycle,
  max_messages_per_month,
  is_active,
  is_public
FROM plans;
```

### Check Subscriptions
```sql
SELECT 
  t.name as tenant,
  p.name->>'en' as plan,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.price
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
JOIN plans p ON s.plan_id = p.id;
```

### Check Usage
```sql
SELECT 
  t.name as tenant,
  su.feature_key,
  su.usage_count,
  su.limit
FROM subscription_usages su
JOIN tenants t ON su.tenant_id = t.id
ORDER BY t.name, su.feature_key;
```

### Check Invoices
```sql
SELECT 
  i.invoice_number,
  t.name as tenant,
  i.status,
  i.total,
  i.paid_at
FROM invoices i
JOIN tenants t ON i.tenant_id = t.id;
```

## Using Seeded Data

### In Your Application

#### 1. Test Authentication
```typescript
// Login with seeded user
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'Admin123!'
  })
});
```

#### 2. Fetch Plans (Landing Page)
```typescript
// This will return the 3 seeded plans
const plans = await trpc.plans.list.query({
  includeInactive: false,
  includePrivate: false,
});
// Returns: Free, Pro, Enterprise plans
```

#### 3. Check Subscription
```typescript
// For Acme Corp (tenant)
const subscription = await trpc.subscriptions.getActive.query({
  tenantId: 'acme-tenant-id'
});
// Returns: Free plan subscription
```

#### 4. Check Usage
```typescript
// For Tech Startup (tenant)
const usage = await trpc.subscriptions.getUsageStats.query({
  tenantId: 'tech-startup-id'
});
// Returns: Current usage for all features
```

## Customizing the Seeder

### Adding More Plans

Edit `packages/database/src/seed/index.ts`:

```typescript
// In seedPlans function
const plansData = [
  // ... existing plans
  {
    name: { en: "Starter", ar: "البداية" },
    description: { en: "For small teams", ar: "للفرق الصغيرة" },
    price: "19",
    currency: "USD",
    billingCycle: "monthly",
    trialDays: 3,
    isActive: true,
    isPublic: true,
    maxUsers: 3,
    maxWhatsappInstances: 2,
    maxMessagesPerMonth: 1000,
    metadata: { tier: "starter" },
  },
];
```

### Adding Plan Features

```typescript
// In seedPlanFeatures function
const featuresData = [
  // ... existing features
  {
    planId: plansData[0].id, // Target plan
    name: { en: "Email Notifications", ar: "إشعارات البريد الإلكتروني" },
    description: { en: "Real-time email alerts", ar: "تنبيهات بريد فورية" },
    featureKey: "email_notifications",
    featureValue: "enabled",
    isEnabled: true,
    displayOrder: 5,
  },
];
```

### Modifying Test Users

```typescript
// In seedUsers function
const usersData = [
  // ... existing users
  {
    email: "developer@example.com",
    name: "Developer User",
    password: await hashPassword("Dev123!"),
    emailVerified: true,
  },
];
```

## Resetting the Database

### Option 1: Drop and Recreate
```bash
# From packages/database
bun run db:push --force
bun run seed
```

### Option 2: Clear Specific Tables
```sql
-- Clear subscription data
TRUNCATE TABLE 
  payments,
  invoice_items,
  invoices,
  subscription_usages,
  subscription_features,
  subscriptions,
  plan_features,
  plans
CASCADE;

-- Then run seeder
bun run seed
```

## Troubleshooting

### Issue: "Plans already exist"
**Solution**: The seeder is idempotent - it won't create duplicates. If you see this message, plans are already seeded.

### Issue: "Foreign key constraint violation"
**Solution**: Ensure you run the full seeder, not individual functions. The order matters:
1. Core data (users, tenants)
2. Plans and features
3. Subscriptions
4. Invoices and payments

### Issue: "Landing page shows no plans"
**Checks**:
1. Run seeder: `bun run --cwd packages/database seed`
2. Verify plans in DB: `SELECT * FROM plans WHERE is_public = true AND is_active = true;`
3. Check API is running: `http://localhost:3001/trpc/plans.list`
4. Verify `NEXT_PUBLIC_API_URL` in web app

### Issue: "Bilingual data not displaying"
**Solution**: Plans have bilingual name/description. Access like:
```typescript
plan.name.en // English
plan.name.ar // Arabic
```

## Integration with Landing Page

The seeded data is designed to work seamlessly with the landing page:

### 1. **Dynamic Pricing Display**
The 3 plans (Free, Pro, Enterprise) will appear in the pricing section with:
- Bilingual names and descriptions
- Feature lists
- Proper pricing ($0, $49, $199)
- "Most Popular" badge on Pro plan

### 2. **Plan Selection**
Clicking "Get Started" on any plan routes to:
```
/signup?plan=<plan-uuid>
```

### 3. **Signup Integration**
The signup page fetches plan details using:
```typescript
trpc.plans.getById.useQuery({ id: planId })
```

### 4. **Subscription Creation**
After signup, the subscription workflow:
- Free Plan → Immediate activation
- Pro/Enterprise → Pending, awaiting payment

## Next Steps

After seeding:

1. **Start the Backend**
   ```bash
   cd apps/api
   bun run dev
   ```

2. **Start the Web App**
   ```bash
   cd apps/web
   bun run dev
   ```

3. **Visit Landing Page**
   - http://localhost:3000/en
   - http://localhost:3000/ar

4. **Test the Flow**
   - View pricing (should show 3 plans)
   - Click "Get Started" on a plan
   - See plan details in signup form

5. **Implement Authentication**
   - Add auth.signup mutation
   - Add auth.login mutation
   - Connect to signup/login pages

## Benefits of Complete Seeder

✅ **Ready for Demo** - Full pricing immediately visible  
✅ **Test Workflows** - Subscriptions, invoices, payments all set up  
✅ **Realistic Data** - Usage tracking, billing records  
✅ **Bilingual** - All content in EN/AR  
✅ **No Manual Setup** - One command and you're ready  
✅ **Idempotent** - Safe to run multiple times  
✅ **Type-Safe** - All data properly typed  

## Summary

Your database is now fully seeded with:
- **3 subscription plans** ready for the landing page
- **13 plan features** with bilingual content
- **2 active subscriptions** demonstrating free and paid workflows
- **Complete usage tracking** for feature limits
- **Sample invoice and payment** showing billing workflow
- **Test users** with pre-configured access

Everything is ready for development and testing! 🚀

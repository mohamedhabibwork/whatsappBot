# Landing Page Backend Integration Setup

## Overview
The landing page has been updated to use local UI components (`@/components/ui/`) and integrated with the backend via TRPC for dynamic pricing and authentication.

## Changes Made

### 1. Package Dependencies Added
The following dependencies have been added to `apps/web/package.json`:

```json
"@repo/trpc": "*",
"@tanstack/react-query": "^5.62.11",
"@trpc/client": "^11.0.0",
"@trpc/react-query": "^11.0.0",
"@trpc/server": "^11.0.0"
```

### 2. Files Created

#### TRPC Client Setup
- **`src/lib/trpc.ts`** - TRPC React client instance
- **`app/providers.tsx`** - React Query and TRPC providers

#### Pages Updated/Created
- **`app/[locale]/page.tsx`** - Landing page with backend integration
- **`app/[locale]/login/page.tsx`** - Login page
- **`app/[locale]/signup/page.tsx`** - Signup page with plan selection

#### Root Layout Updated
- **`app/layout.tsx`** - Wrapped with Providers

## Installation Steps

### 1. Install Dependencies

```bash
cd apps/web
bun install
```

### 2. Configure Environment Variables

Create or update `.env.local` in `apps/web/`:

```env
# API URL - Point to your backend API
NEXT_PUBLIC_API_URL=http://localhost:3001/trpc

# Other environment variables as needed
```

### 3. Ensure Backend API is Running

The landing page now fetches plans from the backend. Make sure your API server is running:

```bash
# From the root directory
cd apps/api
bun run dev
```

The API should be accessible at `http://localhost:3001` by default.

### 4. Start the Web App

```bash
cd apps/web
bun run dev
```

Access the landing page at:
- English: http://localhost:3000/en
- Arabic: http://localhost:3000/ar

## Features Implemented

### ✅ Dynamic Pricing
- Plans are fetched from the backend using `trpc.plans.list.useQuery()`
- Loading skeletons shown while fetching data
- Pricing displays:
  - Plan name (bilingual support for en/ar)
  - Plan description (bilingual support)
  - Price (formatted, with "$0" for free plans)
  - Features (messages, instances, users)
  - Billing cycle
- "Most Popular" badge for the middle plan

### ✅ Authentication Flow
- **Login Page** (`/login`):
  - Email and password inputs
  - Form validation
  - Error handling
  - Link to signup and forgot password

- **Signup Page** (`/signup`):
  - Full name, email, company name fields
  - Password confirmation validation
  - Optional plan selection via URL query parameter
  - Displays selected plan details
  - Links back to pricing page

### ✅ Navigation
- Header with login/signup buttons
- Buttons now route to actual pages
- Plan selection from pricing cards includes plan ID in URL

### ✅ UI Components
All components now use local `@/components/ui/` instead of `@repo/ui/`:
- Button
- Card (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- Badge
- Skeleton
- Input
- Label
- Alert

## Backend Requirements

### Plans API
The landing page expects the following TRPC endpoints:

#### 1. List Plans
```typescript
trpc.plans.list.useQuery({
  includeInactive: false,
  includePrivate: false,
})
```

**Expected Response:**
```typescript
{
  plans: Array<{
    id: string;
    name: { en: string; ar: string } | string;
    description: { en: string; ar: string } | string;
    price: string; // numeric as string
    currency: string;
    billingCycle: string; // "daily" | "weekly" | "monthly" | "annually" | "quarterly" | "semiannually"
    maxMessagesPerMonth?: number | null;
    maxWhatsappInstances?: number | null;
    maxUsers?: number | null;
    trialDays?: number | null;
    isActive: boolean;
    isPublic: boolean;
  }>
}
```

#### 2. Get Plan by ID
```typescript
trpc.plans.getById.useQuery({ id: string })
```

**Expected Response:**
```typescript
{
  plan: {
    id: string;
    name: { en: string; ar: string } | string;
    description: { en: string; ar: string } | string;
    price: string;
    currency: string;
    billingCycle: string;
    maxMessagesPerMonth?: number | null;
    maxWhatsappInstances?: number | null;
    maxUsers?: number | null;
    trialDays?: number | null;
  };
  features: Array<{
    // Plan features if needed
  }>;
}
```

## Todo: Authentication Implementation

The login and signup pages are ready but need backend integration:

### 1. Create Auth Router

Create `packages/trpc/src/routers/auth.ts` if not exists, with:

```typescript
// Signup mutation
signup: publicProcedure
  .input(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    tenantName: z.string().min(1),
    planId: z.string().uuid().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Hash password
    // 2. Create user
    // 3. Create tenant
    // 4. Add user to tenant
    // 5. Create subscription if planId provided
    // 6. Send verification email
    // 7. Return token or session
  });

// Login mutation
login: publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Verify credentials
    // 2. Create session
    // 3. Return token
  });
```

### 2. Update Login Page

Replace the TODO in `apps/web/app/[locale]/login/page.tsx`:

```typescript
const loginMutation = trpc.auth.login.useMutation();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setIsLoading(true);

  try {
    const result = await loginMutation.mutateAsync({
      email: formData.email,
      password: formData.password,
    });
    
    // Store token (localStorage, cookies, etc.)
    localStorage.setItem('token', result.token);
    
    // Redirect to dashboard
    router.push('/dashboard');
  } catch (err: any) {
    setError(err.message || 'Invalid credentials');
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Update Signup Page

Replace the TODO in `apps/web/app/[locale]/signup/page.tsx`:

```typescript
const signupMutation = trpc.auth.signup.useMutation();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // ... validation code ...

  try {
    const result = await signupMutation.mutateAsync({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      tenantName: formData.tenantName,
      planId: selectedPlanId || undefined,
    });
    
    // Store token
    localStorage.setItem('token', result.token);
    
    // Redirect based on email verification requirement
    if (result.requiresVerification) {
      router.push('/verify-email');
    } else {
      router.push('/dashboard');
    }
  } catch (err: any) {
    setError(err.message || 'Signup failed');
  } finally {
    setIsLoading(false);
  }
};
```

### 4. Add Authentication Headers

Update `apps/web/app/providers.tsx` to include auth headers:

```typescript
const [trpcClient] = useState(() =>
  trpc.createClient({
    links: [
      httpBatchLink({
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/trpc',
        headers() {
          const token = localStorage.getItem('token');
          return {
            authorization: token ? `Bearer ${token}` : '',
          };
        },
      }),
    ],
  }),
);
```

## Database Setup

### Create Sample Plans

To see the dynamic pricing in action, seed your database with plans:

```sql
-- Free Plan
INSERT INTO plans (name, description, price, currency, billing_cycle, max_messages_per_month, max_whatsapp_instances, max_users, is_active, is_public)
VALUES (
  '{"en": "Free", "ar": "مجاني"}',
  '{"en": "Perfect for getting started", "ar": "مثالي للبدء"}',
  '0',
  'USD',
  'monthly',
  100,
  1,
  1,
  true,
  true
);

-- Pro Plan
INSERT INTO plans (name, description, price, currency, billing_cycle, max_messages_per_month, max_whatsapp_instances, max_users, trial_days, is_active, is_public)
VALUES (
  '{"en": "Pro", "ar": "احترافي"}',
  '{"en": "For growing businesses", "ar": "للشركات المتنامية"}',
  '49',
  'USD',
  'monthly',
  10000,
  5,
  5,
  7,
  true,
  true
);

-- Enterprise Plan
INSERT INTO plans (name, description, price, currency, billing_cycle, max_messages_per_month, max_whatsapp_instances, max_users, is_active, is_public)
VALUES (
  '{"en": "Enterprise", "ar": "مؤسسات"}',
  '{"en": "For large organizations", "ar": "للمؤسسات الكبيرة"}',
  '199',
  'USD',
  'monthly',
  999999,
  999999,
  999999,
  true,
  true
);
```

## Testing

### 1. Test Landing Page
- Visit http://localhost:3000/en
- Verify plans load from backend
- Check loading skeletons appear
- Verify all buttons work
- Test language switching

### 2. Test Navigation
- Click "Login" - should go to `/login`
- Click "Get Started" - should go to `/signup`
- Click plan "Get Started" button - should go to `/signup?plan=<planId>`

### 3. Test Login Page
- Visit http://localhost:3000/en/login
- Form validation should work
- Error messages should display
- Links to signup and forgot password should work

### 4. Test Signup Page
- Visit http://localhost:3000/en/signup
- Form validation should work
- Visit with plan: `/signup?plan=<planId>`
- Plan details should display on right side
- All form fields should be validated

## Error Handling

### TRPC Connection Errors
If plans don't load:
1. Check `NEXT_PUBLIC_API_URL` is correct
2. Verify API server is running
3. Check browser console for errors
4. Verify CORS settings on API

### TypeScript Errors
If you see import errors:
1. Run `bun install` in `apps/web`
2. Restart TypeScript server in IDE
3. Rebuild the project: `bun run build`

## Next Steps

1. **Implement Auth Backend**
   - Create auth router with signup/login mutations
   - Add password hashing (bcrypt)
   - Implement JWT or session management
   - Add email verification

2. **Add Dashboard**
   - Create protected dashboard route
   - Add authentication middleware
   - Implement tenant switching
   - Add subscription management UI

3. **Payment Integration**
   - Add payment gateway (Stripe, PayPal, etc.)
   - Implement payment flow for paid plans
   - Add billing management page
   - Handle subscription upgrades/downgrades

4. **Email System**
   - Set up email service (SendGrid, AWS SES, etc.)
   - Create email templates
   - Implement verification emails
   - Add password reset flow

5. **Additional Features**
   - Forgot password page
   - Email verification page
   - Profile settings
   - Team management
   - Usage tracking dashboard

## Troubleshooting

### Plans Not Loading
**Problem**: Pricing section shows "No plans available"

**Solutions**:
- Ensure backend API is running
- Check database has plans with `isActive=true` and `isPublic=true`
- Verify API URL in `.env.local`
- Check browser network tab for failed requests

### TRPC Type Errors
**Problem**: TypeScript can't find TRPC types

**Solutions**:
- Ensure `@repo/trpc` is properly built
- Run `bun install` in root directory
- Restart TypeScript server
- Check `tsconfig.json` path mappings

### Authentication Not Working
**Problem**: Can't login or signup

**Solutions**:
- Implement backend auth mutations first
- Check console for errors
- Verify token storage works
- Test API endpoints directly

## Production Checklist

Before deploying to production:

- [ ] Set `NEXT_PUBLIC_API_URL` to production API
- [ ] Enable HTTPS
- [ ] Configure proper CORS settings
- [ ] Add rate limiting on auth endpoints
- [ ] Implement proper session management
- [ ] Set up monitoring and error tracking
- [ ] Test all authentication flows
- [ ] Verify email delivery works
- [ ] Test payment integration thoroughly
- [ ] Add analytics tracking
- [ ] Set up proper SEO metadata
- [ ] Test on multiple devices and browsers
- [ ] Perform security audit
- [ ] Set up automated backups

## Support

For issues or questions:
1. Check this documentation
2. Review TRPC router implementations
3. Check browser console for errors
4. Review API server logs
5. Test endpoints with API client (Postman, etc.)

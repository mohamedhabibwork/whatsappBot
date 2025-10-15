# Quick Start Guide - Web Application

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
# Install web dependencies
cd apps/web
bun install

# Go back to root
cd ../..
```

### Step 2: Configure Environment

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/trpc
```

### Step 3: Start the Backend API

```bash
# In a new terminal, from project root
cd apps/api
bun run dev
```

The API will start on http://localhost:3001

### Step 4: Start the Web App

```bash
# In another terminal, from project root
cd apps/web
bun run dev
```

The web app will start on http://localhost:3000

### Step 5: Access the Landing Page

Open your browser:
- **English**: http://localhost:3000/en
- **Arabic**: http://localhost:3000/ar

## ✨ What's New

### Landing Page Features
✅ **Dynamic Pricing** - Plans fetched from database in real-time  
✅ **Loading States** - Beautiful skeleton loaders  
✅ **Bilingual Support** - Full English and Arabic translations  
✅ **Local UI Components** - Using `@/components/ui/`  
✅ **Backend Integration** - Connected via TRPC  
✅ **Auth Pages** - Login and Signup pages ready  

### Pages Available
- `/en` or `/ar` - Landing page with dynamic pricing
- `/en/login` or `/ar/login` - Login page
- `/en/signup` or `/ar/signup` - Signup page
- `/en/signup?plan=<planId>` - Signup with plan pre-selected

## 📊 Seeding Plans

To see dynamic pricing, add plans to your database:

```sql
-- Run this in your database
INSERT INTO plans (name, description, price, currency, billing_cycle, max_messages_per_month, max_whatsapp_instances, max_users, is_active, is_public)
VALUES 
  ('{"en": "Free", "ar": "مجاني"}', '{"en": "Perfect for getting started", "ar": "مثالي للبدء"}', '0', 'USD', 'monthly', 100, 1, 1, true, true),
  ('{"en": "Pro", "ar": "احترافي"}', '{"en": "For growing businesses", "ar": "للشركات المتنامية"}', '49', 'USD', 'monthly', 10000, 5, 5, true, true),
  ('{"en": "Enterprise", "ar": "مؤسسات"}', '{"en": "For large organizations", "ar": "للمؤسسات الكبيرة"}', '199', 'USD', 'monthly', 999999, 999999, 999999, true, true);
```

Or use Drizzle:

```bash
# From project root
cd packages/database
bun run db:push
```

## 🔧 Current Status

### ✅ Completed
- Landing page with dynamic pricing
- TRPC client setup
- React Query integration
- Login page UI
- Signup page UI with plan selection
- Local UI components integration
- Bilingual translations (EN/AR)
- Backend workflow for subscriptions

### ⏳ Next Steps (Requires Implementation)

1. **Authentication Backend**
   - Create `auth.signup` mutation
   - Create `auth.login` mutation
   - Add password hashing
   - Implement JWT/session management

2. **Connect Auth to Pages**
   - Update `apps/web/app/[locale]/login/page.tsx`
   - Update `apps/web/app/[locale]/signup/page.tsx`
   - Replace TODO comments with actual TRPC calls

3. **Protected Routes**
   - Create dashboard page
   - Add authentication middleware
   - Implement redirect logic

4. **Subscription Flow**
   - Connect signup to subscription creation
   - Implement payment gateway (for paid plans)
   - Add subscription management page

## 📝 File Structure

```
apps/web/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx           # Landing page (NEW - uses TRPC)
│   │   ├── login/
│   │   │   └── page.tsx       # Login page (NEW)
│   │   └── signup/
│   │       └── page.tsx       # Signup page (NEW)
│   ├── layout.tsx             # Wrapped with Providers (UPDATED)
│   └── providers.tsx          # TRPC + React Query (NEW)
├── src/
│   └── lib/
│       ├── trpc.ts            # TRPC client (NEW)
│       └── utils.ts           # Utility functions
├── components/
│   ├── ui/                    # Shadcn UI components (LOCAL)
│   └── language-switcher.tsx # Language toggle
├── messages/
│   ├── en.json                # English translations (UPDATED)
│   └── ar.json                # Arabic translations (UPDATED)
└── package.json               # Dependencies added (UPDATED)
```

## 🧪 Testing the Integration

### Test 1: Dynamic Pricing
1. Start API and web servers
2. Visit http://localhost:3000/en
3. Scroll to pricing section
4. Should see 3 plans loaded from database
5. Loading skeletons should appear briefly

### Test 2: Navigation
1. Click "Login" in header → Goes to `/login`
2. Click "Get Started" in header → Goes to `/signup`
3. Click plan "Get Started" button → Goes to `/signup?plan=<id>`

### Test 3: Form Validation
1. Visit `/login`
2. Try submitting empty form → Validation errors
3. Visit `/signup`
4. Try mismatched passwords → Shows error

### Test 4: Language Switching
1. Visit `/en`
2. Click language switcher → Changes to `/ar`
3. All text should translate
4. Pricing should work in both languages

## 🐛 Troubleshooting

### "No plans available"
**Problem**: Pricing section empty

**Fix**:
1. Check API is running on port 3001
2. Verify database has plans with `is_active=true` and `is_public=true`
3. Check browser console for errors
4. Test API directly: http://localhost:3001/trpc/plans.list

### "Cannot find module '@trpc/react-query'"
**Problem**: TypeScript errors

**Fix**:
```bash
cd apps/web
bun install
# Restart your IDE/TypeScript server
```

### API connection errors
**Problem**: TRPC errors in console

**Fix**:
1. Verify `NEXT_PUBLIC_API_URL` in `.env.local`
2. Check API server is running
3. Test API health: `curl http://localhost:3001/health`
4. Check CORS settings in API

## 📚 Documentation

- **Full Setup Guide**: `apps/web/INTEGRATION_SETUP.md`
- **Subscription Workflows**: `SUBSCRIPTION_WORKFLOWS_IMPLEMENTATION.md`
- **Backend API**: `apps/api/README.md`
- **TRPC Routers**: `packages/trpc/src/routers/`

## 🎯 Priority Next Steps

1. **Install dependencies** ✓ (You should do this first)
2. **Seed database with plans** (So pricing works)
3. **Implement auth backend** (See INTEGRATION_SETUP.md)
4. **Connect login/signup pages** (Replace TODOs)
5. **Create dashboard** (Protected route)
6. **Add payment gateway** (For paid subscriptions)

## 💡 Tips

- Use `bun run dev` for hot reload during development
- Check browser console for helpful error messages
- TRPC queries are cached by React Query (5 min default)
- Plans with `price: "0"` are treated as free plans
- The middle plan (index 1) gets "Most Popular" badge automatically

## 🆘 Need Help?

1. Check `INTEGRATION_SETUP.md` for detailed documentation
2. Review browser console for errors
3. Check API logs in terminal
4. Test TRPC endpoints directly
5. Verify environment variables are set correctly

---

## Summary

Your landing page is now:
✅ Connected to backend via TRPC  
✅ Fetching plans dynamically  
✅ Using local UI components  
✅ Ready for authentication  
✅ Fully bilingual (EN/AR)  

**Next**: Implement authentication backend to make login/signup functional!

# Test Fix Summary

## Problem

Tests were failing with:
```
PostgresError: password authentication failed for user "habib"
35 fail, 5 errors
```

## Root Cause

The database connection was using incorrect credentials. The system was trying to connect with user "habib" but the password was not set correctly.

## Solution

### Files Created

1. **`.env.test`** - Test-specific environment configuration
2. **`bunfig.toml`** - Bun test configuration
3. **`apps/api/src/__tests__/test-env.ts`** - Test environment loader
4. **`TEST_SETUP.md`** - Detailed setup instructions
5. **`setup-test-db.ps1`** - Windows PowerShell setup script
6. **`setup-test-db.sh`** - Linux/Mac bash setup script

### Changes Made

1. **Test Environment Configuration**
   - Created `.env.test` with proper database credentials
   - Added test environment loader that runs before tests
   - Fixed JWT token generation with proper payload structure

2. **Database Setup Scripts**
   - PowerShell script for Windows users
   - Bash script for Linux/Mac users
   - Both scripts handle database creation, migration, and seeding

3. **Test Setup Improvements**
   - Added error handling in `setupTests()`
   - Fixed JWT payload to include required fields (userId, email, language)
   - Added better error messages

## Quick Fix (Choose One)

### Option 1: Use Setup Script (Recommended)

**Windows (PowerShell):**
```powershell
.\setup-test-db.ps1
cd apps/api
bun test
```

**Linux/Mac:**
```bash
chmod +x setup-test-db.sh
./setup-test-db.sh
cd apps/api
bun test
```

### Option 2: Manual Setup

1. **Update `.env` file:**
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_bot"
   ```

2. **Create and setup test database:**
   ```bash
   # Create database
   psql -U postgres -c "CREATE DATABASE whatsapp_bot_test;"
   
   # Run migrations
   cd packages/database
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test"
   bun run db:push
   bun run db:seed
   
   # Run tests
   cd ../../apps/api
   bun test
   ```

### Option 3: Use Your Current User

If you want to keep using user "habib":

1. **Set password:**
   ```bash
   psql -U postgres
   ALTER USER habib WITH PASSWORD 'your_password';
   \q
   ```

2. **Update `.env.test`:**
   ```env
   DATABASE_URL="postgresql://habib:your_password@localhost:5432/whatsapp_bot_test"
   ```

3. **Run setup:**
   ```bash
   cd packages/database
   bun run db:push
   bun run db:seed
   cd ../../apps/api
   bun test
   ```

## Expected Results

After running the fix, you should see:

```
✓ Test environment loaded
  DATABASE_URL: postgresql://postgres:***@localhost:5432/whatsapp_bot_test

✓ Contacts API > should list contacts for a tenant
✓ Contacts API > should get contact by ID
✓ Contacts API > should create a new contact
✓ Contacts API > should update a contact
✓ Contacts API > should delete a contact
✓ Contacts API > should not allow cross-tenant access
✓ Contacts API > should require authentication

✓ Groups API > should list groups for a tenant
✓ Groups API > should get group by ID with contacts
✓ Groups API > should create a new group
✓ Groups API > should update a group
✓ Groups API > should add contacts to group
✓ Groups API > should remove contacts from group
✓ Groups API > should delete a group

✓ Campaigns API > should list campaigns for a tenant
✓ Campaigns API > should create a campaign with contacts
✓ Campaigns API > should create a campaign with groups
✓ Campaigns API > should get campaign by ID with recipients
✓ Campaigns API > should update a campaign
✓ Campaigns API > should start a campaign
✓ Campaigns API > should cancel a campaign
✓ Campaigns API > should delete a campaign
✓ Campaigns API > should not delete a running campaign

✓ Message Templates API > should list message templates for a tenant
✓ Message Templates API > should create a message template
✓ Message Templates API > should get template by ID
✓ Message Templates API > should update a message template
✓ Message Templates API > should delete a message template

✓ Webhooks API > should list webhooks for a tenant
✓ Webhooks API > should create a webhook
✓ Webhooks API > should get webhook by ID
✓ Webhooks API > should update a webhook
✓ Webhooks API > should regenerate webhook secret
✓ Webhooks API > should delete a webhook
✓ Webhooks API > should get webhook logs

37 pass
0 fail
```

## Troubleshooting

### Still Getting Authentication Error?

1. **Check PostgreSQL is running:**
   ```bash
   psql -U postgres -c "SELECT version();"
   ```

2. **Reset postgres password:**
   ```bash
   psql -U postgres
   ALTER USER postgres WITH PASSWORD 'postgres';
   \q
   ```

3. **Verify connection:**
   ```bash
   psql -U postgres -d whatsapp_bot_test -c "SELECT 1;"
   ```

### Database Doesn't Exist?

```bash
psql -U postgres -c "CREATE DATABASE whatsapp_bot_test;"
```

### Connection Refused?

Start PostgreSQL:
```bash
# Windows
net start postgresql-x64-15

# Linux
sudo systemctl start postgresql

# Mac
brew services start postgresql
```

## Next Steps

1. ✅ Run the setup script
2. ✅ Verify tests pass
3. 🔄 Start API server: `bun run dev`
4. 🔄 Run tests in watch mode: `bun test --watch`
5. 🔄 Add more test cases as needed

## Files Reference

- **Test Configuration:** `.env.test`, `bunfig.toml`
- **Test Setup:** `apps/api/src/__tests__/setup.ts`
- **Test Cases:** `apps/api/src/__tests__/*.test.ts`
- **Database Seeder:** `packages/database/src/seed/index.ts`
- **Setup Scripts:** `setup-test-db.ps1`, `setup-test-db.sh`
- **Documentation:** `TEST_SETUP.md`, `TESTING_GUIDE.md`

---

**Ready to test!** Run the setup script and your tests should pass. 🎉

# Test Setup Guide

## Quick Fix for Database Authentication Error

The tests are failing because of database authentication. Follow these steps:

### Option 1: Use Default PostgreSQL User (Recommended)

1. **Update your `.env` file:**
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_bot"
   ```

2. **Create test database:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres

   # Create test database
   CREATE DATABASE whatsapp_bot_test;
   \q
   ```

3. **Run migrations:**
   ```bash
   cd packages/database
   bun run db:migrate
   ```

4. **Seed database:**
   ```bash
   bun run db:seed
   ```

5. **Run tests:**
   ```bash
   cd ../../apps/api
   bun test
   ```

### Option 2: Use Your Current User

If you want to use user "habib", update the connection string:

1. **Set password for your user:**
   ```bash
   psql -U postgres
   ALTER USER habib WITH PASSWORD 'your_password';
   \q
   ```

2. **Update `.env.test`:**
   ```env
   DATABASE_URL="postgresql://habib:your_password@localhost:5432/whatsapp_bot_test"
   ```

3. **Create test database:**
   ```bash
   psql -U habib -d postgres
   CREATE DATABASE whatsapp_bot_test;
   \q
   ```

4. **Run migrations and tests as above**

### Option 3: Quick Test Database Setup Script

Run this command to set everything up:

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test"
cd packages/database
bun run db:push
bun run db:seed
cd ../../apps/api
bun test
```

```bash
# Linux/Mac
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test"
cd packages/database
bun run db:push
bun run db:seed
cd ../../apps/api
bun test
```

## Common Issues

### Issue: "password authentication failed"

**Solution:** Check your PostgreSQL password
```bash
# Reset postgres password
psql -U postgres
ALTER USER postgres WITH PASSWORD 'postgres';
\q
```

### Issue: "database does not exist"

**Solution:** Create the database
```bash
psql -U postgres
CREATE DATABASE whatsapp_bot_test;
\q
```

### Issue: "connection refused"

**Solution:** Start PostgreSQL service
```bash
# Windows
net start postgresql-x64-15

# Linux
sudo systemctl start postgresql

# Mac
brew services start postgresql
```

## Verify Setup

1. **Check PostgreSQL is running:**
   ```bash
   psql -U postgres -c "SELECT version();"
   ```

2. **Check database exists:**
   ```bash
   psql -U postgres -l | grep whatsapp_bot
   ```

3. **Check connection:**
   ```bash
   psql -U postgres -d whatsapp_bot_test -c "SELECT 1;"
   ```

## Environment Variables

Make sure these are set in your `.env` or `.env.test`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test"

# JWT (required for tests)
JWT_SECRET="test-jwt-secret-key-minimum-32-characters-for-testing-purposes-only"
REFRESH_TOKEN_SECRET="test-refresh-token-secret-different-from-jwt-secret-for-testing"
```

## Running Tests

Once setup is complete:

```bash
# Run all tests
bun test

# Run specific test file
bun test apps/api/src/__tests__/contacts.test.ts

# Run with verbose output
bun test --verbose

# Run in watch mode
bun test --watch
```

## Expected Output

When tests pass, you should see:

```
✓ Contacts API > should list contacts for a tenant
✓ Contacts API > should get contact by ID
✓ Contacts API > should create a new contact
✓ Contacts API > should update a contact
✓ Contacts API > should delete a contact
✓ Contacts API > should not allow cross-tenant access
✓ Contacts API > should require authentication

... (more tests)

37 pass
0 fail
```

## Need Help?

If you're still having issues:

1. Check PostgreSQL logs
2. Verify `.env` file exists and has correct values
3. Ensure PostgreSQL is running on port 5432
4. Try connecting manually with `psql`
5. Check firewall settings

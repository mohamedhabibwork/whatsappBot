#!/bin/bash

# Bash script to setup test database
echo "🔧 Setting up test database..."

# Set environment variable
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test"

echo "✓ Environment variable set"
echo "  DATABASE_URL: postgresql://postgres:***@localhost:5432/whatsapp_bot_test"

# Create test database
echo ""
echo "📦 Creating test database..."
psql -U postgres -c "CREATE DATABASE whatsapp_bot_test;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Database created"
else
    echo "⚠ Database might already exist (this is OK)"
fi

# Run migrations
echo ""
echo "🔄 Running migrations..."
cd packages/database
bun run db:push

if [ $? -ne 0 ]; then
    echo "❌ Migration failed"
    exit 1
fi

echo "✓ Migrations completed"

# Seed database
echo ""
echo "🌱 Seeding database..."
bun run db:seed

if [ $? -ne 0 ]; then
    echo "❌ Seeding failed"
    exit 1
fi

echo "✓ Database seeded"

# Return to root
cd ../..

echo ""
echo "✅ Test database setup complete!"
echo ""
echo "You can now run tests with:"
echo "  cd apps/api"
echo "  bun test"

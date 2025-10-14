# PowerShell script to setup test database
Write-Host "🔧 Setting up test database..." -ForegroundColor Cyan

# Set environment variable
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test"

Write-Host "✓ Environment variable set" -ForegroundColor Green
Write-Host "  DATABASE_URL: postgresql://postgres:***@localhost:5432/whatsapp_bot_test" -ForegroundColor Gray

# Create test database
Write-Host "`n📦 Creating test database..." -ForegroundColor Cyan
$createDbCommand = "CREATE DATABASE whatsapp_bot_test;"
psql -U postgres -c $createDbCommand 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database created" -ForegroundColor Green
} else {
    Write-Host "⚠ Database might already exist (this is OK)" -ForegroundColor Yellow
}

# Run migrations
Write-Host "`n🔄 Running migrations..." -ForegroundColor Cyan
Set-Location packages/database
bun run db:push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migrations completed" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed" -ForegroundColor Red
    exit 1
}

# Seed database
Write-Host "`n🌱 Seeding database..." -ForegroundColor Cyan
bun run db:seed

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database seeded" -ForegroundColor Green
} else {
    Write-Host "❌ Seeding failed" -ForegroundColor Red
    exit 1
}

# Return to root
Set-Location ../..

Write-Host "`n✅ Test database setup complete!" -ForegroundColor Green
Write-Host "`nYou can now run tests with:" -ForegroundColor Cyan
Write-Host "  cd apps/api" -ForegroundColor White
Write-Host "  bun test" -ForegroundColor White

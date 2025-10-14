// Load test environment variables
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.test from project root
const envPath = resolve(__dirname, "../../../../.env.test");
config({ path: envPath });

// Fallback to default test database if not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/whatsapp_bot_test";
}

// Ensure JWT secrets are set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret-key-minimum-32-characters-for-testing-purposes-only";
}

if (!process.env.REFRESH_TOKEN_SECRET) {
  process.env.REFRESH_TOKEN_SECRET = "test-refresh-token-secret-different-from-jwt-secret-for-testing";
}

console.log("✓ Test environment loaded");
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`);

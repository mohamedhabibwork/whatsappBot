import { seedDatabase } from "./index";
import { join } from "path";

// Load environment variables from root .env file
const rootDir = join(__dirname, "../../../..");
const envPath = join(rootDir, ".env");

console.log(`📁 Loading environment from: ${envPath}`);

// Bun automatically loads .env files, but we need to ensure it's from the root
// Set the DATABASE_URL explicitly if not found
if (!process.env.DATABASE_URL) {
  console.log("⚠️  DATABASE_URL not found in environment");
  console.log("🔧 Using default connection string");
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/whatsapp_bot";
}

console.log(`🔗 Connecting to database: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

// Run seeder
seedDatabase({ verbose: true })
  .then(() => {
    console.log("\n🎉 Seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  });

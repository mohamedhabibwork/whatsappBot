import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://localhost:5432/whatsapp_bot";

// Create postgres client
const queryClient = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Export types
export type Database = typeof db;

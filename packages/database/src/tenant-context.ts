import { sql } from "drizzle-orm";
import type { Database } from "./client";

/**
 * Set the tenant context for Row-Level Security (RLS)
 * This must be called before executing any queries that use RLS policies
 */
export async function setTenantContext(db: Database, tenantId: string): Promise<void> {
  // Use SET instead of SET LOCAL since we may not be in a transaction
  await db.execute(sql.raw(`SET app.current_tenant_id = '${tenantId.replace(/'/g, "''")}'`));
}

/**
 * Clear the tenant context
 * Useful for cleanup or switching tenants
 */
export async function clearTenantContext(db: Database): Promise<void> {
  await db.execute(sql.raw(`RESET app.current_tenant_id`));
}

/**
 * Get the current tenant context
 * Returns null if not set
 */
export async function getCurrentTenantContext(db: Database): Promise<string | null> {
  try {
    const result = await db.execute(sql`SELECT current_setting('app.current_tenant_id', true) as tenant_id`);
    const rows = Array.from(result);
    const tenantId = (rows[0] as any)?.tenant_id;
    return tenantId || null;
  } catch (error) {
    return null;
  }
}

/**
 * Execute a function within a tenant context
 * Automatically sets and clears the tenant context
 */
export async function withTenantContext<T>(
  db: Database,
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  await setTenantContext(db, tenantId);
  try {
    return await fn();
  } finally {
    await clearTenantContext(db);
  }
}

/**
 * Create a database instance with tenant context pre-set
 * This is useful for creating a scoped db instance for a specific tenant
 */
export async function createTenantDb(db: Database, tenantId: string): Promise<Database> {
  await setTenantContext(db, tenantId);
  return db;
}

import { Context, Next } from "hono";
import { db, userTenantRoles } from "@repo/database";
import { eq } from "drizzle-orm";

export interface TenantContext {
  tenantId: string;
  tenantRole: string;
}

/**
 * Extract tenant ID from request
 * Priority: Header > Query Param > User's default tenant
 */
export async function getTenantId(c: Context, userId?: string): Promise<string | undefined> {
  // 1. Check X-Tenant-ID header
  const headerTenantId = c.req.header("X-Tenant-ID");
  if (headerTenantId) {
    return headerTenantId;
  }

  // 2. Check query parameter
  const queryTenantId = c.req.query("tenantId");
  if (queryTenantId) {
    return queryTenantId;
  }

  // 3. Get user's first tenant (default)
  if (userId) {
    const [userTenant] = await db
      .select({ tenantId: userTenantRoles.tenantId })
      .from(userTenantRoles)
      .where(eq(userTenantRoles.userId, userId))
      .limit(1);

    return userTenant?.tenantId;
  }

  return undefined;
}

/**
 * Tenant middleware - extracts and validates tenant context
 * Should be used after auth middleware
 */
export async function tenantMiddleware(c: Context, next: Next) {
  const auth = c.get("auth");
  const userId = auth?.userId;

  if (userId) {
    const tenantId = await getTenantId(c, userId);

    if (tenantId) {
      // Verify user has access to this tenant
      const [userRole] = await db
        .select({ role: userTenantRoles.role })
        .from(userTenantRoles)
        .where(
          eq(userTenantRoles.userId, userId) &&
          eq(userTenantRoles.tenantId, tenantId)
        )
        .limit(1);

      if (userRole) {
        c.set("tenant", {
          tenantId,
          tenantRole: userRole.role,
        } as TenantContext);
      }
    }
  }

  await next();
}

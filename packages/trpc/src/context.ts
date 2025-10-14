import { db, type Database, setTenantContext } from "@repo/database";
import type { inferAsyncReturnType } from "@trpc/server";

export interface CreateContextOptions {
  userId?: string;
  userRole?: string;
  tenantId?: string;
}

export const createContext = async (opts?: CreateContextOptions) => {
  // Set tenant context for RLS if tenantId is provided
  if (opts?.tenantId) {
    await setTenantContext(db, opts.tenantId);
  }

  return {
    db,
    userId: opts?.userId,
    userRole: opts?.userRole,
    tenantId: opts?.tenantId,
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;

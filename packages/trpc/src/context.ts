import { db, type Database } from "@repo/database";
import type { inferAsyncReturnType } from "@trpc/server";

export interface CreateContextOptions {
  userId?: string;
  userRole?: string;
}

export const createContext = async (opts?: CreateContextOptions) => {
  return {
    db,
    userId: opts?.userId,
    userRole: opts?.userRole,
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;

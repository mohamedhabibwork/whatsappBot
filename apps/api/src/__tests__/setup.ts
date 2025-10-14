import { beforeAll, afterAll, beforeEach } from "bun:test";
import { db, seedDatabase, setTenantContext } from "@repo/database";
import { generateAccessToken } from "@repo/auth-utils";
import { appRouter, createContext } from "@repo/trpc/server";

interface User {
  id: string;
  email: string;
  name: string;
  [key: string]: any;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  [key: string]: any;
}

export interface TestContext {
  users: User[];
  tenants: Tenant[];
  instances: any[];
  contacts: any[];
  groups: any[];
  tokens: {
    admin: string;
    user1: string;
    user2: string;
  };
}

let testContext: TestContext;

export async function setupTests() {
  try {
    // Seed database
    const seededData = await seedDatabase({ verbose: false }) as {
      users: User[];
      tenants: Tenant[];
      instances: any[];
      contacts: any[];
      groups: any[];
    };

    // Generate tokens with proper payload
    const tokens = {
      admin: generateAccessToken({
        userId: seededData.users[0].id,
        email: seededData.users[0].email,
        language: "en",
      }),
      user1: generateAccessToken({
        userId: seededData.users[1].id,
        email: seededData.users[1].email,
        language: "en",
      }),
      user2: generateAccessToken({
        userId: seededData.users[2].id,
        email: seededData.users[2].email,
        language: "en",
      }),
    };

    testContext = {
      ...seededData,
      tokens,
    };

    return testContext;
  } catch (error) {
    console.error("❌ Failed to setup tests:", error);
    throw error;
  }
}

export function getTestContext(): TestContext {
  return testContext;
}

export async function cleanupTests() {
  // Optionally clean up test data
  // For now, we keep the data for inspection
}

// Helper to create tRPC caller with authentication context
export async function createTestCaller(userId?: string, tenantId?: string, userRole?: string) {
  const ctx = await createContext({
    userId,
    tenantId,
    userRole,
  });
  return appRouter.createCaller(ctx);
}

// Helper to make authenticated requests
export function makeAuthHeaders(token: string, tenantId?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }

  return headers;
}

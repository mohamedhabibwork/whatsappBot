import { describe, it, expect, beforeAll } from "bun:test";
import { setupTests, getTestContext, createTestCaller } from "./setup";
import { TRPCError } from "@trpc/server";

beforeAll(async () => {
  await setupTests();
});

describe("Users API", () => {
  it("should get current user profile", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.users.me();

    expect(result).toBeDefined();
    expect(result?.id).toBe(ctx.users[0].id);
    expect(result?.email).toBe(ctx.users[0].email);
    expect(result?.name).toBe(ctx.users[0].name);
  });

  it("should update user profile", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[1].id, ctx.tenants[0].id);

    const result = await caller.users.updateProfile({
      name: "Updated Name",
    });

    expect(result.name).toBe("Updated Name");
    expect(result.id).toBe(ctx.users[1].id);
  });

  it("should list users (admin only)", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id, "admin");

    const result = await caller.users.list({
      limit: 10,
      offset: 0,
    });

    expect(result).toBeArray();
    expect(result.length).toBeGreaterThan(0);
  });

  it("should not allow non-admin to list users", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[2].id, ctx.tenants[0].id);

    try {
      await caller.users.list({
        limit: 10,
        offset: 0,
      });
      expect.unreachable("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("should require authentication for profile", async () => {
    const caller = await createTestCaller();

    try {
      await caller.users.me();
      expect.unreachable("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});

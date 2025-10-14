import { describe, it, expect, beforeAll } from "bun:test";
import { setupTests, getTestContext, createTestCaller } from "./setup";
import { TRPCError } from "@trpc/server";

beforeAll(async () => {
  await setupTests();
});

describe("Contacts API", () => {
  it("should list contacts for a tenant", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.contacts.list({
      tenantId: ctx.tenants[0].id,
      limit: 50,
      offset: 0,
    });

    expect(result.contacts).toBeArray();
    expect(result.contacts.length).toBeGreaterThan(0);
  });

  it("should get contact by ID", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.contacts.getById({
      id: ctx.contacts[0].id,
    });

    expect(result.contact.id).toBe(ctx.contacts[0].id);
  });

  it("should create a new contact", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const uniquePhone = `+999${Date.now().toString().slice(-7)}`;
    const result = await caller.contacts.create({
      tenantId: ctx.tenants[0].id,
      phoneNumber: uniquePhone,
      name: "Test Contact",
    });

    expect(result.contact.phoneNumber).toBe(uniquePhone);
    expect(result.contact.name).toBe("Test Contact");
  });

  it("should update a contact", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.contacts.update({
      id: ctx.contacts[0].id,
      name: "Updated Name",
    });

    expect(result.contact.name).toBe("Updated Name");
  });

  it("should delete a contact", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a contact to delete
    const createResult = await caller.contacts.create({
      tenantId: ctx.tenants[0].id,
      phoneNumber: "+8888888888",
      name: "To Delete",
    });

    const deleteResult = await caller.contacts.delete({
      id: createResult.contact.id,
    });

    expect(deleteResult.success).toBe(true);
  });

  it("should not allow cross-tenant access", async () => {
    const ctx = getTestContext();
    // User 2 only has access to tenant 0, not tenant 1
    // Try to access tenant 1's contact with user 2 (who doesn't have access to tenant 1)
    const caller = await createTestCaller(ctx.users[2].id, ctx.tenants[1].id);

    try {
      await caller.contacts.getById({
        id: ctx.contacts[3].id, // This belongs to tenant 1
      });
      expect.unreachable("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      // User doesn't have access to tenant 1, so FORBIDDEN
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("should require authentication", async () => {
    const caller = await createTestCaller(); // No userId

    try {
      await caller.contacts.list({
        tenantId: "some-tenant-id",
        limit: 50,
        offset: 0,
      });
      expect.unreachable("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});

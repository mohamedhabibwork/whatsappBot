import { describe, it, expect, beforeAll } from "bun:test";
import { setupTests, getTestContext, createTestCaller } from "./setup";

beforeAll(async () => {
  await setupTests();
});

describe("Groups API", () => {
  it("should list groups for a tenant", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.groups.list({
      tenantId: ctx.tenants[0].id,
      limit: 50,
      offset: 0,
    });

    expect(result.groups).toBeArray();
  });

  it("should get group by ID with contacts", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.groups.getById({
      id: ctx.groups[0].id,
    });

    expect(result.group.id).toBe(ctx.groups[0].id);
    expect(result.contacts).toBeArray();
  });

  it("should create a new group", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.groups.create({
      tenantId: ctx.tenants[0].id,
      name: "Test Group",
      description: "Test Description",
    });

    expect(result.group.name).toBe("Test Group");
  });

  it("should update a group", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.groups.update({
      id: ctx.groups[0].id,
      name: "Updated Group Name",
    });

    expect(result.group.name).toBe("Updated Group Name");
  });

  it("should add contacts to group", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.groups.addContacts({
      groupId: ctx.groups[0].id,
      contactIds: [ctx.contacts[0].id],
    });

    expect(result.success).toBe(true);
  });

  it("should remove contacts from group", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.groups.removeContacts({
      groupId: ctx.groups[0].id,
      contactIds: [ctx.contacts[0].id],
    });

    expect(result.success).toBe(true);
  });

  it("should delete a group", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a group to delete
    const createResult = await caller.groups.create({
      tenantId: ctx.tenants[0].id,
      name: "To Delete Group",
    });

    const deleteResult = await caller.groups.delete({
      id: createResult.group.id,
    });

    expect(deleteResult.success).toBe(true);
  });
});

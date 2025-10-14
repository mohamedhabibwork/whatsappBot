import { describe, it, expect, beforeAll } from "bun:test";
import { setupTests, getTestContext, createTestCaller } from "./setup";

beforeAll(async () => {
  await setupTests();
});

describe("Message Templates API", () => {
  it("should list message templates for a tenant", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.messageTemplates.list({
      tenantId: ctx.tenants[0].id,
      limit: 50,
      offset: 0,
    });

    expect(result.templates).toBeArray();
  });

  it("should create a message template", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.messageTemplates.create({
      tenantId: ctx.tenants[0].id,
      name: "Test Template",
      content: "Hello {{name}}, your order {{orderNumber}} is ready!",
      variables: ["name", "orderNumber"],
    });

    expect(result.template.name).toBe("Test Template");
    expect(result.template.variables).toEqual(["name", "orderNumber"]);
  });

  it("should get template by ID", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a template first
    const createResult = await caller.messageTemplates.create({
      tenantId: ctx.tenants[0].id,
      name: "Get Test Template",
      content: "Test content",
    });

    const result = await caller.messageTemplates.getById({
      id: createResult.template.id,
    });

    expect(result.template.id).toBe(createResult.template.id);
  });

  it("should update a message template", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a template first
    const createResult = await caller.messageTemplates.create({
      tenantId: ctx.tenants[0].id,
      name: "Update Test",
      content: "Original content",
    });

    const result = await caller.messageTemplates.update({
      id: createResult.template.id,
      content: "Updated content",
    });

    expect(result.template.content).toBe("Updated content");
  });

  it("should delete a message template", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a template first
    const createResult = await caller.messageTemplates.create({
      tenantId: ctx.tenants[0].id,
      name: "Delete Test",
      content: "To be deleted",
    });

    const result = await caller.messageTemplates.delete({
      id: createResult.template.id,
    });

    expect(result.success).toBe(true);
  });
});

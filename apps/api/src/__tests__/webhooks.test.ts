import { describe, it, expect, beforeAll } from "bun:test";
import { setupTests, getTestContext, createTestCaller } from "./setup";

beforeAll(async () => {
  await setupTests();
});

describe("Webhooks API", () => {
  it("should list webhooks for a tenant", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.webhooks.list({
      tenantId: ctx.tenants[0].id,
      limit: 50,
      offset: 0,
    });

    expect(result.webhooks).toBeArray();
  });

  it("should create a webhook", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.webhooks.create({
      tenantId: ctx.tenants[0].id,
      name: "Test Webhook",
      url: "https://example.com/webhook/test",
      events: ["contact_created", "contact_updated"],
    });

    expect(result.webhook.name).toBe("Test Webhook");
    expect(result.webhook.secret).toBeDefined();
  });

  it("should get webhook by ID", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a webhook first
    const createResult = await caller.webhooks.create({
      tenantId: ctx.tenants[0].id,
      name: "Get Test Webhook",
      url: "https://example.com/webhook/get",
      events: ["campaign_created"],
    });

    const result = await caller.webhooks.getById({
      id: createResult.webhook.id,
    });

    expect(result.webhook.id).toBe(createResult.webhook.id);
  });

  it("should update a webhook", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a webhook first
    const createResult = await caller.webhooks.create({
      tenantId: ctx.tenants[0].id,
      name: "Update Test",
      url: "https://example.com/webhook/update",
      events: ["contact_created"],
    });

    const result = await caller.webhooks.update({
      id: createResult.webhook.id,
      name: "Updated Webhook Name",
    });

    expect(result.webhook.name).toBe("Updated Webhook Name");
  });

  it("should regenerate webhook secret", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a webhook first
    const createResult = await caller.webhooks.create({
      tenantId: ctx.tenants[0].id,
      name: "Secret Test",
      url: "https://example.com/webhook/secret",
      events: ["contact_created"],
    });

    const oldSecret = createResult.webhook.secret;

    const result = await caller.webhooks.regenerateSecret({
      id: createResult.webhook.id,
    });

    expect(result.webhook.secret).not.toBe(oldSecret);
  });

  it("should delete a webhook", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a webhook first
    const createResult = await caller.webhooks.create({
      tenantId: ctx.tenants[0].id,
      name: "Delete Test",
      url: "https://example.com/webhook/delete",
      events: ["contact_created"],
    });

    const result = await caller.webhooks.delete({
      id: createResult.webhook.id,
    });

    expect(result.success).toBe(true);
  });

  it("should get webhook logs", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a webhook first
    const createResult = await caller.webhooks.create({
      tenantId: ctx.tenants[0].id,
      name: "Logs Test",
      url: "https://example.com/webhook/logs",
      events: ["contact_created"],
    });

    const result = await caller.webhooks.getLogs({
      webhookId: createResult.webhook.id,
      limit: 50,
      offset: 0,
    });

    expect(result.logs).toBeArray();
  });
});

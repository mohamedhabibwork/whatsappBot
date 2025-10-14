import { describe, it, expect, beforeAll } from "bun:test";
import { setupTests, getTestContext, createTestCaller } from "./setup";
import { TRPCError } from "@trpc/server";

beforeAll(async () => {
  await setupTests();
});

describe("Campaigns API", () => {
  it("should list campaigns for a tenant", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.campaigns.list({
      tenantId: ctx.tenants[0].id,
      limit: 50,
      offset: 0,
    });

    expect(result.campaigns).toBeArray();
  });

  it("should create a campaign with contacts", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.campaigns.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      name: "Test Campaign",
      message: "Hello {{name}}!",
      recipientType: "contacts",
      recipientIds: [ctx.contacts[0].id, ctx.contacts[1].id],
    });

    expect(result.campaign.name).toBe("Test Campaign");
    expect(result.campaign.totalRecipients).toBe(2);
  });

  it("should create a campaign with groups", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.campaigns.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      name: "Group Campaign",
      message: "Hello group!",
      recipientType: "groups",
      recipientIds: [ctx.groups[0].id],
    });

    expect(result.campaign.name).toBe("Group Campaign");
  });

  it("should get campaign by ID with recipients", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a campaign first
    const createResult = await caller.campaigns.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      name: "Get Test Campaign",
      message: "Test",
      recipientType: "contacts",
      recipientIds: [ctx.contacts[0].id],
    });

    const result = await caller.campaigns.getById({
      id: createResult.campaign.id,
    });

    expect(result.campaign.id).toBe(createResult.campaign.id);
    expect(result.recipients).toBeArray();
  });

  it("should update a campaign", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a campaign first
    const createResult = await caller.campaigns.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      name: "Update Test",
      message: "Test",
      recipientType: "contacts",
      recipientIds: [ctx.contacts[0].id],
    });

    const result = await caller.campaigns.update({
      id: createResult.campaign.id,
      name: "Updated Campaign Name",
    });

    expect(result.campaign.name).toBe("Updated Campaign Name");
  });

  it("should start a campaign", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a campaign first
    const createResult = await caller.campaigns.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      name: "Start Test",
      message: "Test",
      recipientType: "contacts",
      recipientIds: [ctx.contacts[0].id],
    });

    const result = await caller.campaigns.start({
      id: createResult.campaign.id,
    });

    expect(result.campaign.status).toBe("running");
  });

  it("should cancel a campaign", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a campaign first
    const createResult = await caller.campaigns.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      name: "Cancel Test",
      message: "Test",
      recipientType: "contacts",
      recipientIds: [ctx.contacts[0].id],
    });

    const result = await caller.campaigns.cancel({
      id: createResult.campaign.id,
    });

    expect(result.campaign.status).toBe("cancelled");
  });

  it("should delete a campaign", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a campaign first
    const createResult = await caller.campaigns.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      name: "Delete Test",
      message: "Test",
      recipientType: "contacts",
      recipientIds: [ctx.contacts[0].id],
    });

    const result = await caller.campaigns.delete({
      id: createResult.campaign.id,
    });

    expect(result.success).toBe(true);
  });

  it("should not delete a running campaign", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create and start a campaign
    const createResult = await caller.campaigns.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      name: "Running Campaign",
      message: "Test",
      recipientType: "contacts",
      recipientIds: [ctx.contacts[0].id],
    });

    // Start it
    await caller.campaigns.start({ id: createResult.campaign.id });

    // Try to delete
    try {
      await caller.campaigns.delete({ id: createResult.campaign.id });
      expect.unreachable("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("BAD_REQUEST");
    }
  });
});

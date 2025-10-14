import { describe, it, expect, beforeAll } from "bun:test";
import { setupTests, getTestContext, createTestCaller } from "./setup";
import { TRPCError } from "@trpc/server";

beforeAll(async () => {
  await setupTests();
});

describe("Messages History API", () => {
  it("should list messages for a tenant", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.messagesHistory.list({
      tenantId: ctx.tenants[0].id,
      limit: 50,
      offset: 0,
    });

    expect(result.messages).toBeArray();
  });

  it("should filter messages by WhatsApp instance", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.messagesHistory.list({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      limit: 50,
      offset: 0,
    });

    expect(result.messages).toBeArray();
  });

  it("should filter messages by contact", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.messagesHistory.list({
      tenantId: ctx.tenants[0].id,
      contactId: ctx.contacts[0].id,
      limit: 50,
      offset: 0,
    });

    expect(result.messages).toBeArray();
  });

  it("should create a new message", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.messagesHistory.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      contactId: ctx.contacts[0].id,
      chatId: ctx.contacts[0].phoneNumber,
      direction: "outbound",
      type: "text",
      content: "Test message",
      status: "sent",
    });

    expect(result.message.content).toBe("Test message");
    expect(result.message.direction).toBe("outbound");
    expect(result.message.status).toBe("sent");
  });

  it("should get message by ID", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a message first
    const createResult = await caller.messagesHistory.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      contactId: ctx.contacts[0].id,
      chatId: ctx.contacts[0].phoneNumber,
      direction: "inbound",
      type: "text",
      content: "Get test message",
      status: "delivered",
    });

    const result = await caller.messagesHistory.getById({
      id: createResult.message.id,
    });

    expect(result.message.id).toBe(createResult.message.id);
    expect(result.message.content).toBe("Get test message");
  });

  it("should update message status", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    // Create a message first
    const createResult = await caller.messagesHistory.create({
      tenantId: ctx.tenants[0].id,
      whatsappInstanceId: ctx.instances[0].id,
      contactId: ctx.contacts[0].id,
      chatId: ctx.contacts[0].phoneNumber,
      direction: "outbound",
      type: "text",
      content: "Status update test",
      status: "sent",
    });

    const result = await caller.messagesHistory.updateStatus({
      id: createResult.message.id,
      status: "delivered",
    });

    expect(result.message.status).toBe("delivered");
    expect(result.message.deliveredAt).toBeDefined();
  });

  it("should not allow access to other tenant's messages", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[2].id, ctx.tenants[0].id);

    try {
      await caller.messagesHistory.list({
        tenantId: ctx.tenants[1].id,
        limit: 50,
        offset: 0,
      });
      expect.unreachable("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("should not allow non-admin to create message", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[2].id, ctx.tenants[0].id);

    try {
      await caller.messagesHistory.create({
        tenantId: ctx.tenants[0].id,
        whatsappInstanceId: ctx.instances[0].id,
        chatId: "+1234567890",
        direction: "outbound",
        type: "text",
        content: "Forbidden message",
        status: "sent",
      });
      expect.unreachable("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("should require authentication", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller();

    try {
      await caller.messagesHistory.list({
        tenantId: ctx.tenants[0].id,
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

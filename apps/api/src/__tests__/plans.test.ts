import { describe, it, expect, beforeAll } from "bun:test";
import { setupTests, getTestContext, createTestCaller } from "./setup";
import { TRPCError } from "@trpc/server";

beforeAll(async () => {
  await setupTests();
});

describe("Plans API", () => {
  it("should list active public plans", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id);

    const result = await caller.plans.list();

    expect(result.plans).toBeArray();
  });

  it("should create a plan (admin only)", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id, "admin");

    const result = await caller.plans.create({
      name: { en: "Test Plan", ar: "خطة تجريبية" },
      description: { en: "Test Description", ar: "وصف تجريبي" },
      price: "29.99",
      currency: "USD",
      billingCycle: "monthly",
      trialDays: 14,
      isActive: true,
      isPublic: true,
      maxUsers: 10,
      maxWhatsappInstances: 5,
      maxMessagesPerMonth: 10000,
    });

    expect(result.plan.name).toEqual({ en: "Test Plan", ar: "خطة تجريبية" });
    expect(result.plan.price).toBe("29.99");
  });

  it("should get plan by ID with features", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id, "admin");

    // Create a plan first
    const createResult = await caller.plans.create({
      name: { en: "Get Test Plan", ar: "خطة الحصول على الاختبار" },
      price: "19.99",
      currency: "USD",
      billingCycle: "monthly",
    });

    const result = await caller.plans.getById({
      id: createResult.plan.id,
    });

    expect(result.plan.id).toBe(createResult.plan.id);
    expect(result.features).toBeArray();
  });

  it("should update a plan (admin only)", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id, "admin");

    // Create a plan first
    const createResult = await caller.plans.create({
      name: { en: "Update Test Plan", ar: "تحديث خطة الاختبار" },
      price: "39.99",
      currency: "USD",
      billingCycle: "monthly",
    });

    const result = await caller.plans.update({
      id: createResult.plan.id,
      price: "49.99",
    });

    expect(result.plan.price).toBe("49.99");
  });

  it("should add feature to plan (admin only)", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id, "admin");

    // Create a plan first
    const createResult = await caller.plans.create({
      name: { en: "Feature Test Plan", ar: "خطة اختبار الميزة" },
      price: "29.99",
      currency: "USD",
      billingCycle: "monthly",
    });

    const result = await caller.plans.addFeature({
      planId: createResult.plan.id,
      name: { en: "Test Feature", ar: "ميزة الاختبار" },
      featureKey: "test_feature",
      featureValue: "enabled",
      isEnabled: true,
      displayOrder: 1,
    });

    expect(result.feature.name).toEqual({ en: "Test Feature", ar: "ميزة الاختبار" });
    expect(result.feature.featureKey).toBe("test_feature");
  });

  it("should update plan feature (admin only)", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id, "admin");

    // Create plan and feature
    const planResult = await caller.plans.create({
      name: { en: "Update Feature Plan", ar: "تحديث خطة الميزة" },
      price: "29.99",
      currency: "USD",
      billingCycle: "monthly",
    });

    const featureResult = await caller.plans.addFeature({
      planId: planResult.plan.id,
      name: { en: "Original Feature", ar: "الميزة الأصلية" },
      featureKey: "original_feature",
      isEnabled: true,
      displayOrder: 1,
    });

    const result = await caller.plans.updateFeature({
      id: featureResult.feature.id,
      name: { en: "Updated Feature", ar: "الميزة المحدثة" },
    });

    expect(result.feature.name).toEqual({ en: "Updated Feature", ar: "الميزة المحدثة" });
  });

  it("should delete plan feature (admin only)", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id, "admin");

    // Create plan and feature
    const planResult = await caller.plans.create({
      name: { en: "Delete Feature Plan", ar: "حذف خطة الميزة" },
      price: "29.99",
      currency: "USD",
      billingCycle: "monthly",
    });

    const featureResult = await caller.plans.addFeature({
      planId: planResult.plan.id,
      name: { en: "Delete Feature", ar: "حذف الميزة" },
      featureKey: "delete_feature",
      isEnabled: true,
      displayOrder: 1,
    });

    const result = await caller.plans.deleteFeature({
      id: featureResult.feature.id,
    });

    expect(result.success).toBe(true);
  });

  it("should delete a plan (admin only)", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[0].id, ctx.tenants[0].id, "admin");

    // Create a plan first
    const createResult = await caller.plans.create({
      name: { en: "Delete Test Plan", ar: "حذف خطة الاختبار" },
      price: "29.99",
      currency: "USD",
      billingCycle: "monthly",
    });

    const result = await caller.plans.delete({
      id: createResult.plan.id,
    });

    expect(result.success).toBe(true);
  });

  it("should not allow non-admin to create plan", async () => {
    const ctx = getTestContext();
    const caller = await createTestCaller(ctx.users[2].id, ctx.tenants[0].id);

    try {
      await caller.plans.create({
        name: { en: "Forbidden Plan", ar: "خطة ممنوعة" },
        price: "29.99",
        currency: "USD",
        billingCycle: "monthly",
      });
      expect.unreachable("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});

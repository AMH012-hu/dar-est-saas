import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.OWNER_EMAIL = "ammarhalawa760@gmail.com";

const mocks = vi.hoisted(() => ({
  fulfillSubscription: vi.fn(),
  notifyOwner: vi.fn(),
}));

vi.mock("./db", () => ({
  createManualPaymentRequest: vi.fn(),
  listManualPaymentRequestsForUser: vi.fn(),
  listManualPaymentRequestsForOwner: vi.fn(),
  listInvoicesForUser: vi.fn(),
  getCustomerSubscription: vi.fn(),
  approveManualPaymentRequest: vi.fn(),
  rejectManualPaymentRequest: vi.fn(),
  attachPaymentProof: vi.fn(),
  fulfillSubscription: mocks.fulfillSubscription,
}));

vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));

import { appRouter } from "./routers";

const context = (role: "admin" | "user") => ({
  user: { id: role === "admin" ? 91 : 92, name: "اختبار DAR.EST", email: role === "admin" ? "ammarhalawa760@gmail.com" : "test@example.com", role } as any,
  req: {} as any,
  res: {} as any,
});

describe("ownerTestPurchase behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fulfillSubscription.mockResolvedValue({
      subscription: { isTest: true, planCode: "month" },
      licenseKey: { keyValue: "A".repeat(56), isTest: true },
      duplicate: false,
    });
    mocks.notifyOwner.mockResolvedValue(undefined);
  });

  it("rejects non-admin users before fulfillment", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.payments.ownerTestPurchase({ planCode: "monthly" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.fulfillSubscription).not.toHaveBeenCalled();
    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });

  it("fulfills a marked test purchase and notifies with customer, plan, and amount", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const result = await caller.payments.ownerTestPurchase({ planCode: "annual" });

    expect(result.isTest).toBe(true);
    expect(result.licenseKey?.isTest).toBe(true);
    expect(mocks.fulfillSubscription).toHaveBeenCalledWith(expect.objectContaining({
      source: "owner_test",
      eventType: "owner_test_purchase",
      isTest: true,
      planCode: "annual",
      userId: 91,
    }));
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("4999"),
    }));
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("اختبار DAR.EST"),
    }));
  });
});

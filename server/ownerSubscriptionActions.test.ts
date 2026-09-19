import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.OWNER_EMAIL = "ammarhalawa760@gmail.com";

const mocks = vi.hoisted(() => ({
  cancelSubscriptionForOwner: vi.fn(),
  extendSubscriptionForOwner: vi.fn(),
  listManualPaymentRequestsForOwner: vi.fn(),
  approveManualPaymentRequest: vi.fn(),
  rejectManualPaymentRequest: vi.fn(),
  recordAuditLog: vi.fn(),
}));

vi.mock("./db", () => ({
  createManualPaymentRequest: vi.fn(),
  listManualPaymentRequestsForUser: vi.fn(),
  listManualPaymentRequestsForOwner: mocks.listManualPaymentRequestsForOwner,
  listInvoicesForUser: vi.fn(),
  getCustomerSubscription: vi.fn(),
  listSubscriptionsForOwner: vi.fn(),
  cancelSubscriptionForOwner: mocks.cancelSubscriptionForOwner,
  extendSubscriptionForOwner: mocks.extendSubscriptionForOwner,
  recordAuditLog: mocks.recordAuditLog,
  approveManualPaymentRequest: mocks.approveManualPaymentRequest,
  rejectManualPaymentRequest: mocks.rejectManualPaymentRequest,
  attachPaymentProof: vi.fn(),
  fulfillSubscription: vi.fn(),
}));

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));

import { appRouter } from "./routers";

const context = (role: "admin" | "manager" | "user") => ({
  user: { id: role === "user" ? 92 : 91, name: "DAR.EST QA", email: role === "admin" ? "ammarhalawa760@gmail.com" : "qa@example.com", role } as any,
  req: {} as any,
  res: {} as any,
});

describe("owner subscription actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects cancellation and extension for non-admin users", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.payments.cancelSubscription({ userId: 91 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.payments.extendSubscription({ userId: 91, days: 30 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.cancelSubscriptionForOwner).not.toHaveBeenCalled();
    expect(mocks.extendSubscriptionForOwner).not.toHaveBeenCalled();
  });

  it("passes scoped owner actions to the database layer", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.payments.cancelSubscription({ userId: 92 })).resolves.toEqual({ success: true });
    await expect(caller.payments.extendSubscription({ userId: 92, days: 45 })).resolves.toEqual({ success: true });
    expect(mocks.cancelSubscriptionForOwner).toHaveBeenCalledWith(92);
    expect(mocks.extendSubscriptionForOwner).toHaveBeenCalledWith(92, 45);
  });

  it("rejects delegated subscription managers from Owner operations", async () => {
    const caller = appRouter.createCaller(context("manager"));

    await expect(caller.payments.ownerManualRequests()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.payments.approveManualRequest({ requestId: 44, ownerNote: "Reference verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.payments.rejectManualRequest({ requestId: 45, ownerNote: "Proof is not readable" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.approveManualPaymentRequest).not.toHaveBeenCalled();
    expect(mocks.rejectManualPaymentRequest).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.OWNER_EMAIL = "ammarhalawa760@gmail.com";

const state = vi.hoisted(() => ({
  request: null as null | { id: number; userId: number; status: string; proofUrl?: string },
  issuedKey: null as string | null,
}));

const mocks = vi.hoisted(() => ({
  createManualPaymentRequest: vi.fn(),
  attachPaymentProof: vi.fn(),
  approveManualPaymentRequest: vi.fn(),
  recordAuditLog: vi.fn(),
  notifyOwner: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./db", () => ({
  createManualPaymentRequest: mocks.createManualPaymentRequest,
  attachPaymentProof: mocks.attachPaymentProof,
  approveManualPaymentRequest: mocks.approveManualPaymentRequest,
  recordAuditLog: mocks.recordAuditLog,
  listManualPaymentRequestsForUser: vi.fn(),
  listManualPaymentRequestsForOwner: vi.fn(),
  listInvoicesForUser: vi.fn(),
  getCustomerSubscription: vi.fn(),
  listSubscriptionsForOwner: vi.fn(),
  cancelSubscriptionForOwner: vi.fn(),
  extendSubscriptionForOwner: vi.fn(),
  rejectManualPaymentRequest: vi.fn(),
  fulfillSubscription: vi.fn(),
}));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));
vi.mock("./_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));

import { appRouter } from "./routers";

const ctx = (role: "admin" | "user", id: number) => ({
  user: { id, name: role === "admin" ? "Owner QA" : "Tenant QA", email: role === "admin" ? "ammarhalawa760@gmail.com" : `${role}@qa.test`, role } as any,
  req: {} as any,
  res: {} as any,
});

describe("manual payment request to license integration flow", () => {
  beforeEach(() => {
    state.request = null;
    state.issuedKey = null;
    vi.clearAllMocks();

    mocks.createManualPaymentRequest.mockImplementation(async (input: { userId: number; planCode: string; provider: string; reference: string }) => {
      state.request = { id: 401, userId: input.userId, status: "pending" };
      return { ...state.request, invoice: { amountIls: 75, invoiceNumber: "INV-QA-401" } };
    });
    mocks.storagePut.mockResolvedValue({ url: "https://storage.test/proof-401.png" });
    mocks.attachPaymentProof.mockImplementation(async (input: { userId: number; requestId: number; proofUrl: string }) => {
      if (!state.request || state.request.id !== input.requestId || state.request.userId !== input.userId) throw new Error("Request not found.");
      state.request.proofUrl = input.proofUrl;
      state.request.status = "pending_manual_verification";
      return state.request;
    });
    mocks.approveManualPaymentRequest.mockImplementation(async (requestId: number) => {
      if (!state.request || state.request.id !== requestId || !state.request.proofUrl) throw new Error("Payment proof is required.");
      state.request.status = "approved";
      state.issuedKey = "A".repeat(56);
      return { ...state.request, customerName: "Tenant QA", customerEmail: "user@qa.test", planCode: "monthly", amountIls: 75, licenseKey: { keyValue: state.issuedKey } };
    });
  });

  it("keeps the key absent before proof and approval, then issues it once after approval", async () => {
    const customer = appRouter.createCaller(ctx("user", 501));
    const owner = appRouter.createCaller(ctx("admin", 900));

    const created = await customer.payments.createManualRequest({ planCode: "monthly", provider: "bit", reference: "BIT-401" });
    expect(created.id).toBe(401);
    expect(state.request?.status).toBe("pending");
    expect(state.issuedKey).toBeNull();

    await customer.payments.uploadProof({ requestId: 401, fileName: "proof.png", contentType: "image/png", dataBase64: "aGVsbG8=" });
    expect(state.request?.status).toBe("pending_manual_verification");
    expect(state.issuedKey).toBeNull();

    const approved = await owner.payments.approveManualRequest({ requestId: 401 });
    expect(approved.licenseKey?.keyValue).toHaveLength(56);
    expect(state.request?.status).toBe("approved");
    expect(state.issuedKey).toHaveLength(56);
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(2);
  });

  it("does not allow another tenant to upload proof for the request", async () => {
    const customer = appRouter.createCaller(ctx("user", 501));
    const otherTenant = appRouter.createCaller(ctx("user", 502));
    await customer.payments.createManualRequest({ planCode: "monthly", provider: "paypal", reference: "PP-401" });
    await expect(otherTenant.payments.uploadProof({ requestId: 401, fileName: "other.png", contentType: "image/png", dataBase64: "aGVsbG8=" })).rejects.toThrow("Request not found");
    expect(state.request?.status).toBe("pending");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.OWNER_EMAIL = "ammarhalawa760@gmail.com";

const mocks = vi.hoisted(() => ({
  listOwnerAdminUsers: vi.fn(),
  setOwnerAdminRole: vi.fn(),
  recordAuditLog: vi.fn(),
}));

vi.mock("./db", () => ({
  createManualPaymentRequest: vi.fn(),
  listManualPaymentRequestsForUser: vi.fn(),
  listManualPaymentRequestsForOwner: vi.fn(),
  listInvoicesForUser: vi.fn(),
  getCustomerSubscription: vi.fn(),
  listSubscriptionsForOwner: vi.fn(),
  cancelSubscriptionForOwner: vi.fn(),
  extendSubscriptionForOwner: vi.fn(),
  approveManualPaymentRequest: vi.fn(),
  rejectManualPaymentRequest: vi.fn(),
  attachPaymentProof: vi.fn(),
  fulfillSubscription: vi.fn(),
  listOwnerAdminUsers: mocks.listOwnerAdminUsers,
  setOwnerAdminRole: mocks.setOwnerAdminRole,
  recordAuditLog: mocks.recordAuditLog,
}));

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));

import { appRouter } from "./routers";

const context = (role: "admin" | "manager" | "user", id = 701) => ({
  user: { id, name: "Owner QA", email: role === "admin" ? "ammarhalawa760@gmail.com" : `${role}@qa.test`, role } as any,
  requestId: "owner-admin-contract-request",
  req: {} as any,
  res: {} as any,
});

describe("owner administrator management contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listOwnerAdminUsers.mockResolvedValue([
      { id: 701, name: "Owner QA", email: "admin@qa.test", role: "admin", createdAt: new Date(), lastSignedIn: new Date() },
    ]);
    mocks.setOwnerAdminRole.mockResolvedValue({
      id: 702,
      name: "Manager QA",
      email: "manager@qa.test",
      role: "manager",
      lastSignedIn: new Date(),
    });
    mocks.recordAuditLog.mockResolvedValue(undefined);
  });

  it("limits the administrator list to the primary admin role", async () => {
    const adminCaller = appRouter.createCaller(context("admin"));
    await expect(adminCaller.owner.administrators()).resolves.toHaveLength(1);

    const managerCaller = appRouter.createCaller(context("manager"));
    await expect(managerCaller.owner.administrators()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.listOwnerAdminUsers).toHaveBeenCalledTimes(1);
  });

  it("changes a verified user's role and writes a correlated audit entry", async () => {
    const caller = appRouter.createCaller(context("admin", 701));
    await expect(caller.owner.setAdministratorRole({ email: "manager@qa.test", role: "manager" })).resolves.toMatchObject({
      email: "manager@qa.test",
      role: "manager",
    });

    expect(mocks.setOwnerAdminRole).toHaveBeenCalledWith({
      actorUserId: 701,
      email: "manager@qa.test",
      role: "manager",
    });
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 701,
      action: "administrator.role.updated",
      requestId: "owner-admin-contract-request",
    }));
  });

  it("does not write an audit event when the last-admin safety guard rejects a role revocation", async () => {
    mocks.setOwnerAdminRole.mockRejectedValue(new Error("LAST_ADMIN_ROLE_REVOKE_NOT_ALLOWED"));
    const caller = appRouter.createCaller(context("admin", 701));

    await expect(caller.owner.setAdministratorRole({ email: "other-admin@qa.test", role: "user" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mocks.recordAuditLog).not.toHaveBeenCalled();
  });
});

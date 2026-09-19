import { describe, expect, it } from "vitest";
import { cancelActiveSubscription, extendActiveSubscription } from "./subscriptionActions";

type TestSubscription = Parameters<typeof cancelActiveSubscription>[0];

const makeSubscription = (overrides: Partial<TestSubscription> = {}): TestSubscription => ({
  id: 701,
  userId: 501,
  planCode: "monthly",
  status: "active",
  startsAt: new Date("2026-08-01T00:00:00.000Z"),
  endsAt: new Date("2026-09-01T00:00:00.000Z"),
  canceledAt: null,
  stripeCheckoutSessionId: null,
  stripePaymentIntentId: null,
  providerOrderId: null,
  providerPaymentId: null,
  paymentProvider: null,
  isTest: false,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  ...overrides,
});

describe("subscription action state transitions", () => {
  const now = new Date("2026-08-17T00:00:00.000Z");

  it("cancels only an active subscription and records canceledAt", () => {
    const updated = cancelActiveSubscription(makeSubscription(), now);
    expect(updated.status).toBe("canceled");
    expect(updated.canceledAt).toEqual(now);
    expect(updated.userId).toBe(501);
  });

  it("rejects cancellation of missing-state equivalents", () => {
    expect(() => cancelActiveSubscription(makeSubscription({ status: "canceled" }), now)).toThrow(
      "Only an active subscription can be canceled.",
    );
    expect(() => cancelActiveSubscription(makeSubscription({ status: "expired" }), now)).toThrow(
      "Only an active subscription can be canceled.",
    );
  });

  it("extends an active subscription by exact whole days", () => {
    const updated = extendActiveSubscription(makeSubscription(), 45, now);
    expect(updated.status).toBe("active");
    expect(updated.endsAt).toEqual(new Date("2026-10-16T00:00:00.000Z"));
    expect(updated.canceledAt).toBeNull();
  });

  it("rejects invalid, canceled, and expired extensions", () => {
    expect(() => extendActiveSubscription(makeSubscription(), 0, now)).toThrow(
      "Extension must be between 1 and 3660 whole days.",
    );
    expect(() => extendActiveSubscription(makeSubscription({ status: "canceled" }), 30, now)).toThrow(
      "Only an active subscription can be extended.",
    );
    expect(() => extendActiveSubscription(makeSubscription({ endsAt: new Date("2026-08-16T00:00:00.000Z") }), 30, now)).toThrow(
      "Expired subscriptions cannot be extended.",
    );
  });
});

import { describe, expect, it } from "vitest";
import { hasActiveSubscription, requireActiveSubscription } from "./subscriptionAccess";

const now = new Date("2026-08-17T00:00:00.000Z");

const subscription = (status: "active" | "canceled" | "expired", endsAt: string) => ({
  status,
  endsAt: new Date(endsAt),
});

describe("subscription access gate", () => {
  it("allows an active subscription that ends in the future", () => {
    expect(hasActiveSubscription(subscription("active", "2026-08-18T00:00:00.000Z"), now)).toBe(true);
    expect(requireActiveSubscription(subscription("active", "2026-08-18T00:00:00.000Z"), now).status).toBe("active");
  });

  it("rejects canceled, expired, missing, and exactly-ended subscriptions", () => {
    expect(hasActiveSubscription(subscription("canceled", "2026-08-18T00:00:00.000Z"), now)).toBe(false);
    expect(hasActiveSubscription(subscription("expired", "2026-08-18T00:00:00.000Z"), now)).toBe(false);
    expect(hasActiveSubscription(subscription("active", "2026-08-17T00:00:00.000Z"), now)).toBe(false);
    expect(hasActiveSubscription(null, now)).toBe(false);
    expect(() => requireActiveSubscription(null, now)).toThrow("ACTIVE_SUBSCRIPTION_REQUIRED");
  });
});

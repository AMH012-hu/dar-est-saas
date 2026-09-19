import { describe, expect, it } from "vitest";
import { generateLicenseKey, isValidLicenseKey, LICENSE_KEY_LENGTH } from "./licensing";
import { SUBSCRIPTION_PLANS } from "../shared/subscriptionPlans";

describe("license keys", () => {
  it("generates a valid 56-character alphanumeric key", () => {
    const key = generateLicenseKey();
    expect(key).toHaveLength(LICENSE_KEY_LENGTH);
    expect(isValidLicenseKey(key)).toBe(true);
  });

  it("does not repeat keys across normal generations", () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateLicenseKey()));
    expect(keys.size).toBe(100);
  });

  it("rejects malformed and truncated keys before database lookup", () => {
    const key = generateLicenseKey();
    expect(isValidLicenseKey(key)).toBe(true);
    expect(isValidLicenseKey(key.slice(0, 55))).toBe(false);
    expect(isValidLicenseKey(`${key.slice(0, 55)}-`)).toBe(false);
  });
});

describe("subscription plans", () => {
  it("keeps the approved EGP prices and durations", () => {
    expect(SUBSCRIPTION_PLANS.monthly.priceIls).toBe(999);
    expect(SUBSCRIPTION_PLANS.monthly.durationMonths).toBe(1);
    expect(SUBSCRIPTION_PLANS.quarterly.priceIls).toBe(1999);
    expect(SUBSCRIPTION_PLANS.quarterly.durationMonths).toBe(3);
    expect(SUBSCRIPTION_PLANS.semiannual.priceIls).toBe(2999);
    expect(SUBSCRIPTION_PLANS.semiannual.durationMonths).toBe(6);
    expect(SUBSCRIPTION_PLANS.annual.priceIls).toBe(4999);
    expect(SUBSCRIPTION_PLANS.annual.durationMonths).toBe(12);
    expect(SUBSCRIPTION_PLANS.lifetime.priceIls).toBe(20000);
    expect(SUBSCRIPTION_PLANS.lifetime.durationMonths).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { isTransientNetworkError, networkRetryDelay } from "./network";

describe("network resilience helpers", () => {
  it("identifies transient fetch failures without treating business errors as network errors", () => {
    expect(isTransientNetworkError(new Error("NetworkError when attempting to fetch resource."))).toBe(true);
    expect(isTransientNetworkError(new Error("Failed to fetch"))).toBe(true);
    expect(isTransientNetworkError(new Error("SALES_TEAM_MEMBER_REQUIRED"))).toBe(false);
  });

  it("uses bounded retry backoff", () => {
    expect(networkRetryDelay(0)).toBe(750);
    expect(networkRetryDelay(3)).toBe(4_000);
    expect(networkRetryDelay(9)).toBe(4_000);
  });
});

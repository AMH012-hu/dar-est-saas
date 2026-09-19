import { describe, expect, it } from "vitest";
import { displayAmount, formatPlanPrice } from "./pricing";

describe("DAR.EST bilingual plan pricing", () => {
  it("keeps Arabic prices in EGP", () => {
    expect(displayAmount(8000, "ar")).toBe(8000);
    expect(formatPlanPrice(15000, "ar")).toContain("١٥٬٠٠٠");
    expect(formatPlanPrice(15000, "ar")).toContain("جنيه");
  });

  it("converts the agreed EGP catalog to USD", () => {
    expect(displayAmount(5000, "en")).toBe(100);
    expect(displayAmount(15000, "en")).toBe(300);
    expect(displayAmount(25000, "en")).toBe(500);
    expect(formatPlanPrice(5000, "en")).toBe("$100");
  });
});

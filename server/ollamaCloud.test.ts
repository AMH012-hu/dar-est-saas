import { describe, expect, it } from "vitest";
import { assistantIsFollowUpMessage, mergeFollowUpFilters } from "./ollamaCloud";

describe("Ollama Cloud follow-up boundaries", () => {
  it("recognizes concise Arabic and English references to prior results", () => {
    expect(assistantIsFollowUpMessage("دول بنفس رينج المساحة؟")).toBe(true);
    expect(assistantIsFollowUpMessage("اعرضهم مرة أخرى")).toBe(true);
    expect(assistantIsFollowUpMessage("Are these in the same area range?")).toBe(true);
    expect(assistantIsFollowUpMessage("رشح وحدات متاحة من 100 إلى 120 متر")).toBe(false);
  });

  it("keeps the deterministic filter context and normalizes an inverted area refinement", () => {
    expect(mergeFollowUpFilters(
      { availability: "available", budget: 3_000_000 },
      { minAreaSqm: 120, maxAreaSqm: 100 },
    )).toEqual({ availability: "available", budget: 3_000_000, minAreaSqm: 100, maxAreaSqm: 120 });
  });
});

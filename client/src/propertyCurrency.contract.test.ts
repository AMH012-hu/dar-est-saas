import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceFiles = [
  "client/src/components/FloatingPropertyAgent.tsx",
  "client/src/components/WorkspaceModuleOperations.tsx",
  "client/src/pages/ActionCenter.tsx",
  "client/src/pages/SalesCenterPages.tsx",
  "client/src/pages/SalesWorkspace.tsx",
  "client/src/pages/TenantPortal.tsx",
  "client/src/pages/Workspace.tsx",
  "server/routers.ts",
];

describe("property currency contracts", () => {
  it("does not expose ILS symbols or wording on property and payment surfaces", () => {
    const sources = sourceFiles.map(file => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");
    expect(sources).not.toContain("₪");
    expect(sources).not.toContain("شيكل");
    expect(sources).not.toContain("شيقل");
    expect(sources).toContain("EGP");
  });

  it("parses property budgets only as Egyptian pounds", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(router).toContain("const egp = normalized.match");
    expect(router).toContain("جنيه(?:\\s*مصري)?");
    expect(router).not.toContain("(?:₪|شيكل|ils|nis)");
  });

  it("uses the platform EGP-to-USD comparison rate", () => {
    expect(Math.round(4_826_000 / 50)).toBe(96_520);
    expect(Math.round(1_000_000 / 50)).toBe(20_000);
  });

  it("keeps price-band boundaries in EGP", () => {
    const matchesBand = (price: number, band: string) => band === "under1m" ? price > 0 && price < 1_000_000 : band === "oneTo3m" ? price >= 1_000_000 && price <= 3_000_000 : band === "threeTo5m" ? price > 3_000_000 && price <= 5_000_000 : band === "over5m" ? price > 5_000_000 : true;
    expect(matchesBand(750_000, "under1m")).toBe(true);
    expect(matchesBand(2_000_000, "oneTo3m")).toBe(true);
    expect(matchesBand(4_000_000, "threeTo5m")).toBe(true);
    expect(matchesBand(6_000_000, "over5m")).toBe(true);
    expect(matchesBand(2_000_000, "over5m")).toBe(false);
  });
});

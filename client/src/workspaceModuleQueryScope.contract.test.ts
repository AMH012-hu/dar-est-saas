import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/WorkspaceModule.tsx"), "utf8");

describe("workspace module query scope contract", () => {
  it("gates each operational source behind the active module requirements", () => {
    expect(source).toContain('const needsPortfolio = ["portfolio", "collections", "work-orders"].includes(moduleId);');
    expect(source).toContain('const needsLeasing = ["collections", "insights", "leases"].includes(moduleId);');
    expect(source).toContain('const needsOperations = ["work-orders", "insights"].includes(moduleId);');
    expect(source).toContain('const needsActivity = moduleId === "operating-log";');
    expect(source).toContain('const needsDocuments = moduleId === "insights";');
  });

  it("preserves the common authorized-company guard for every module-scoped query", () => {
    expect(source).toContain('const enabled = Boolean(user && active && company.data?.company);');
    expect(source).toContain('trpc.portfolio.hierarchy.useQuery(undefined, { enabled: enabled && needsPortfolio })');
    expect(source).toContain('trpc.portfolio.collections.useQuery(undefined, { enabled: enabled && needsCollections })');
    expect(source).toContain('trpc.documents.center.useQuery(undefined, { enabled: enabled && needsDocuments })');
    expect(source).toContain('trpc.company.activity.useQuery({ page: 1, pageSize: 24 }, { enabled: enabled && needsActivity })');
  });
});

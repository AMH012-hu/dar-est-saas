import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/ActionCenter.tsx"), "utf8");
const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const workspace = readFileSync(resolve(process.cwd(), "client/src/pages/Workspace.tsx"), "utf8");

describe("unified action center contract", () => {
  it("aggregates only authorized operational sources instead of fixture data", () => {
    expect(source).toContain("trpc.portfolio.collections.useQuery");
    expect(source).toContain("trpc.operations.center.useQuery");
    expect(source).toContain("trpc.portfolio.leasingCenter.useQuery");
    expect(source).toContain("trpc.documents.center.useQuery");
    expect(source).not.toMatch(/mock|fixture|sampleData/i);
  });

  it("keeps actionable filters and module links for collection, operations, leases, and documents", () => {
    expect(source).toContain('type FocusKind = "all" | "critical" | "collections" | "operations" | "leases" | "documents"');
    expect(source).toContain('href: "/workspace/collections"');
    expect(source).toContain('href: "/workspace/work-orders"');
    expect(source).toContain('href: "/workspace/leases"');
    expect(source).toContain('href: "/workspace/documents"');
    expect(source).toContain("collections.refetch()");
    expect(source).toContain("documents.refetch()");
  });

  it("registers the dedicated route before the generic workspace module route and exposes it from the workspace", () => {
    expect(app).toContain('const ActionCenter = lazy(() => import("./pages/ActionCenter"));');
    expect(app.indexOf('path="/workspace/action-center"')).toBeLessThan(app.indexOf('path="/workspace/:module"'));
    expect(workspace).toContain('href: "/workspace/action-center"');
  });
});

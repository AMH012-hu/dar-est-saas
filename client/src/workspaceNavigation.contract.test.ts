import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("workspace module navigation", () => {
  it("registers distinct workspace module routes", () => {
    const app = source("client/src/App.tsx");
    expect(app).toContain('path="/workspace/:module"');
    expect(app).toContain("WorkspaceModule");
  });

  it("sends sidebar operating sections to dedicated pages instead of in-page anchors", () => {
    const workspace = source("client/src/pages/Workspace.tsx");
    expect(workspace).toContain('href: "/workspace/portfolio"');
    expect(workspace).toContain('href: "/workspace/collections"');
    expect(workspace).toContain('href: "/workspace/work-orders"');
    expect(workspace).toContain('href: "/workspace/reports"');
    expect(workspace).toContain('href: "/workspace/insights"');
    expect(workspace).toContain('href: "/workspace/leases"');
    expect(workspace).toContain('href: "/workspace/operating-log"');
    expect(workspace).toContain("overflow-y-auto overscroll-contain");
  });

  it("keeps language-change feedback lightweight and reduced-motion safe", () => {
    const switcher = source("client/src/components/LocaleSwitcher.tsx");
    expect(switcher).toContain("changingLanguage");
    expect(switcher).toContain("motion-safe:active:scale-95");
    expect(switcher).toContain("motion-safe:scale-[1.04]");
  });
});

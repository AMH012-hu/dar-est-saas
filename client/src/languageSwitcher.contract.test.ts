import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("language switcher visibility", () => {
  it("keeps the shared language control in the sales center shell", () => {
    const salesCenter = source("client/src/pages/SalesCenterPages.tsx");

    expect(salesCenter).toContain('import LocaleSwitcher from "@/components/LocaleSwitcher"');
    expect(salesCenter).toContain("<LocaleSwitcher />");
  });

  it("keeps the shared language control in standalone operational pages", () => {
    const salesWorkspace = source("client/src/pages/SalesWorkspace.tsx");
    const tenantPortal = source("client/src/pages/TenantPortal.tsx");

    expect(salesWorkspace).toContain('import LocaleSwitcher from "@/components/LocaleSwitcher"');
    expect(salesWorkspace).toContain("<LocaleSwitcher />");
    expect(tenantPortal).toContain('import LocaleSwitcher from "@/components/LocaleSwitcher"');
    expect(tenantPortal).toContain("<LocaleSwitcher />");
  });

  it("keeps the language control visible in the workspace header when the mobile sidebar is closed", () => {
    const workspace = source("client/src/pages/Workspace.tsx");
    const switcher = source("client/src/components/LocaleSwitcher.tsx");

    expect(workspace).toContain('import LocaleSwitcher from "@/components/LocaleSwitcher"');
    expect(workspace).toContain('<div className="fixed end-4 top-4 z-50">');
    expect(workspace).toContain("<LocaleSwitcher compact />");
    expect(switcher).toContain("compact?: boolean");
    expect(switcher).toContain("if (compact)");
  });
});

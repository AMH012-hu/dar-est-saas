import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("independent customer Projects site", () => {
  it("hides the internal floating advisor throughout the public Projects route", () => {
    const app = source("client/src/App.tsx");
    expect(app).toContain('const isIndependentProjectsSite = location === "/projects" || location.startsWith("/projects/")');
    expect(app).toContain("{!isIndependentProjectsSite && <FloatingPropertyAgent />}");
  });

  it("keeps Projects navigation inside the customer site and out of the internal app", () => {
    const projects = source("client/src/pages/PublicProperties.tsx");
    expect(projects).toContain('<Link href="/projects" className="flex items-center gap-3">');
    expect(projects).not.toContain('<Link href="/"');
    expect(projects).not.toContain('href="/workspace"');
    expect(projects).not.toContain('href="/sales"');
    expect(projects).not.toContain('href="/owner"');
    expect(projects).toContain("https://wa.me/201501805674");
  });

  it("keeps public property data limited to the published customer-safe contract", () => {
    const projects = source("client/src/pages/PublicProperties.tsx");
    expect(projects).toContain("trpc.publicProperties.list.useQuery()");
    expect(projects).toContain("trpc.publicProperties.submitInquiry.useMutation()");
    expect(projects).not.toContain("salesClient");
    expect(projects).not.toContain("salesTeam");
    expect(projects).not.toContain("workspaceId");
  });
});

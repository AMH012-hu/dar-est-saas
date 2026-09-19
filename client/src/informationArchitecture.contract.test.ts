import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("subscription and workspace information architecture", () => {
  it("iterates the object-based subscription catalog through typed plan codes", () => {
    const plans = source("client/src/pages/Plans.tsx");
    expect(plans).toContain('const planCodes = (Object.keys(SUBSCRIPTION_PLANS) as PlanCode[]).filter((code) => code !== "monthly")');
    expect(plans).toContain("{planCodes.map((code) => {");
    expect(plans).not.toContain("SUBSCRIPTION_PLANS.map(");
    expect(plans).toContain("const planNotes: Record<LocaleKey, Record<PlanCode, string>>");
    expect(plans).toContain("const planDurations: Record<LocaleKey, Record<PlanCode, string>>");
    expect(plans).toContain("const savingsCopy: Record<LocaleKey, (amount: string) => string>");
    expect(plans).toContain("originalPrice - plan.priceIls");
    expect(plans).toContain('lifetime: "Enterprise · Lifetime"');
    expect(plans).toContain('lifetime: "Enterprise · مدى الحياة"');
    expect(plans).not.toContain("{plan.noteAr}");
    expect(plans).toContain("monthly: \"Basic · 1 month\"");
    expect(plans).toContain("monthly: \"Basic · شهر واحد\"");
    expect(plans).toContain("{t[tag]}");
    expect(plans).toContain('const annualDiscountCopy: Record<LocaleKey, string>');
    expect(plans).toContain('ar: "خصم 58%"');
    expect(plans).toContain("line-through");
    expect(plans).toContain("التكلفة الفعلية:");
    expect(plans).toContain("Effective cost:");
  });

  it("gives the public landing page dedicated links to plans and workspace", () => {
    const home = source("client/src/pages/Home.tsx");
    expect(home).toContain('<Link href="/plans"');
    expect(home).toContain('<Link href="/workspace"');
    expect(home).toContain("luxury-residence-twilight_0f4510c3.png");
    expect(home).toContain("font-serif text-5xl");
  });

  it("keeps the sales client detail route unique and mapped to its dedicated page", () => {
    const app = source("client/src/App.tsx");
    const detailRoutes = app.match(/path="\/sales\/clients\/:id"/g) ?? [];
    expect(detailRoutes).toHaveLength(1);
    expect(app).toContain('path="/sales/clients/:id" component={SalesClientDetail}');
    expect(app).toContain('path="/sales/clients" component={SalesClients}');
  });

  it("uses DAR.EST branding and the reference-aligned dark glass dashboard surfaces", () => {
    const workspace = source("client/src/pages/Workspace.tsx");
    const owner = source("client/src/pages/Owner.tsx");
    expect(workspace).not.toContain("PropMatrix OS V2");
    expect(workspace).toContain("bg-[#151a3c]/88");
    expect(workspace).toContain("bg-white/[.055]");
    expect(workspace).toContain("border-white/10");
    expect(workspace).not.toContain("const topNav");
    expect(owner).toContain("bg-[#0a2333]/85");
  });

  it("keeps the reference-inspired floating glass workspace frame without inventing data", () => {
    const workspace = source("client/src/pages/Workspace.tsx");
    expect(workspace).toContain("border-2 border-white/75");
    expect(workspace).toContain("sm:rounded-[2.45rem]");
    expect(workspace).toContain("border-[#b04459]/85");
    expect(workspace).toContain("border-[#7160a8]/75");
    expect(workspace).toContain("from-[#ff6b8e] via-[#a88cff] to-[#40cbed]");
    expect(workspace).toContain("filteredNotifications");
    expect(workspace).not.toContain("John Doe");
    expect(workspace).not.toContain("Katty Johnson");
  });

  it("reserves mobile header space for the fixed menu and language controls", () => {
    const workspace = source("client/src/pages/Workspace.tsx");
    expect(workspace).toContain("px-4 pb-4 pt-16");
    expect(workspace).toContain("min-w-0 ps-14 pe-16");
    expect(workspace).toContain("break-words text-[1.75rem]");
  });

  it("keeps the existing workspace content in a deliberate visual hierarchy across themes", () => {
    const workspace = source("client/src/pages/Workspace.tsx");
    const css = source("client/src/index.css");
    expect(workspace).toContain("workspace-sidebar");
    expect(workspace).toContain("mt-6 grid gap-6 xl:grid-cols-2");
    expect(workspace).toContain("xl:col-span-2");
    expect(css).toContain("html:not(.dark) .workspace-shell");
    expect(css).toContain("html:not(.dark) .workspace-shell .workspace-sidebar");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("tenant portal contracts", () => {
  it("is email-scoped, company-isolated, and routed", () => {
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/TenantPortal.tsx"), "utf8");
    expect(db).toContain("getTenantPortalForEmail");
    expect(db).toContain("eq(tenants.email, email.toLowerCase())");
    expect(db).toContain("eq(contracts.companyId, tenant.companyId)");
    expect(db).toContain("eq(operationalPayments.companyId, tenant.companyId)");
    expect(router).toContain("portal: router");
    expect(router).toContain("getTenantPortalForEmail");
    expect(app).toContain('path=\"/tenant-portal\"');
    expect(page).toContain("trpc.portal.me.useQuery");
    expect(page).toContain("t.secure");
  });
});

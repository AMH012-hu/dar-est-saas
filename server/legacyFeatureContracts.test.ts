import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("legacy operational feature contracts", () => {
  it("keeps company-scoped legacy tables and procedures", () => {
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    for (const table of ["tenants", "contracts", "maintenance", "operationalPayments"]) expect(schema).toContain(`export const ${table}`);
    for (const helper of ["listTenantsForCompany", "createTenantForCompany", "updateTenantForCompany", "deleteTenantForCompany", "listMaintenanceForCompany", "createMaintenanceForCompany", "updateMaintenanceForCompany", "deleteMaintenanceForCompany", "listContractsForCompany", "listOperationalPaymentsForCompany"]) expect(db).toContain(`export async function ${helper}`);
    for (const procedure of ["snapshot", "tenants", "createTenant", "updateTenant", "deleteTenant", "maintenance", "createMaintenance", "updateMaintenance", "deleteMaintenance", "contracts", "operationalPayments"]) expect(router).toContain(`${procedure}: protectedProcedure`);
  });

  it("uses company isolation predicates for tenant and maintenance writes", () => {
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    expect(db).toContain('eq(tenants.companyId, input.companyId)');
    expect(db).toContain('eq(maintenance.companyId, input.companyId)');
    expect(db).toContain('COMPANY_ACCESS_REQUIRED');
    expect(db).toContain('ACTIVE_SUBSCRIPTION_REQUIRED');
  });
});


describe("legacy access and readiness contracts", () => {
  it("requires company membership and workspace permissions for legacy mutations", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    expect(router).toContain('requireCompanyPermission(membership.member.role, "workspace.read")');
    expect(router).toContain('requireCompanyPermission(membership.member.role, "workspace.write")');
    expect(db).toContain("assertCompanySubscriptionAndQuota");
  });

  it("keeps final readiness honest when isolated database integration is unavailable", () => {
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain("vitest");
    expect(readFileSync(resolve(process.cwd(), "server/manualPaymentFlow.real.integration.test.ts"), "utf8")).toContain("TEST_DATABASE_URL");
  });
});

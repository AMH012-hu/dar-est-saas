import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("portfolio unit status contract", () => {
  const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
  const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

  it("exposes a permission-protected unit status mutation", () => {
    expect(routerSource).toContain("updateUnitStatus: protectedProcedure");
    expect(routerSource).toContain('requireCompanyPermission(membership.member.role, "portfolio.write")');
    expect(routerSource).toContain("updateUnitStatusForCompany");
  });

  it("scopes updates to the active company and records operational activity", () => {
    expect(dbSource).toContain("updateUnitStatusForCompany");
    expect(dbSource).toContain("eq(units.companyId, input.companyId)");
    expect(dbSource).toContain('action: "unit.status_updated"');
  });

  it("refuses unit deletion when leases or collection records are linked", () => {
    expect(dbSource).toContain("deleteUnitForCompany");
    expect(dbSource).toContain("UNIT_HAS_LEASES");
    expect(dbSource).toContain("UNIT_HAS_COLLECTIONS");
    expect(dbSource).toContain('action: "unit.deleted"');
    expect(routerSource).toContain("deleteUnit: protectedProcedure");
  });
});

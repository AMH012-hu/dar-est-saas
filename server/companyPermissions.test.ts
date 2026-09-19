import { describe, expect, it } from "vitest";
import { hasCompanyPermission, requireCompanyPermission } from "./companyPermissions";

describe("company permissions", () => {
  it("grants owner and admin member management", () => {
    expect(hasCompanyPermission("owner", "members.write")).toBe(true);
    expect(hasCompanyPermission("admin", "members.write")).toBe(true);
    expect(() => requireCompanyPermission("admin", "members.write")).not.toThrow();
  });

  it("keeps manager read-only for membership operations", () => {
    expect(hasCompanyPermission("manager", "members.read")).toBe(true);
    expect(hasCompanyPermission("manager", "members.write")).toBe(false);
    expect(() => requireCompanyPermission("manager", "members.write")).toThrowError(/permission/i);
  });

  it("prevents member and viewer from managing members", () => {
    for (const role of ["member", "viewer", undefined]) {
      expect(hasCompanyPermission(role, "members.write")).toBe(false);
    }
  });

  it("limits collection and finance mutations to financial operators", () => {
    for (const role of ["owner", "admin", "manager"]) {
      expect(hasCompanyPermission(role, "collections.write")).toBe(true);
      expect(hasCompanyPermission(role, "finance.write")).toBe(true);
    }
    for (const role of ["member", "viewer", undefined]) {
      expect(hasCompanyPermission(role, "collections.write")).toBe(false);
      expect(hasCompanyPermission(role, "finance.write")).toBe(false);
    }
  });

  it("keeps operational document and work-order actions available to members", () => {
    expect(hasCompanyPermission("member", "operations.write")).toBe(true);
    expect(hasCompanyPermission("member", "documents.write")).toBe(true);
    expect(hasCompanyPermission("viewer", "operations.write")).toBe(false);
  });

  it("reserves audit history for accountable roles while retaining viewer access to operational reporting", () => {
    for (const role of ["owner", "admin", "manager"]) {
      expect(hasCompanyPermission(role, "audit.read")).toBe(true);
    }
    for (const role of ["member", "viewer", undefined]) {
      expect(hasCompanyPermission(role, "audit.read")).toBe(false);
    }
    expect(hasCompanyPermission("viewer", "portfolio.read")).toBe(true);
    expect(hasCompanyPermission("viewer", "collections.read")).toBe(true);
    expect(hasCompanyPermission("viewer", "finance.read")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("sensitive company authorization contracts", () => {
  const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

  it("uses dedicated financial and collection permissions rather than broad workspace writes", () => {
    expect(router).toContain('requireCompanyPermission(membership.member.role, "collections.write")');
    expect(router).toContain('requireCompanyPermission(membership.member.role, "finance.write")');
    expect(router).toContain('requireCompanyPermission(membership.member.role, "collections.read")');
    expect(router).toContain('requireCompanyPermission(membership.member.role, "finance.read")');
  });

  it("keeps document and operational mutations behind their own permission scopes", () => {
    expect(router).toContain('requireCompanyPermission(membership.member.role, "documents.write")');
    expect(router).toContain('requireCompanyPermission(membership.member.role, "operations.write")');
  });
});

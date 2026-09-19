import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(__dirname, "../drizzle/0033_fixed_lila_cheney.sql"), "utf8");

describe("company resource revisions migration", () => {
  it("creates the immutable revision table with company/resource indexes and no destructive statements", () => {
    expect(migration).toContain("CREATE TABLE `company_resource_revisions`");
    expect(migration).toMatch(/CONSTRAINT\s+`company_resource_revisions_unique`\s+UNIQUE\(`companyId`,`resourceType`,`resourceId`,`revisionNumber`\)/);
    expect(migration).toMatch(/CREATE INDEX `company_resource_revisions_resource_idx` ON `company_resource_revisions` \(`companyId`,`resourceType`,`resourceId`,`revisionNumber`\)/);
    expect(migration).not.toMatch(/\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bTRUNCATE\s+TABLE\b/i);
  });
});

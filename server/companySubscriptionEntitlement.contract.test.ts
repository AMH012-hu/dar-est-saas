import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("company subscription entitlement contract", () => {
  const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");

  it("resolves workspace entitlement from the company owner subscription", () => {
    expect(dbSource).toContain("export async function getCompanySubscription(companyId: number)");
    expect(dbSource).toContain("getUserSubscription(company.ownerUserId)");
    expect(dbSource).toContain("getCompanyMembershipForCompany(companyId, userId)");
  });

  it("uses company entitlement in quota, operational, and sales access guards", () => {
    expect(dbSource).toMatch(/assertCompanySubscriptionAndQuota[\s\S]*?getCompanySubscription\(companyId\)/);
    expect(dbSource).toMatch(/assertCompanySubscriptionAccess[\s\S]*?getCompanySubscription\(companyId\)/);
    expect(dbSource).toMatch(/assertCompanyOperationalAccess[\s\S]*?getCompanySubscription\(companyId\)/);
    expect(dbSource).toMatch(/getSalesTeamAccess[\s\S]*?getCompanySubscription\(companyId\)/);
  });

  it("keeps personal subscription validation only for creating a brand-new company", () => {
    expect(dbSource).toMatch(/createCompanyForUser[\s\S]*?getUserSubscription\(userId\)[\s\S]*?ACTIVE_SUBSCRIPTION_REQUIRED/);
  });
});

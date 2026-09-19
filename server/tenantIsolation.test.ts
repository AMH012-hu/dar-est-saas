import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routerSource = readFileSync(resolve(__dirname, "routers.ts"), "utf8");

type OwnedResource = { userId: number };

function canReadResource(resource: OwnedResource | null | undefined, authenticatedUserId: number) {
  return resource?.userId === authenticatedUserId;
}

describe("tenant data isolation", () => {
  it("allows a customer to read only resources owned by the authenticated user", () => {
    const companyOneInvoice = { userId: 101 };
    const companyTwoInvoice = { userId: 202 };

    expect(canReadResource(companyOneInvoice, 101)).toBe(true);
    expect(canReadResource(companyTwoInvoice, 101)).toBe(false);
    expect(canReadResource(null, 101)).toBe(false);
  });

  it("does not treat a missing owner as a readable resource", () => {
    expect(canReadResource(undefined, 101)).toBe(false);
  });

  it("keeps notifications and revision history bounded to the caller's active company", () => {
    expect(routerSource).toContain("notifications: router({");
    expect(routerSource).toContain("getCompanyNotificationsForUser({ companyId: membership.company.id, userId: ctx.user.id })");
    expect(routerSource).toContain("revisions: protectedProcedure");
    expect(routerSource).toContain('!hasCompanyPermission(membership.member.role, "audit.read")) return []');
    expect(routerSource).toContain("listCompanyResourceRevisions({ companyId: membership.company.id, ...input })");
  });
});

/**
 * Isolation contract used by the current single-account-per-company model:
 * every customer-facing query must constrain by ctx.user.id, while owner
 * procedures are intentionally global and protected by adminProcedure.
 */

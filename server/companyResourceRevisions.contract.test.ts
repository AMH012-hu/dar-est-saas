import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("company resource revisions contract", () => {
  const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
  const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
  const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
  const workspaceSource = readFileSync(resolve(process.cwd(), "client/src/pages/Workspace.tsx"), "utf8");

  it("persists an immutable, company-scoped revision sequence", () => {
    expect(schemaSource).toContain("companyResourceRevisions");
    expect(schemaSource).toContain("company_resource_revisions_unique");
    expect(schemaSource).toContain("revisionNumber");
    expect(schemaSource).toContain("beforeSnapshot");
    expect(schemaSource).toContain("afterSnapshot");
  });

  it("sanitizes snapshots and scopes history reads by company and resource", () => {
    expect(dbSource).toContain("function revisionSnapshot");
    expect(dbSource).not.toContain('"fileUrl", "mimeType", "versionNumber"');
    expect(dbSource).toContain("listCompanyResourceRevisions");
    expect(dbSource).toContain("eq(companyResourceRevisions.companyId, input.companyId)");
    expect(dbSource).toContain("companyResourceRevisions.resourceType");
    expect(dbSource).toContain("companyResourceRevisions.resourceId");
  });

  it("records critical unit, lease, and document changes", () => {
    expect(dbSource).toContain('resourceType: "unit"');
    expect(dbSource).toContain('resourceType: "lease"');
    expect(dbSource).toContain('resourceType: "document"');
    expect(dbSource).toContain('operation: "deleted"');
    expect(dbSource).toContain('operation: "replaced"');
  });

  it("exposes revisions only through the existing audit-read permission", () => {
    expect(routerSource).toContain("revisions: protectedProcedure");
    expect(routerSource).toContain('hasCompanyPermission(membership.member.role, "audit.read")');
    expect(routerSource).toContain("listCompanyResourceRevisions({ companyId: membership.company.id, ...input })");
  });

  it("provides a portfolio history view without rendering raw snapshots", () => {
    expect(workspaceSource).toContain("trpc.company.revisions.useQuery");
    expect(workspaceSource).toContain("historyTarget");
    expect(workspaceSource).toContain("item.revision.summary");
    expect(workspaceSource).not.toContain("item.revision.beforeSnapshot");
  });

  it("does not present a failed revision-history query as an empty audit trail", () => {
    expect(workspaceSource).toContain("revisionHistory.isError");
    expect(workspaceSource).toContain("revisionHistory.refetch()");
    expect(workspaceSource).toContain("revisionsCopy.unavailable");
    expect(workspaceSource).toContain("!revisionHistory.isError && (revisionHistory.data?.length ?? 0) === 0");
  });
});

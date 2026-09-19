import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/OperationalReports.tsx"), "utf8");

describe("operational reports contract", () => {
  it("uses existing company-scoped operational queries rather than a separate or fabricated data source", () => {
    expect(source).toContain("trpc.portfolio.hierarchy.useQuery");
    expect(source).toContain("trpc.portfolio.leasingCenter.useQuery");
    expect(source).toContain("trpc.portfolio.collections.useQuery");
    expect(source).toContain("trpc.operations.center.useQuery");
    expect(source).toContain("trpc.documents.center.useQuery");
    expect(source).toContain("const report = useMemo");
    expect(source).toContain("const unitRows = rows(asRecord(portfolio.data).units)");
  });

  it("does not request operational data before an authenticated active company is available", () => {
    expect(source).toContain("const enabled = Boolean(user && active && company.data?.company)");
    expect(source).toContain("{ enabled }");
    expect(source).toContain("This report shows only operational data authorized for your company.");
  });

  it("supports an aggregate CSV export and a print-ready view without exporting raw protected records", () => {
    expect(source).toContain("const reportRows: Array<[string, string | number]>");
    expect(source).toContain("reportRows.map(row => row.map(csvCell).join(\",\"))");
    expect(source).toContain("type: \"text/csv;charset=utf-8\"");
    expect(source).toContain("dar-est-operational-report-");
    expect(source).toContain("@media print");
    expect(source).toContain(".no-print");
    expect(source).toContain("window.print()");
    expect(source).not.toContain("tenantEmail");
    expect(source).not.toContain("signedUrl");
  });

  it("keeps failure distinct from an empty operational report and offers a retry", () => {
    expect(source).toContain("const hasError = enabled");
    expect(source).toContain("{t.unavailable}");
    expect(source).toContain("{t.retry}");
    expect(source).toContain("Promise.all([portfolio.refetch(), leasing.refetch(), collections.refetch(), operations.refetch(), documents.refetch()])");
  });
});

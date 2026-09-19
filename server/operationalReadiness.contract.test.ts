import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("operational readiness contracts", () => {
  const scope = readProjectFile("docs/operational_scope_and_ui_contracts.md");
  const revisions = readProjectFile("docs/domain_revision_architecture.md");
  const portfolio = readProjectFile("server/portfolioContracts.test.ts");
  const sales = readProjectFile("server/salesCenterContracts.test.ts");
  const workspaceModule = readProjectFile("client/src/pages/WorkspaceModule.tsx");
  const workspaceOperations = readProjectFile("client/src/components/WorkspaceModuleOperations.tsx");
  const salesPages = readProjectFile("client/src/pages/SalesCenterPages.tsx");
  const account = readProjectFile("client/src/pages/Account.tsx");
  const owner = readProjectFile("client/src/pages/Owner.tsx");
  const styles = readProjectFile("client/src/index.css");

  it("publishes an honest boundary for the first resource-revision release", () => {
    expect(scope).toContain("الوحدات وعقود الإيجار والمستندات");
    expect(scope).toContain("لا يوفّر الإصدار الحالي استعادة تلقائية");
    expect(revisions).toContain("وحدات المحفظة وعقود الإيجار والمستندات");
    expect(revisions).toContain("لا يضيف الإصدار الأول واجهة استعادة تلقائية");
  });

  it("keeps core portfolio and sales journeys contractually covered", () => {
    expect(portfolio).toContain("createPortfolioForCompany");
    expect(portfolio).toContain("createBuildingForCompany");
    expect(portfolio).toContain("createUnitForCompany");
    expect(portfolio).toContain("updateLeaseLifecycleForCompany");
    expect(sales).toContain("importSalesBatchForCompany");
    expect(sales).toContain("deleteSalesImportBatchForCompany");
    expect(sales).toContain("updateSalesPropertyForCompany");
    expect(sales).toContain("updateSalesClientForCompany");
    expect(sales).toContain("createSalesContractForCompany");
  });

  it("retains explicit loading and failure handling in the property and sales pages", () => {
    expect(workspaceModule).toContain("isLoading");
    expect(workspaceModule).toContain("isError");
    expect(salesPages).toContain("isLoading");
    expect(salesPages).toContain("isError");
    expect(salesPages).toContain("salesFailureCopy");
    expect(salesPages).toContain("refetch");
  });

  it("retains successful empty states for property, building, and sales workflows", () => {
    expect(workspaceOperations).toContain("No matching records. Use the add controls above to create a new record.");
    expect(workspaceOperations).toContain("لا توجد سجلات مطابقة حالياً. استخدم أداة الإضافة في أعلى الصفحة لإنشاء سجل جديد.");
    expect(salesPages).toContain("!properties.length");
    expect(salesPages).toContain("t.noProperties");
    expect(salesPages).toContain("!clients.length");
    expect(salesPages).toContain("t.noClients");
    expect(salesPages).toContain("!data.contracts.length");
    expect(salesPages).toContain("t.noContracts");
  });

  it("keeps the currently supported company-management experience explicit and executable", () => {
    expect(scope).toContain("إنشاء الشركة");
    expect(scope).toContain("إصدار دعوات الأعضاء أو إلغاؤها");
    expect(scope).toContain("لا تشمل إعدادات علامة تجارية، أو ضرائب، أو سياسات، أو حقول مخصصة");
    expect(account).toContain("trpc.company.create.useMutation");
    expect(account).toContain("trpc.company.invite.useMutation");
    expect(account).toContain("trpc.company.revokeInvitation.useMutation");
    expect(account).toContain("trpc.company.activity.useQuery");
  });

  it("keeps shared accessible design-system safeguards across operational surfaces", () => {
    expect(scope).toContain("مؤشر تركيز مرئي موحداً");
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("prefers-reduced-motion");
    expect(styles).toContain("max-width: 100%");
    expect(salesPages).toContain('role="alert"');
    expect(salesPages).toContain("focus:ring-2");
    expect(workspaceModule).toContain("sm:grid-cols-3");
    expect(workspaceOperations).toContain("function Field");
    expect(workspaceOperations).toContain("function SectionTitle");
    expect(workspaceOperations).toContain("filteredRows.map");
    expect(workspaceOperations).toContain("divide-y divide-white/8");
    expect(workspaceOperations).toContain("setEditor");
    expect(salesPages).toContain("SalesHub");
    expect(salesPages).toContain("PaymentPlanCalculator");
    expect(salesPages).toContain("SalesPropertyDetail");
  });

  it("keeps the owner subscription review console explicit, guarded, and recoverable", () => {
    expect(owner).toContain('["#subscription-review", copy.review]');
    expect(owner).toContain("stats.isError");
    expect(owner).toContain("manualRequests.isError");
    expect(owner).toContain("reviewRequests");
    expect(owner).toContain("showAllManualReviews");
    expect(owner).toContain("!hasProof");
    expect(owner).toContain("approveManualRequest.mutate");
    expect(owner).toContain("rejectManualRequest.mutate");
    expect(owner).toContain('role="alert"');
  });

  it("keeps owner subscriber filtering, audit records, and responsive review surfaces verifiable", () => {
    expect(owner).toContain("const filteredSubscriptions =");
    expect(owner).toContain("setSubscriptionSearch");
    expect(owner).toContain("setSubscriptionStatus");
    expect(owner).toContain('id="audit-trail"');
    expect(owner).toContain("overflow-x-auto");
    expect(owner).toContain("whitespace-nowrap");
    expect(owner).toContain("lg:grid-cols-[minmax(0,1fr)_auto]");
  });
});

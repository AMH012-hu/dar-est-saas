import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const accountSource = readFileSync(new URL("../client/src/pages/Account.tsx", import.meta.url), "utf8");
const localeSource = readFileSync(new URL("../client/src/contexts/LocaleContext.tsx", import.meta.url), "utf8");
const localeCopySource = readFileSync(new URL("../client/src/lib/i18n.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const checkoutSource = readFileSync(new URL("../client/src/pages/Checkout.tsx", import.meta.url), "utf8");
const ownerSource = readFileSync(new URL("../client/src/pages/Owner.tsx", import.meta.url), "utf8");
const inviteSource = readFileSync(new URL("../client/src/pages/AcceptInvite.tsx", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("../client/src/pages/Workspace.tsx", import.meta.url), "utf8");
const floatingAgentSource = readFileSync(new URL("../client/src/components/FloatingPropertyAgent.tsx", import.meta.url), "utf8");
const clientDemoSource = readFileSync(new URL("../client/src/pages/ClientDemo.tsx", import.meta.url), "utf8");
const themeSource = readFileSync(new URL("../client/src/contexts/ThemeContext.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("../client/src/main.tsx", import.meta.url), "utf8");
const indexHtmlSource = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

/**
 * These lightweight contracts protect the delivered UI requirements without
 * requiring a browser-only test runner in the server test environment.
 */
describe("delivered UI contracts", () => {
  it("keeps invoice preview and PDF download actions in the account page", () => {
    expect(accountSource).toContain("setPreviewInvoice");
    expect(accountSource).toContain("downloadInvoicePdf");
    expect(accountSource).toContain("InvoicePreviewModal");
    expect(accountSource).toContain("invoiceLang");
    expect(accountSource).toContain("Invoice language");
    expect(accountSource).toContain("لغة الفاتورة");
  });

  it("keeps WhatsApp purchase and plan-bound activation in checkout", () => {
    expect(checkoutSource).toContain('const WHATSAPP_NUMBER = "201501805674"');
    expect(checkoutSource).toContain("redeemKey");
    expect(checkoutSource).toContain("activationKey");
    expect(routerSource).toContain("redeemKey");
  });

  it("routes active users by account destination and localizes invitation flow", () => {
    expect(homeSource).toContain("trpc.account.access.useQuery");
    expect(homeSource).toContain("accountAccess.data?.destination");
    expect(homeSource).toContain("window.location.replace(destination)");
    expect(appSource).toContain('path="/workspace"');
    expect(workspaceSource).toContain("trpc.company.current.useQuery");
    expect(workspaceSource).toContain('href="/account"');
    expect(inviteSource).toContain("useLocale");
    expect(inviteSource).toContain('dir={dir}');
    expect(inviteSource).toContain('t("acceptInvite")');
    expect(inviteSource).not.toMatch(/[\u0600-\u06ff]/);
  });

  it("keeps the five-language provider contract across the four primary pages", () => {
    for (const source of [homeSource, accountSource, checkoutSource, ownerSource]) expect(source).toContain("useLocale");
    for (const language of ["ar", "en", "he", "ru", "uk"]) expect(localeCopySource).toContain(`${language}:`);
    expect(localeSource).toContain("dir");
    expect(localeSource).toContain('return explicitlyChosen && stored && languageOptions.some(option => option.code === stored) ? stored : "en"');
    expect(localeSource).toContain('dar-est-language-explicit');
    expect(localeSource).toContain('window.localStorage.setItem("dar-est-language-explicit", "1")');
    expect(localeSource).toContain("document.documentElement");
    expect(appSource).toContain("<LocaleProvider>");
    expect(appSource).toContain("<Router />");
    expect(appSource).toContain("LocaleProvider");
  });

  it("keeps owner test plan options localized instead of exposing raw plan codes", () => {
    expect(ownerSource).toContain('import { planNames } from "@/lib/checkoutCopy"');
    expect(ownerSource).toContain("planNames[lang][code]");
    expect(ownerSource).toContain("PLAN_CODES.map");
    expect(ownerSource).not.toContain('<option value="monthly">1 month</option>');
  });

  it("keeps activation inventory and analytics behind the owner page", () => {
    expect(ownerSource).toContain("owner.activationKeys");
    expect(ownerSource).toContain("owner.stats");
    expect(ownerSource).toContain("createActivationKeys");
    expect(routerSource).toContain("adminProcedure");
  });

  it("keeps owner test purchases marked and auditable", () => {
    expect(routerSource).toContain("ownerTestPurchase");
    expect(routerSource).toContain("adminProcedure");
    expect(routerSource).toContain("ctx.user.name");
    expect(routerSource).toContain("priceIls");
    expect(dbSource).toContain("isTest: input.isTest");
    expect(dbSource).toContain("isTest: input.isTest,");
    expect(schemaSource).toContain('isTest: boolean("isTest").default(false).notNull()');
    expect(schemaSource).toContain('paymentProvider", ["paypal", "bit", "owner_test"');
  });

  it("keeps the owner audit filters server-connected and localized", () => {
    expect(routerSource).toContain("from: z.string().regex");
    expect(routerSource).toContain("listAuditLogsForOwner({");
    expect(ownerSource).toContain("auditAction");
    expect(ownerSource).toContain("auditActor");
    expect(ownerSource).toContain("auditSearch");
    expect(ownerSource).toContain("searchPlaceholder");
    expect(ownerSource).toContain("type=\"date\"");
    expect(routerSource).toContain("search: z.string().trim().max");
    for (const key of ["from:", "to:", "actionFilter:", "actorFilter:", "search:", "clearFilters:"]) expect(ownerSource).toContain(key);
  });

  it("keeps company read queries safe for limited roles", () => {
    expect(routerSource).toContain("hasCompanyPermission(membership.member.role, \"members.read\")");
    expect(routerSource).toContain("hasCompanyPermission(membership.member.role, \"audit.read\")");
    expect(accountSource).toContain("trpc.company.members.useQuery");
    expect(workspaceSource).toContain("trpc.company.current.useQuery");
  });

  it("keeps account duration and used-key history visible", () => {
    expect(accountSource).toContain("usedActivationKeys");
    expect(accountSource).toContain("subscriptionProgress");
    expect(accountSource).toContain("daysRemaining");
    expect(accountSource).toContain("expiringSoon");
    expect(accountSource).toContain("progressBarTone");
    expect(accountSource).toContain("usedKeysPage");
    expect(accountSource).toContain("usedActivationKeysPagination");
    expect(accountSource).toContain("previousPage");
    expect(accountSource).toContain("nextPage");
    expect(accountSource).toContain("style={{ width: `${progress}%` }}");
  });

  it("keeps bulk key generation immediately downloadable", () => {
    expect(ownerSource).toMatch(/downloadCsv\(\s*result\.map/);
    expect(ownerSource).toContain("dar-est-${plan}-keys.csv");
  });

  it("keeps audit CSV export and advanced time-range filters available", () => {
    expect(ownerSource).toContain("exportAudit");
    expect(ownerSource).toMatch(/downloadCsv\(\s*audits\.data\.map/);
    expect(ownerSource).toContain("applyAuditRange");
    for (const range of ["last7", "last30", "last90", "customRange"]) expect(ownerSource).toContain(range);
    expect(routerSource).toContain("from: z.string().regex");
    expect(routerSource).toContain("to: z.string().regex");
  });

  it("keeps used-key pagination visibly loading between pages", () => {
    expect(accountSource).toContain("subscription.isFetching");
    expect(accountSource).toContain("animate-pulse");
    expect(accountSource).toContain("Loading used activation keys");
  });

  it("keeps payment choices explicit and activation separate from payment confirmation", () => {
    expect(checkoutSource).toContain('paypal: "https://www.paypal.com/qrcodes/p2pqrc/C7Q5PY283N5QA"');
    expect(checkoutSource).toContain('bit: "https://www.bitpay.co.il/app/me/C6CBFC03-787A-2F4E-8878-1A34E17937D86AE4"');
    expect(checkoutSource).toContain("choosePayment");
    expect(checkoutSource).toContain("paymentPending");
    expect(checkoutSource).toContain("createPaymentRequest");
    expect(checkoutSource).toContain('target="_blank"');
    expect(checkoutSource).toContain('rel="noopener noreferrer"');
    expect(checkoutSource).toContain("redeemKey");
  });

  it("keeps workspace benefits plan-bound and localized", () => {
    expect(workspaceSource).toContain("planBenefits");
    expect(workspaceSource).toContain("currentPlan");
    expect(workspaceSource).toContain("planStatus");
    for (const language of ["ar", "en", "he", "ru", "uk"]) expect(workspaceSource).toContain(`${language}:`);
    expect(workspaceSource).toContain("Included in your subscription");
  });

  it("keeps the workspace decision-led and unit-contextual", () => {
    expect(workspaceSource).toContain("operatingDecisions");
    expect(workspaceSource).toContain("Decision centre");
    expect(workspaceSource).toContain("leaseSummary.vacantUnits");
    expect(workspaceSource).toContain("arrearsRiskIls");
    expect(workspaceSource).toContain("summary.overdue");
    expect(workspaceSource).toContain("Create a portfolio, building, and unit first");
    expect(workspaceSource).toContain("Open work order");
  });

  it("keeps the public home split between a real workspace explanation and the dedicated plans page", () => {
    expect(homeSource).toContain('id="workspace"');
    expect(homeSource).toContain('id="plans"');
    expect(homeSource).toContain('href="/plans"');
    expect(homeSource).toContain('href="/workspace"');
    expect(homeSource).toContain("workspaceAccess");
    expect(homeSource).toContain("dataNotice");
    expect(homeSource).toContain("no sample figures are presented as your data");
    expect(homeSource).not.toContain("[24, 18, 7]");
    expect(homeSource).not.toContain("+18.4%");
    expect(homeSource).toContain("localeOptions.map");
    expect(homeSource).toContain("role=\"menu\"");
    expect(homeSource).toContain("aria-expanded={languageOpen}");
    for (const language of ["ar", "en", "he", "ru", "uk"]) expect(homeSource).toContain(`${language}:`);
  });

  it("keeps the AI Property Agent globally discoverable with safe smart-matching filters", () => {
    expect(appSource).toContain("FloatingPropertyAgent");
    expect(floatingAgentSource).toContain("trpc.sales.propertyAssistant.useMutation");
    expect(floatingAgentSource).toContain("trpc.sales.transcribeAssistantAudio.useMutation");
    expect(floatingAgentSource).toContain("Maximum budget");
    expect(floatingAgentSource).toContain("Region or project");
    expect(floatingAgentSource).toContain("Bedrooms");
    expect(floatingAgentSource).toContain("Availability");
    expect(floatingAgentSource).toContain("filters:");
    expect(floatingAgentSource).toContain("optionalInteger");
    expect(floatingAgentSource).toContain("text.recovery");
    expect(floatingAgentSource).toContain("navigator.mediaDevices.getUserMedia");
    expect(floatingAgentSource).toContain("Recommended matches");
    expect(floatingAgentSource).toContain("latestReplyKey");
    expect(floatingAgentSource).toContain("pendingRequestKeys");
    expect(floatingAgentSource).toContain("answeredRequestKeys");
    expect(floatingAgentSource).toContain('replace(/[أإآ]/g, "ا")');
    expect(floatingAgentSource).toContain("text.duplicate");
    expect(floatingAgentSource).toContain("data.matches");
    expect(floatingAgentSource).toContain("/sales/properties/${match.id}");
    expect(floatingAgentSource).toContain("Minimum area (sqm)");
  });

  it("keeps light mode switchable and styles core application surfaces beyond a single override", () => {
    expect(themeSource).toContain("localStorage.getItem(\"theme\")");
    expect(themeSource).toContain('root.classList.remove("dark")');
    expect(stylesSource).toContain("html:not(.dark) body");
    expect(stylesSource).toContain('html:not(.dark) [class*="bg-[#071a27]"]');
    expect(stylesSource).toContain("html:not(.dark) input");
    expect(stylesSource).toContain("html:not(.dark) [class*=");
  });

  it("keeps a public client demo focused on real platform problems and conversion", () => {
    expect(appSource).toContain('path="/demo"');
    expect(appSource).toContain("ClientDemo");
    expect(clientDemoSource).toContain("المشكلة ← الحل");
    expect(clientDemoSource).toContain("مركز مبيعات متكامل");
    expect(clientDemoSource).toContain("مستشار عقاري ذكي");
    expect(clientDemoSource).toContain("https://wa.me/201501805674");
    expect(clientDemoSource).toContain("عزل بيانات الشركات");
    expect(clientDemoSource).toContain("دون اختلاق أرقام نجاح");
  });

  it("keeps public mobile browsing inside DAR.EST instead of auto-opening hosted sign-in", () => {
    expect(mainSource).not.toContain("redirectToLoginIfUnauthorized");
    expect(mainSource).not.toContain("startLogin()");
    expect(homeSource).toContain("useAuth()");
    expect(stylesSource).toContain("max-width: 100%");
    expect(stylesSource).toContain("overflow-x: clip");
    expect(indexHtmlSource).toContain("viewport-fit=cover");
    expect(indexHtmlSource).not.toContain("maximum-scale=1");
  });
});

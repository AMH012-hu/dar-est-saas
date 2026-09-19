import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSalesImportRowValue, prepareSalesImportRows, salesImportedPropertyStatus, summarizeSalesImportRows } from "./db";

describe("sales center contracts", () => {
  it("keeps sales data company-scoped and wires the protected workspace experience", () => {
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const workspace = readFileSync(resolve(process.cwd(), "client/src/pages/Workspace.tsx"), "utf8");
    const salesWorkspace = readFileSync(resolve(process.cwd(), "client/src/pages/SalesWorkspace.tsx"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const salesPages = readFileSync(resolve(process.cwd(), "client/src/pages/SalesCenterPages.tsx"), "utf8");

    expect(schema).toContain('"sales_import_batches"');
    expect(schema).toContain('"sales_properties"');
    expect(schema).toContain('ownerName: varchar("ownerName", { length: 220 })');
    expect(schema).toContain('"sales_clients"');
    expect(schema).toContain('"sales_contracts"');
    expect(schema).toContain('"sales_installments"');
    expect(schema).toContain('companyId: int("companyId")');
    expect(schema).toContain('paymentFrequency: mysqlEnum("paymentFrequency", ["quarterly", "semiannual", "annual"])');
    expect(schema).toContain('"sales_call_inventory"');
    expect(schema).toContain('sales_call_inventory_company_client_idx');

    expect(db).toContain("listSalesCenterForCompany");
    expect(db).toContain("importSalesBatchForCompany");
    expect(db).toContain("deleteSalesImportBatchForCompany");
    expect(db).toContain("updateSalesPropertyForCompany");
    expect(db).toContain("updateSalesClientForCompany");
    expect(db).toContain("calculateSalesPaymentPlan");
    expect(db).toContain("createSalesContractForCompany");
    expect(db).toContain("createSalesCallInventoryForCompany");
    expect(db).toContain("listSalesCallInventoryForClient");
    expect(db).toContain("SALES_CLIENT_NOT_ASSIGNED");
    expect(db).toContain("IMPORT_BATCH_HAS_SALE_CONTRACTS");
    expect(db).toContain("assertCompanyOperationalAccess(input.companyId, input.userId, true)");
    expect(db).toContain("summarizeSalesImportRows");
    expect(db).toContain("prepareSalesImportRows");
    expect(db).toContain("missingClientContactRows");
    expect(db).toContain("missingContractPriceRows");
    expect(db).toContain("importSummary");
    expect(db).toContain('"owner_name", "owner name", "developer"');
    expect(db).toContain('"طابق", "الدور", "קומה"');
    expect(db).toContain('"view_description", "view description"');

    expect(router).toContain("sales: router");
    expect(router).toContain("Create or join a company before opening the sales center.");
    expect(router).toContain("importBatch: protectedProcedure");
    expect(router).toContain("deleteImportBatch: protectedProcedure");
    expect(router).toContain("createContract: protectedProcedure");
    expect(router).toContain("createCallInventory: protectedProcedure");
    expect(router).toContain("listCallInventory: protectedProcedure");
    expect(router).toContain("recordAttendance: protectedProcedure");
    expect(router).toContain('message: "SALES_MANAGE_REQUIRED"');
    expect(router).toContain("termYears: z.number().int().min(1).max(5)");

    expect(db).toContain("recordSalesAttendanceForUser");
    expect(db).toContain("if (!access.salesMember && !access.canManage) throw new Error(\"SALES_TEAM_MEMBER_REQUIRED\")");
    expect(db).toContain("Company owners, admins, and managers receive sales-team management access");

    expect(workspace).not.toContain("<SalesCenterPanel lang={lang} />");
    expect(workspace).toContain('href="/sales"');
    expect(workspace).toContain("trpc.sales.center.useQuery");
    expect(workspace).toContain("trpc.sales.importBatch.useMutation");
    expect(workspace).toContain("trpc.sales.updateProperty.useMutation");
    expect(workspace).toContain("trpc.sales.updateClient.useMutation");
    expect(workspace).toContain("trpc.sales.createContract.useMutation");
    expect(workspace).toContain("readAsDataURL(file)");
    expect(workspace).toContain("export function SalesCenterPanel");
    expect(workspace).toContain("function SalesImportedFields");
    expect(workspace).toContain("salesAttributeEntries");
    expect(workspace).toContain("SalesImportSummary");
    expect(workspace).toContain("summaryText.title");
    expect(workspace).toContain("result.importSummary");
    expect(workspace).toContain("missingClientContactRows");
    expect(workspace).toContain("missingContractPriceRows");
    expect(workspace).toContain("skippedMissingNameRows");
    expect(workspace).toContain("IMPORT_NO_VALID_PROPERTY_ROWS");
    expect(workspace).not.toContain("<textarea className={`${inputClass} sm:col-span-2`} rows={2} value={draft.attributesJson");
    expect(salesWorkspace).not.toContain('import { SalesCenterPanel } from "./Workspace"');
    expect(salesWorkspace).not.toContain("<SalesCenterPanel lang={lang} />");
    expect(app).toContain('path="/sales/properties/:id"');
    expect(app).toContain('path="/sales/properties"');
    expect(app).toContain('path="/sales/clients/:id"');
    expect(app).toContain('path="/sales/clients"');
    expect(app).toContain('path="/sales/contracts"');
    expect(app).toContain('path="/sales/import"');
    expect(app).toContain('path="/sales/team"');
    expect(salesPages).toContain("export function SalesPropertyDetail");
    expect(salesPages).toContain("export function SalesClientDetail");
    expect(salesPages).toContain("export function SalesContracts");
    expect(salesPages).toContain("<ImportedFields values={attributes}");
    expect(salesPages).toContain("trpc.sales.createCallInventory.useMutation");
    expect(salesPages).toContain("trpc.sales.listCallInventory.useQuery");
    expect(salesPages).toContain("const { canManage } = useSalesViewer()");
    expect(salesPages).toContain('if (!canManage) return <SalesShell title={t.importTitle}');
    expect(salesWorkspace).toContain('navigate("/sales")');
    expect(salesWorkspace).toContain("trpc.sales.recordAttendance.useMutation");
  });

  it("maps a multilingual spreadsheet row while retaining non-standard business columns", () => {
    const propertyRow = {
      "פרויקט": "מגדלי הים",
      "رقم الوحدة": "A-1704",
      "المساحة الكلية": "121.5 م²",
      "سعر البيع": "₪ 1,250,000",
      "סטטוס": "שמור",
      "נוף": "ים",
      "مالك": "شركة الساحل",
      "طابق": "17",
      "Payment stage": "Pre-launch",
    };
    const clientRow = {
      "اسم العميل الكامل": "ليلى محمود",
      "דואל": "layla@example.test",
      "رقم التليفون": "01222104056",
      "رقم الهوية": "123456789",
      "Preferred contact time": "Evening",
    };

    expect(getSalesImportRowValue(propertyRow, ["project", "פרויקט"])).toBe("מגדלי הים");
    expect(getSalesImportRowValue(propertyRow, ["unit_number", "رقم الوحدة"])).toBe("A-1704");
    expect(getSalesImportRowValue(propertyRow, ["area", "المساحة الكلية"])).toBe("121.5 م²");
    expect(getSalesImportRowValue(propertyRow, ["price", "سعر البيع"])).toBe("₪ 1,250,000");
    expect(getSalesImportRowValue(propertyRow, ["owner", "مالك"])).toBe("شركة الساحل");
    expect(getSalesImportRowValue(propertyRow, ["floor", "طابق"])).toBe("17");
    expect(getSalesImportRowValue(clientRow, ["email", "דואל"])).toBe("layla@example.test");
    expect(getSalesImportRowValue(clientRow, ["phone", "رقم التليفون"])).toBe("01222104056");
    expect(getSalesImportRowValue(clientRow, ["identity", "رقم الهوية"])).toBe("123456789");

    const propertySummary = summarizeSalesImportRows("properties", [propertyRow]);
    const clientSummary = summarizeSalesImportRows("clients", [clientRow]);
    expect(propertySummary.mappedColumns).toEqual(expect.arrayContaining(["פרויקט", "رقم الوحدة", "المساحة الكلية", "سعر البيع", "סטטוס", "مالك", "طابق", "נוף"]));
    expect(propertySummary.retainedColumns).toEqual(expect.arrayContaining(["Payment stage"]));
    expect(propertySummary.missingContractPriceRows).toBe(0);
    expect(clientSummary.mappedColumns).toEqual(expect.arrayContaining(["اسم العميل الكامل", "דואל", "رقم الهوية"]));
    expect(clientSummary.retainedColumns).toContain("Preferred contact time");
    expect(clientSummary.missingClientContactRows).toBe(0);
  });

  it("prioritizes a precise Status Code over an ambiguous status description", () => {
    expect(salesImportedPropertyStatus({ Status: "Contracted Not Ready", "Status Code": "SOLD" })).toBe("sold");
    expect(salesImportedPropertyStatus({ Status: "UNSOLD", "Status Code": "UNSOLD" })).toBe("available");
  });

  it("skips blank and nameless property rows while retaining a valid row", () => {
    const prepared = prepareSalesImportRows("properties", [
      { "اسم المشروع": "", "رقم الوحدة": "", "سعر البيع": "" },
      { "سعر البيع": "500000", "المساحة": "85" },
      { "اسم المشروع": "روابي", "رقم الوحدة": "B-12", "سعر البيع": "650000" },
    ]);

    expect(prepared.skippedBlankRows).toBe(1);
    expect(prepared.skippedMissingNameRows).toBe(1);
    expect(prepared.validRows).toHaveLength(1);
    expect(getSalesImportRowValue(prepared.validRows[0], ["رقم الوحدة"])).toBe("B-12");
  });
});

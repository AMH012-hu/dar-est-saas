import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("CRM contracts", () => {
  it("keeps CRM data company-scoped and exposes the final sales workspace contract", () => {
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/SalesCRM.tsx"), "utf8");
    const hub = readFileSync(resolve(process.cwd(), "client/src/pages/SalesCenterPages.tsx"), "utf8");

    expect(schema).toContain('export const salesClients = mysqlTable(');
    expect(schema).toContain('export const crmActivities = mysqlTable(');
    expect(schema).toContain('export const crmClientProperties = mysqlTable(');
    expect(schema).toContain('export const crmStageHistory = mysqlTable(');
    expect(schema).toContain('companyId: int("companyId")');
    expect(schema).toContain('pipelineStage: mysqlEnum("pipelineStage", ["new", "contacted", "qualified", "viewing", "negotiation", "won", "lost"])');

    expect(db).toContain("listCrmClientsForCompany");
    expect(db).toContain("getCrmClientForCompany");
    expect(db).toContain("getCrmPipelineSummaryForCompany");
    expect(db).toContain("updateCrmClientForCompany");
    expect(db).toContain("createCrmActivityForCompany");
    expect(db).toContain("linkCrmPropertyToClient");
    expect(db).toContain("getSalesTeamAccess");

    expect(router).toContain("crmClients: protectedProcedure");
    expect(router).toContain("crmClient: protectedProcedure");
    expect(router).toContain("crmPipelineSummary: protectedProcedure");
    expect(router).toContain("updateCrmClient: protectedProcedure");
    expect(router).toContain("createCrmActivity: protectedProcedure");
    expect(router).toContain("linkCrmProperty: protectedProcedure");

    expect(app).toContain('path="/sales/crm"');
    expect(page).toContain("trpc.sales.crmClients.useQuery");
    expect(page).toContain("trpc.sales.crmPipelineSummary.useQuery");
    expect(page).toContain("trpc.sales.updateCrmClient.useMutation");
    expect(page).toContain("trpc.sales.createCrmActivity.useMutation");
    expect(page).toContain("Pipeline snapshot");
    expect(page).toContain("Client details");
    expect(hub).toContain("t.crm");
    expect(hub).toContain('path: "/sales/crm"');
  });
});

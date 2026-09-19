import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("operations center contracts", () => {
  it("defines vendors, work orders, and guarded company-scoped procedures", () => {
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const workspace = readFileSync(resolve(process.cwd(), "client/src/pages/Workspace.tsx"), "utf8");
    expect(schema).toContain('"vendors"');
    expect(schema).toContain('"work_orders"');
    expect(schema).toContain('tenantId: int("tenantId")');
    expect(schema).toContain('actualCostIls: int("actualCostIls")');
    expect(schema).toContain('resolvedAt: timestamp("resolvedAt")');
    expect(db).toContain("getOperationsCenterForCompany");
    expect(db).toContain("eq(vendors.companyId, companyId)");
    expect(db).toContain("eq(workOrders.companyId, companyId)");
    expect(db).toContain("TENANT_ACCESS_REQUIRED");
    expect(db).toContain("UNIT_ACCESS_REQUIRED");
    expect(db).toContain("updateWorkOrderForCompany");
    expect(db).toContain("WORK_ORDER_ACCESS_REQUIRED");
    expect(router).toContain("operations: router");
    expect(router).toContain("createWorkOrderForCompany");
    expect(router).toContain("updateWorkOrderForCompany");
    expect(router).toContain("tenantId: z.number().int().positive().nullable().optional()");
    expect(workspace).toContain("trpc.operations.center.useQuery");
    expect(workspace).toContain("مركز العمليات وأوامر العمل");
    expect(workspace).toContain("workOrderForm");
    expect(workspace).toContain("Open work order");
    expect(workspace).toContain("Execution tracking");
    expect(workspace).toContain("Mark resolved");
  });
});

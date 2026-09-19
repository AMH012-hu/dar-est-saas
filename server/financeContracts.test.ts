import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("finance center contracts", () => {
  it("defines isolated finance storage and guarded procedures", () => {
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const workspace = readFileSync(resolve(process.cwd(), "client/src/pages/Workspace.tsx"), "utf8");
    expect(schema).toContain('"recurring_charges"');
    expect(schema).toContain('"expenses"');
    expect(db).toContain("getFinanceCenterForCompany");
    expect(db).toContain("eq(recurringCharges.companyId, companyId)");
    expect(db).toContain("eq(expenses.companyId, companyId)");
    expect(schema).toContain('"lease_collections"');
    expect(db).toContain("leaseCollections");
    expect(db).toContain("arrearsRiskIls");
    expect(db).toContain("amountDueIls - collection.amountReceivedIls");
    expect(router).toContain("finance: router");
    expect(router).toContain("getFinanceCenterForCompany");
    expect(workspace).toContain("trpc.finance.center.useQuery");
    expect(workspace).toContain("trpc.portfolio.recordPayment.useMutation");
    expect(workspace).toContain("תשלום");
    expect(workspace).toContain("مركز المالية والتحصيل");
  });
});

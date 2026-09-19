import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SUBSCRIPTION_PLANS } from "../shared/subscriptionPlans";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const workspaceSource = readFileSync(new URL("../client/src/pages/Workspace.tsx", import.meta.url), "utf8");

describe("operational resource contracts", () => {
  it("defines finite quotas for paid tiers and an unlimited VIP tier", () => {
    expect(SUBSCRIPTION_PLANS.monthly.limits.properties).toBe(5);
    expect(SUBSCRIPTION_PLANS.quarterly.limits.clients).toBe(100);
    expect(SUBSCRIPTION_PLANS.semiannual.limits.tasks).toBe(500);
    expect(SUBSCRIPTION_PLANS.annual.limits.properties).toBeNull();
    expect(SUBSCRIPTION_PLANS.annual.limits.members).toBeNull();
  });

  it("keeps resource queries and mutations inside the resources router", () => {
    for (const procedure of ["snapshot", "properties", "clients", "tasks", "createProperty", "updateProperty", "deleteProperty", "createClient", "updateClient", "deleteClient", "createTask", "updateTask", "deleteTask"]) {
      expect(routerSource).toContain(`${procedure}:`);
    }
    expect(routerSource).toContain('requireCompanyPermission(membership.member.role, "workspace.read")');
    expect(routerSource).toContain('requireCompanyPermission(membership.member.role, "workspace.write")');
  });

  it("keeps database writes company-scoped and quota-checked", () => {
    for (const helper of ["createPropertyForCompany", "updatePropertyForCompany", "deletePropertyForCompany", "createClientForCompany", "updateClientForCompany", "deleteClientForCompany", "createTaskForCompany", "updateTaskForCompany", "deleteTaskForCompany"]) {
      expect(dbSource).toContain(`export async function ${helper}`);
    }
    expect(dbSource).toContain("assertCompanySubscriptionAndQuota");
    expect(dbSource).toContain("eq(properties.companyId, input.companyId)");
    expect(dbSource).toContain("eq(clients.companyId, input.companyId)");
    expect(dbSource).toContain("eq(tasks.companyId, input.companyId)");
  });

  it("renders localized operational sections with visible usage and CRUD actions", () => {
    for (const language of ["ar:", "en:", "he:", "ru:", "uk:"]) expect(workspaceSource).toContain(language);
    for (const marker of ["resources.properties", "resources.clients", "resources.tasks", "usage", "startCreate", "startEdit", "deleteProperty", "deleteClient", "deleteTask"]) expect(workspaceSource).toContain(marker);
  });
});

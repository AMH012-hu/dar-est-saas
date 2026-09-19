import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const apiSource = readFileSync(new URL("./integrationApi.ts", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const salesSource = readFileSync(new URL("../client/src/pages/SalesCenterPages.tsx", import.meta.url), "utf8");
const integrationPageSource = readFileSync(new URL("../client/src/pages/IntegrationCenter.tsx", import.meta.url), "utf8");

describe("DAR.EST integration contracts", () => {
  it("registers a versioned REST surface with public inventory and protected lead writes", () => {
    expect(serverSource).toContain("registerIntegrationApi(app)");
    expect(apiSource).toContain('const API_PREFIX = "/api/integrations/v1"');
    expect(apiSource).toContain('app.get(`${API_PREFIX}/properties`');
    expect(apiSource).toContain('app.get(`${API_PREFIX}/properties/:id`');
    expect(apiSource).toContain('app.post(`${API_PREFIX}/leads`');
    expect(apiSource).toContain('app.post(`${API_PREFIX}/inquiries`');
    expect(apiSource).toContain("DAR_EST_INTEGRATION_API_KEY");
  });

  it("keeps write authentication server-side and handles CORS preflight", () => {
    expect(apiSource).toContain("Authorization");
    expect(apiSource).toContain("X-DAR-EST-API-Key");
    expect(apiSource).toContain("timingSafeEqual");
    expect(apiSource).toContain('if (req.method === "OPTIONS") return res.status(204).end()');
    expect(apiSource).toContain("DAR_EST_INTEGRATION_ALLOWED_ORIGINS");
    expect(integrationPageSource).toContain("Never put it in browser JavaScript");
  });

  it("filters inventory to published available properties and exposes safe public fields", () => {
    expect(dbSource).toContain("listPublishedSalesPropertiesForCompanySlug");
    expect(dbSource).toContain("getPublishedSalesPropertyForCompanySlug");
    expect(dbSource).toContain('eq(salesProperties.isPublished, true)');
    expect(dbSource).toContain('eq(salesProperties.status, "available")');
    expect(apiSource).toContain("priceEgp: property.listPriceIls");
    expect(apiSource).not.toContain("identityNumber");
  });

  it("creates a CRM lead, activity, property interest, and deduplicates external submissions", () => {
    expect(dbSource).toContain("createIntegrationLeadForCompany");
    expect(dbSource).toContain('eq(salesClients.externalId, input.externalId.trim())');
    expect(dbSource).toContain('pipelineStage: "new"');
    expect(dbSource).toContain("db.insert(crmActivities)");
    expect(dbSource).toContain("db.insert(crmClientProperties)");
    expect(dbSource).toContain("db.insert(propertyInquiries)");
  });

  it("links the integration center from the sales hub for managers", () => {
    expect(appSource).toContain('path="/sales/integrations"');
    expect(salesSource).toContain("Website integration");
    expect(salesSource).toContain('path: "/sales/integrations"');
    expect(integrationPageSource).toContain("/api/integrations/v1/openapi.json");
    expect(integrationPageSource).toContain("POST /leads");
  });
});

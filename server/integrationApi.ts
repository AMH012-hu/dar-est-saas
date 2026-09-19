import { createHash, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import {
  createIntegrationLeadForCompany,
  getPublishedSalesPropertyForCompanySlug,
  listPublishedSalesPropertiesForCompanySlug,
} from "./db";

const API_PREFIX = "/api/integrations/v1";
const leadRateWindows = new Map<string, { count: number; resetAt: number }>();

const leadSchema = z.object({
  companySlug: z.string().trim().min(1).max(180),
  propertyId: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(180),
  phone: z.string().trim().min(5).max(48),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(4000),
  source: z.string().trim().min(1).max(100).optional(),
  externalId: z.string().trim().min(1).max(160).optional(),
  preferredPropertyType: z.string().trim().max(120).optional(),
  preferredLocation: z.string().trim().max(180).optional(),
  budgetMinIls: z.number().int().min(0).max(1_000_000_000).optional(),
  budgetMaxIls: z.number().int().min(0).max(1_000_000_000).optional(),
});

function parseJson(value: string | null, fallback: unknown) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function publicProperty(property: Awaited<ReturnType<typeof getPublishedSalesPropertyForCompanySlug>>) {
  if (!property) return null;
  return {
    id: property.id,
    name: property.name,
    address: property.address,
    propertyType: property.propertyType,
    status: property.status,
    areaSqm: property.areaSqm,
    priceEgp: property.listPriceIls,
    description: property.publicDescription,
    images: parseJson(property.publicImagesJson, []),
    paymentPlan: parseJson(property.paymentPlanJson, null),
    videoUrl: property.publicVideoUrl,
    virtualTourUrl: property.publicTourUrl,
    floorPlanUrl: property.publicFloorPlanUrl,
    latitude: property.publicLatitude,
    longitude: property.publicLongitude,
    updatedAt: property.updatedAt,
  };
}

function requestId(req: Request) {
  return (req as Request & { requestId?: string }).requestId ?? "unknown";
}

function sendError(res: Response, req: Request, status: number, code: string, message: string) {
  return res.status(status).json({ ok: false, error: { code, message, requestId: requestId(req) } });
}

function allowedOrigins() {
  return (process.env.DAR_EST_INTEGRATION_ALLOWED_ORIGINS || "*")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

function applyCors(req: Request, res: Response) {
  const origin = req.header("origin");
  const origins = allowedOrigins();
  if (origins.includes("*") || (origin && origins.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origins.includes("*") ? "*" : origin!);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-DAR-EST-API-Key, X-Request-ID");
  res.setHeader("Access-Control-Max-Age", "600");
}

function suppliedApiKey(req: Request) {
  const authorization = req.header("authorization") || "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return req.header("x-dar-est-api-key")?.trim() || "";
}

function hasValidWriteKey(req: Request) {
  const expected = process.env.DAR_EST_INTEGRATION_API_KEY?.trim();
  const supplied = suppliedApiKey(req);
  if (!expected || !supplied) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

function withinLeadRateLimit(req: Request) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = leadRateWindows.get(key);
  if (!current || current.resetAt <= now) {
    leadRateWindows.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 30) return false;
  current.count += 1;
  return true;
}

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "DAR.EST Integration API",
    version: "1.0.0",
    description: "Read published real-estate inventory and send website leads into the DAR.EST CRM.",
  },
  servers: [{ url: "/api/integrations/v1" }],
  paths: {
    "/health": { get: { summary: "Integration health check", responses: { "200": { description: "OK" } } } },
    "/properties": {
      get: {
        summary: "List published and available properties",
        parameters: [{ name: "company", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Published properties" }, "400": { description: "Missing company slug" } },
      },
    },
    "/properties/{id}": {
      get: {
        summary: "Get one published property",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "company", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Published property" }, "404": { description: "Not found" } },
      },
    },
    "/leads": {
      post: {
        summary: "Create or update a CRM lead",
        security: [{ integrationApiKey: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/Lead" } } } },
        responses: { "201": { description: "Lead accepted" }, "401": { description: "Invalid API key" }, "429": { description: "Rate limit" } },
      },
    },
    "/inquiries": {
      post: {
        summary: "Alias for POST /leads",
        security: [{ integrationApiKey: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/Lead" } } } },
        responses: { "201": { description: "Inquiry accepted" } },
      },
    },
  },
  components: {
    securitySchemes: { integrationApiKey: { type: "http", scheme: "bearer", bearerFormat: "DAR_EST_INTEGRATION_API_KEY" } },
    schemas: {
      Lead: {
        type: "object",
        required: ["companySlug", "name", "phone", "message"],
        properties: {
          companySlug: { type: "string", example: "porto-golf" },
          propertyId: { type: "integer", example: 12 },
          name: { type: "string", example: "Ahmed Ali" },
          phone: { type: "string", example: "+201001234567" },
          email: { type: "string", format: "email" },
          message: { type: "string", example: "I want to book a viewing." },
          source: { type: "string", example: "partner-website" },
          externalId: { type: "string", example: "form-2026-00042" },
          preferredPropertyType: { type: "string" },
          preferredLocation: { type: "string" },
          budgetMinIls: { type: "integer" },
          budgetMaxIls: { type: "integer" },
        },
      },
    },
  },
};

export function registerIntegrationApi(app: Express) {
  app.use(API_PREFIX, (req, res, next) => {
    applyCors(req, res);
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  app.get(`${API_PREFIX}/openapi.json`, (_req, res) => res.json(openApiDocument));
  app.get(`${API_PREFIX}/health`, (_req, res) => res.json({ ok: true, version: "1", writeAuthConfigured: Boolean(process.env.DAR_EST_INTEGRATION_API_KEY) }));

  app.get(`${API_PREFIX}/properties`, async (req, res) => {
    const companySlug = String(req.query.company || "").trim();
    if (!companySlug) return sendError(res, req, 400, "COMPANY_SLUG_REQUIRED", "Add ?company=YOUR_COMPANY_SLUG to the request.");
    try {
      const rows = await listPublishedSalesPropertiesForCompanySlug(companySlug);
      return res.json({ ok: true, data: rows.map(publicProperty).filter(Boolean), meta: { count: rows.length, companySlug } });
    } catch (error) {
      console.error("[integration-api] property list failed", { requestId: requestId(req), error });
      return sendError(res, req, 500, "PROPERTY_LIST_FAILED", "Could not load published properties.");
    }
  });

  app.get(`${API_PREFIX}/properties/:id`, async (req, res) => {
    const companySlug = String(req.query.company || "").trim();
    const propertyId = Number(req.params.id);
    if (!companySlug) return sendError(res, req, 400, "COMPANY_SLUG_REQUIRED", "Add ?company=YOUR_COMPANY_SLUG to the request.");
    if (!Number.isInteger(propertyId) || propertyId <= 0) return sendError(res, req, 400, "INVALID_PROPERTY_ID", "Property id must be a positive integer.");
    try {
      const property = await getPublishedSalesPropertyForCompanySlug(companySlug, propertyId);
      if (!property) return sendError(res, req, 404, "PROPERTY_NOT_FOUND", "This property is not published or is unavailable.");
      return res.json({ ok: true, data: publicProperty(property) });
    } catch (error) {
      console.error("[integration-api] property detail failed", { requestId: requestId(req), error });
      return sendError(res, req, 500, "PROPERTY_READ_FAILED", "Could not load this property.");
    }
  });

  const createLead = async (req: Request, res: Response) => {
    if (!hasValidWriteKey(req)) return sendError(res, req, 401, "INTEGRATION_API_KEY_INVALID", "Use Authorization: Bearer <DAR_EST_INTEGRATION_API_KEY>.");
    if (!withinLeadRateLimit(req)) {
      res.setHeader("Retry-After", "60");
      return sendError(res, req, 429, "LEAD_RATE_LIMITED", "Too many lead submissions. Try again in one minute.");
    }
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, req, 400, "INVALID_LEAD", parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; "));
    try {
      const result = await createIntegrationLeadForCompany({
        ...parsed.data,
        email: parsed.data.email || null,
        source: parsed.data.source || "external-website",
      });
      return res.status(201).json({ ok: true, data: result });
    } catch (error) {
      const code = error instanceof Error ? error.message : "LEAD_CREATE_FAILED";
      if (["COMPANY_NOT_FOUND", "PROPERTY_NOT_FOUND"].includes(code)) return sendError(res, req, 404, code, "The company or property could not be found.");
      console.error("[integration-api] lead create failed", { requestId: requestId(req), error });
      return sendError(res, req, 500, "LEAD_CREATE_FAILED", "Could not save the lead.");
    }
  };

  app.post(`${API_PREFIX}/leads`, createLead);
  app.post(`${API_PREFIX}/inquiries`, createLead);
}

export const integrationApiContract = {
  prefix: API_PREFIX,
  publicEndpoints: ["GET /health", "GET /openapi.json", "GET /properties?company=slug", "GET /properties/:id?company=slug"],
  writeEndpoints: ["POST /leads", "POST /inquiries"],
  requiredWriteSecret: "DAR_EST_INTEGRATION_API_KEY",
} as const;

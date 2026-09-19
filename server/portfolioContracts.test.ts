import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("portfolio hierarchy contracts", () => {
  const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
  const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
  const routers = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
  const workspace = readFileSync(resolve(process.cwd(), "client/src/pages/Workspace.tsx"), "utf8");

  it("defines company-scoped portfolio, building and unit tables", () => {
    expect(schema).toContain('mysqlTable(\n  "portfolios"');
    expect(schema).toContain('mysqlTable(\n  "buildings"');
    expect(schema).toContain('mysqlTable(\n  "units"');
    expect(schema).toContain("companyId: int(\"companyId\").notNull()");
  });

  it("keeps hierarchy writes behind active subscription quota checks", () => {
    expect(db).toContain("listPortfolioHierarchyForCompany");
    expect(db).toContain("createPortfolioForCompany");
    expect(db).toContain("createBuildingForCompany");
    expect(db).toContain("createUnitForCompany");
    expect(db.match(/assertCompanySubscriptionAndQuota\(input\.companyId, input\.userId, \"properties\"\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("exposes guarded portfolio procedures and a visible workspace command card", () => {
    expect(routers).toContain("portfolio: router");
    expect(routers).toContain("requireCompanyPermission(membership.member.role, \"portfolio.write\")");
    expect(workspace).toContain("trpc.portfolio.hierarchy.useQuery");
    expect(workspace).toContain("Portfolio hierarchy");
    expect(workspace).toContain("هيكل المحفظة");
  });

  it("defines additive company-scoped floors, rooms and amenities under each building", () => {
    expect(schema).toContain('mysqlTable(\n  "building_floors"');
    expect(schema).toContain('mysqlTable(\n  "building_rooms"');
    expect(schema).toContain('mysqlTable(\n  "building_amenities"');
    expect(schema).toContain('uniqueIndex("building_floors_building_label_unique").on(table.buildingId, table.label)');
    expect(schema).toContain('uniqueIndex("building_rooms_building_label_unique").on(table.buildingId, table.label)');
    expect(schema).toContain('uniqueIndex("building_amenities_building_name_unique").on(table.buildingId, table.name)');
    expect(schema).toContain('roomType: mysqlEnum("roomType", ["common", "storage", "parking", "amenity", "office", "retail", "other"])');
    expect(schema).toContain('status: mysqlEnum("status", ["active", "maintenance", "inactive"])');
  });

  it("keeps unified-property reads and writes isolated to the current company and building", () => {
    expect(db).toContain("listUnifiedPropertyForBuilding");
    expect(db).toContain("createBuildingFloor");
    expect(db).toContain("createBuildingRoom");
    expect(db).toContain("createBuildingAmenity");
    expect(db).toContain("assertCompanySubscriptionAccess");
    expect(db).toContain("BUILDING_ACCESS_REQUIRED");
    expect(db).toContain("FLOOR_ACCESS_REQUIRED");
    expect(db).toContain('action: "building_floor.created"');
    expect(db).toContain('action: "building_room.created"');
    expect(db).toContain('action: "building_amenity.created"');
    expect(routers).toContain("unifiedProperty: protectedProcedure");
    expect(routers).toContain("createFloor: protectedProcedure");
    expect(routers).toContain("createRoom: protectedProcedure");
    expect(routers).toContain("createAmenity: protectedProcedure");
    expect(routers.match(/requireCompanyPermission\(membership\.member\.role, "portfolio\.write"\)/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps the Workspace experience contextual to an existing building", () => {
    expect(workspace).toContain("UnifiedPropertyPanel");
    expect(workspace).toContain("trpc.portfolio.unifiedProperty.useQuery");
    expect(workspace).toContain("trpc.portfolio.createFloor.useMutation");
    expect(workspace).toContain("trpc.portfolio.createRoom.useMutation");
    expect(workspace).toContain("trpc.portfolio.createAmenity.useMutation");
    expect(workspace).toContain("Choose an existing building");
    expect(workspace).toContain("בחרו בניין קיים");
  });

  it("connects unit occupancy, tenant placement, lease activation and recurring collection", () => {
    expect(schema).toContain('"leases"');
    expect(db).toContain("createLeaseForCompany");
    expect(db).toContain("recurringCharges");
    expect(db).toContain('status: "occupied"');
    expect(routers).toContain("activateLease");
    expect(workspace).toContain("PortfolioOperatingCenter");
    expect(workspace).toContain("activateLease.mutateAsync");
    expect(workspace).toContain("createTenant.mutateAsync");
  });

  it("keeps renewal, handover, deposit return and move-out as company-scoped lifecycle actions", () => {
    expect(schema).toContain('renewalDecision: mysqlEnum("renewalDecision"');
    expect(schema).toContain('moveInStatus: mysqlEnum("moveInStatus"');
    expect(schema).toContain('moveOutStatus: mysqlEnum("moveOutStatus"');
    expect(schema).toContain('depositReturnedIls: int("depositReturnedIls")');
    expect(db).toContain("updateLeaseLifecycleForCompany");
    expect(db).toContain('status: "vacant"');
    expect(db).toContain('status: "paused"');
    expect(routers).toContain("updateLeaseLifecycle");
    expect(workspace).toContain("updateLeaseLifecycle.mutateAsync");
    expect(workspace).toContain("Complete move-out");
    expect(workspace).toContain("إتمام الخروج");
  });

  it("keeps each collection period attached to a company lease, unit and tenant", () => {
    expect(schema).toContain('mysqlTable(\n  "lease_collections"');
    expect(schema).toContain('uniqueIndex("lease_collections_lease_period_unique").on(table.leaseId, table.periodLabel)');
    expect(db).toContain("getLeaseCollectionsForCompany");
    expect(db).toContain("createLeaseCollectionPeriod");
    expect(db).toContain("recordLeasePayment");
    expect(schema).toContain('mysqlTable(\n  "collection_payment_events"');
    expect(schema).toContain('idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull().unique()');
    expect(db).toContain("PAYMENT_IDEMPOTENCY_KEY_REQUIRED");
    expect(db).toContain("collectionPaymentEvents");
    expect(db).toContain("await db.transaction(async tx =>");
    expect(db).toContain("latestPaymentEvent");
    expect(db).toContain("markOverdueCollections");
    expect(db).toContain("eq(leaseCollections.companyId, input.companyId)");
    expect(db).toContain('inArray(leaseCollections.status, ["scheduled", "due", "partial"])');
    expect(db).toContain("Number.isSafeInteger(input.amountIls)");
    expect(routers).toContain("collections: protectedProcedure");
    expect(routers).toContain("recordPayment: protectedProcedure");
    expect(routers).toContain("idempotencyKey: z.string().uuid().optional()");
    expect(routers).toContain("createCollectionPeriod: protectedProcedure");
    expect(workspace).toContain("trpc.portfolio.collections.useQuery");
    expect(workspace).toContain("CollectionLedger");
    expect(workspace).toContain("paymentIdempotencyKeys");
    expect(workspace).toContain("latestPaymentEvent");
    expect(workspace).toContain("lastPayment");
  });
});

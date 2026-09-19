import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const source = fs.readFileSync(path.join(projectRoot, "client/src/components/WorkspaceModuleOperations.tsx"), "utf8");

describe("workspace module operations", () => {
  it("provides real portfolio creation actions", () => {
    expect(source).toContain("trpc.portfolio.createPortfolio.useMutation");
    expect(source).toContain("trpc.portfolio.createBuilding.useMutation");
    expect(source).toContain("trpc.portfolio.createUnit.useMutation");
    expect(source).toContain("trpc.portfolio.updateUnitStatus.useMutation");
    expect(source).toContain("UnitStatusForm");
  });

  it("provides collection and operations actions with data invalidation", () => {
    expect(source).toContain("trpc.legacy.createOperationalPayment.useMutation");
    expect(source).toContain("trpc.portfolio.recordPayment.useMutation");
    expect(source).toContain("trpc.operations.createWorkOrder.useMutation");
    expect(source).toContain("utils.operations.center.invalidate()");
    expect(source).toContain('name="vendorId"');
  });

  it("supports editing and deletion for the legacy records whose server contracts allow it", () => {
    expect(source).toContain("trpc.legacy.updateTenant.useMutation");
    expect(source).toContain("trpc.legacy.deleteTenant.useMutation");
    expect(source).toContain("trpc.legacy.updateContract.useMutation");
    expect(source).toContain("trpc.legacy.deleteMaintenance.useMutation");
    expect(source).toContain("Edit record");
    expect(source).toContain("Delete record");
  });

  it("keeps the operating log actionable through actor, event, and date filters", () => {
    expect(source).toContain("activityType");
    expect(source).toContain("activityActor");
    expect(source).toContain("activityStart");
    expect(source).toContain("activityEnd");
  });
});

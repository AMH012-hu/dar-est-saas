import { describe, expect, it } from "vitest";
import { hasPermission, isAdminRole } from "./permissions";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin permission levels", () => {
  it("recognizes only supported administrator roles", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("manager")).toBe(true);
    expect(isAdminRole("support")).toBe(true);
    expect(isAdminRole("analyst")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
  });

  it("keeps write operations away from support and analyst roles", () => {
    expect(hasPermission("admin", "keys.write")).toBe(true);
    expect(hasPermission("manager", "subscriptions.write")).toBe(true);
    expect(hasPermission("support", "keys.write")).toBe(false);
    expect(hasPermission("analyst", "subscriptions.write")).toBe(false);
  });

  it("limits audit and export access to intended roles", () => {
    expect(hasPermission("support", "audit.read")).toBe(true);
    expect(hasPermission("support", "exports.read")).toBe(false);
    expect(hasPermission("analyst", "exports.read")).toBe(true);
    expect(hasPermission("user", "audit.read")).toBe(false);
  });
});

describe("admin control UI contracts", () => {
  const ownerSource = readFileSync(resolve(process.cwd(), "client/src/pages/Owner.tsx"), "utf8");
  const checkoutSource = readFileSync(resolve(process.cwd(), "client/src/pages/Checkout.tsx"), "utf8");

  it("exposes permission-gated audit and export controls", () => {
    expect(ownerSource).toContain("owner.auditLogs");
    expect(ownerSource).toContain("owner.exportActivationKeyHints");
    expect(ownerSource).toContain("can(\"audit.read\")");
    expect(ownerSource).toContain("can(\"exports.read\")");
    expect(ownerSource).toContain("downloadCsv");
  });

  it("contains explicit activation success and failure UX", () => {
    expect(checkoutSource).toContain("activationSuccess");
    expect(checkoutSource).toContain("isPending");
    expect(checkoutSource).toContain("aria-live");
  });
});

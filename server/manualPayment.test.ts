import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canApproveManualPayment } from "./db";

describe("manual payment approval guard", () => {
  it("rejects missing or blank proof URLs", () => {
    expect(canApproveManualPayment(undefined)).toBe(false);
    expect(canApproveManualPayment(null)).toBe(false);
    expect(canApproveManualPayment("   ")).toBe(false);
  });

  it("accepts a non-empty stored proof URL", () => {
    expect(canApproveManualPayment("https://storage.example/proof.png")).toBe(true);
  });
});

describe("payment ledger contract", () => {
  it("keeps verified payment events immutable and idempotent by unique provider identifiers", () => {
    const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");
    const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    expect(schema).toContain('"payment_ledger"');
    expect(schema).toContain('providerEventId: varchar("providerEventId", { length: 255 }).notNull().unique()');
    expect(schema).toContain('providerPaymentId: varchar("providerPaymentId", { length: 255 }).unique()');
    expect(db).toContain("tx.insert(paymentLedger).values");
    expect(db).toContain("providerEventId: input.eventId");
    expect(db).toContain("amountIls: plan.priceIls");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const dbSource = readFileSync(resolve(projectRoot, "server/db.ts"), "utf8");
const routerSource = readFileSync(resolve(projectRoot, "server/routers.ts"), "utf8");
const schemaSource = readFileSync(resolve(projectRoot, "drizzle/schema.ts"), "utf8");
const workspaceSource = readFileSync(resolve(projectRoot, "client/src/components/WorkspaceModuleOperations.tsx"), "utf8");

describe("collection payment reversal contract", () => {
  it("preserves the original payment and appends one linked compensating event", () => {
    expect(schemaSource).toContain("reversedPaymentEventId");
    expect(schemaSource).toContain("collection_payment_events_reversal_unique");
    expect(dbSource).toContain("export async function reverseLeasePayment");
    expect(dbSource).toContain('eventType: "reversal"');
    expect(dbSource).toContain("amountIls: -paymentEvent.amountIls");
    expect(dbSource).toContain("reversedPaymentEventId: paymentEvent.id");
  });

  it("enforces company scope, idempotency, a reason, and an auditable actor", () => {
    expect(dbSource).toContain("assertCompanyOperationalAccess(input.companyId, input.userId, true)");
    expect(dbSource).toContain("PAYMENT_REVERSAL_REASON_REQUIRED");
    expect(dbSource).toContain("PAYMENT_ALREADY_REVERSED");
    expect(dbSource).toContain("IDEMPOTENCY_KEY_CONFLICT");
    expect(dbSource).toContain('action: "collection.payment_reversed"');
    expect(routerSource).toContain("reversePayment: protectedProcedure");
    expect(routerSource).toContain('requireCompanyPermission(membership.member.role, "collections.write")');
  });

  it("only exposes reversal for a reversible receipt and requires a reason in the workspace", () => {
    expect(workspaceSource).toContain('row.eventType === "payment" && row.isReversed !== true');
    expect(workspaceSource).toContain("reverseReceipt.mutate");
    expect(workspaceSource).toContain("PaymentReversalForm");
    expect(workspaceSource).toContain('name="reason"');
  });
});

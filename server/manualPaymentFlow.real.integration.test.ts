import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { manualPaymentRequests, invoices, licenseKeys, paymentLedger, fulfillmentEvents, subscriptions, users } from "../drizzle/schema";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suite = testDatabaseUrl ? describe : describe.skip;

type DbModule = typeof import("./db");

suite("real manual payment flow against an isolated test database", () => {
  let dbModule: DbModule;
  let db: any;
  let userId = 0;
  let requestId = 0;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    dbModule = await import("./db");
    db = await dbModule.getDb();
    if (!db) throw new Error("TEST_DATABASE_URL did not produce a database connection.");

    const openId = `qa-real-flow-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const inserted = await db.insert(users).values({
      openId,
      name: "DAR.EST Real Flow QA",
      email: `${openId}@qa.test`,
      role: "user",
      loginMethod: "test",
      lastSignedIn: new Date(),
    });
    userId = Number(inserted[0].insertId);
  });

  it("keeps the request pending until proof, then issues one subscription and one key after approval", async () => {
    const created = await dbModule.createManualPaymentRequest({
      userId,
      planCode: "monthly",
      provider: "bit",
      reference: `REAL-BIT-${Date.now()}`,
    });
    requestId = created.request.id;
    expect(created.request.status).toBe("pending");
    expect(await dbModule.getCustomerSubscription(userId)).toBeNull();

    const beforeProof = await dbModule.listInvoicesForUser(userId);
    expect(beforeProof[0]?.proofUrl ?? null).toBeNull();

    await dbModule.attachPaymentProof({ userId, requestId, proofUrl: "https://isolated.test/proof.png" });
    const afterProof = await dbModule.listManualPaymentRequestsForUser(userId);
    expect(afterProof[0]?.request.status).toBe("pending_manual_verification");
    expect(afterProof[0]?.invoice?.proofUrl).toBe("https://isolated.test/proof.png");
    expect(await dbModule.getCustomerSubscription(userId)).toBeNull();

    const approved = await dbModule.approveManualPaymentRequest(requestId, "Real integration QA approval");
    expect(approved.licenseKey?.keyValue).toMatch(/^[A-Z0-9]{56}$/);

    const customerSubscription = await dbModule.getCustomerSubscription(userId);
    expect(customerSubscription?.subscription.status).toBe("active");
    expect(customerSubscription?.licenseKey?.keyValue).toBe(approved.licenseKey?.keyValue);
    expect((await dbModule.listInvoicesForUser(userId))[0]?.status).toBe("paid");

    const repeated = await dbModule.fulfillSubscription({
      eventId: `manual:${requestId}`,
      source: "bit",
      eventType: "manual_payment_approved",
      userId,
      planCode: "monthly",
      isTest: false,
      providerOrderId: created.request.reference,
      providerPaymentId: created.request.reference,
      paymentProvider: "bit",
      invoiceId: created.invoice.id,
    });
    expect(repeated.licenseKey?.keyValue).toBe(approved.licenseKey?.keyValue);
  });

  afterAll(async () => {
    if (!db || !userId) return;
    await db.delete(paymentLedger).where(eq(paymentLedger.userId, userId));
    await db.delete(fulfillmentEvents).where(eq(fulfillmentEvents.userId, userId));
    await db.delete(licenseKeys).where(eq(licenseKeys.userId, userId));
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await db.delete(invoices).where(eq(invoices.userId, userId));
    await db.delete(manualPaymentRequests).where(eq(manualPaymentRequests.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });
});

if (!testDatabaseUrl) {
  // This suite is intentionally skipped in ordinary CI because it must never use the production DATABASE_URL.
  console.info("[QA] manualPaymentFlow.real.integration.test.ts skipped: set TEST_DATABASE_URL to an isolated database to run it.");
}

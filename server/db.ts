import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { and, count, desc, eq, gte, like, lte, or, inArray, sql } from "drizzle-orm";
import {
  fulfillmentEvents,
  paymentLedger,
  invoices,
  manualPaymentRequests,
  activationKeys,
  auditLogs,
  auditFilterPreferences,
  InsertUser,
  licenseKeys,
  subscriptions,
  users,
  companies,
  companyMembers,
  companyInvitations,
  companyActivityLogs,
  companyResourceRevisions,
  companyNotificationReads,
  properties,
  clients,
  tasks,
  tenants,
  contracts,
  maintenance,
  operationalPayments,
  attendance,
  portfolios,
  buildings,
  units,
  buildingFloors,
  buildingRooms,
  buildingAmenities,
  leases,
  recurringCharges,
  leaseCollections,
  collectionPaymentEvents,
  expenses,
  vendors,
  workOrders,
  documents,
  salesImportBatches,
  salesProperties,
  propertyInquiries,
  salesClients,
  crmClientProperties,
  crmActivities,
  crmStageHistory,
  salesContracts,
  salesInstallments,
  salesAssignments,
  salesCallInventory,
  salesDailyTasks,
  salesMessages,
  salesTeamInvitations,
  salesTeamMembers,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { storagePut } from "./storage";
import * as XLSX from "xlsx";
import { generateLicenseKey } from "./licensing";
import { addPlanMonths, getPlan, SUBSCRIPTION_PLANS, PlanCode, type PlanCode as SubscriptionPlanCode } from "../shared/subscriptionPlans";
import { cancelActiveSubscription, extendActiveSubscription } from "./subscriptionActions";
import { hasActiveSubscription } from "./subscriptionAccess";
import type { CompanyRole } from "./companyPermissions";

let _db: ReturnType<typeof drizzle> | null = null;

export function hashLocalPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyLocalPassword(password: string, encoded: string | null | undefined) {
  if (!encoded) return false;
  const [salt, expected] = encoded.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createLocalUser(input: { name: string; email: string; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const openId = `local_${randomBytes(24).toString("hex")}`;
  const passwordHash = hashLocalPassword(input.password);
  await db.insert(users).values({ openId, name: input.name, email: input.email, loginMethod: "local", passwordHash });
  return (await getUserByOpenId(openId))!;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

function companySlug(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
  return `${normalized || "company"}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getCompanyMembership(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [membership] = await db.select({ company: companies, member: companyMembers }).from(companyMembers).innerJoin(companies, eq(companyMembers.companyId, companies.id)).where(eq(companyMembers.userId, userId)).orderBy(desc(companyMembers.createdAt)).limit(1);
  return membership ?? null;
}

async function getCompanyMembershipForCompany(companyId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [membership] = await db
    .select({ company: companies, member: companyMembers })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, userId)))
    .limit(1);
  return membership ?? null;
}

export async function getCompanyForUser(userId: number) {
  return getCompanyMembership(userId);
}

export async function listCompanyMembers(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ member: companyMembers, user: users }).from(companyMembers).innerJoin(users, eq(companyMembers.userId, users.id)).where(eq(companyMembers.companyId, companyId)).orderBy(desc(companyMembers.createdAt));
}

export async function createCompanyForUser(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const subscription = await getUserSubscription(userId);
  if (!hasActiveSubscription(subscription)) throw new Error("ACTIVE_SUBSCRIPTION_REQUIRED");
  const existing = await getCompanyMembership(userId);
  if (existing) return existing;
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 160) throw new Error("INVALID_COMPANY_NAME");
  await db.insert(companies).values({ name: cleanName, slug: companySlug(cleanName), ownerUserId: userId });
  const [company] = await db.select().from(companies).where(eq(companies.ownerUserId, userId)).limit(1);
  if (!company) throw new Error("COMPANY_CREATE_FAILED");
  await db.insert(companyMembers).values({ companyId: company.id, userId, role: "owner" });
  return { company, member: { companyId: company.id, userId, role: "owner" as const } };
}

export async function addCompanyMember(companyId: number, email: string, role: CompanyRole = "member") {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  if (!user) throw new Error("USER_NOT_FOUND");
  await db.insert(companyMembers).values({ companyId, userId: user.id, role });
  return user;
}

export async function updateCompanyMemberRole(memberId: number, role: CompanyRole) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.update(companyMembers).set({ role }).where(and(eq(companyMembers.id, memberId), inArray(companyMembers.role, ["admin", "manager", "member", "viewer"])));
  return true;
}

export async function removeCompanyMember(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.delete(companyMembers).where(and(eq(companyMembers.id, memberId), inArray(companyMembers.role, ["admin", "manager", "member", "viewer"])));
  return true;
}

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.updatedAt), desc(subscriptions.id))
    .limit(1);
  return subscription ?? null;
}

/**
 * A workspace is entitled by its owner subscription. Team members inherit that
 * entitlement through their active company membership and must not be forced
 * to purchase a separate personal subscription to operate the company.
 */
export async function getCompanySubscription(companyId: number) {
  const db = await getDb();
  if (!db) return null;
  const [company] = await db.select({ ownerUserId: companies.ownerUserId }).from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) return null;
  return getUserSubscription(company.ownerUserId);
}

export async function getCustomerSubscription(userId: number, pagination: { page?: number; pageSize?: number } = {}) {
  const db = await getDb();
  if (!db) return null;

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.updatedAt), desc(subscriptions.id))
    .limit(1);
  const [licenseKey] = await db
    .select()
    .from(licenseKeys)
    .where(eq(licenseKeys.userId, userId))
    .limit(1);

  const page = Math.max(1, Math.floor(pagination.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(pagination.pageSize ?? 10)));
  const usedKeyWhere = eq(activationKeys.redeemedByUserId, userId);
  const [{ total: usedKeyTotal }] = await db.select({ total: count() }).from(activationKeys).where(usedKeyWhere);
  const usedActivationKeys = await db
    .select({ id: activationKeys.id, keyHint: activationKeys.keyHint, planCode: activationKeys.planCode, status: activationKeys.status, redeemedAt: activationKeys.redeemedAt, createdAt: activationKeys.createdAt })
    .from(activationKeys)
    .where(usedKeyWhere)
    .orderBy(desc(activationKeys.redeemedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { subscription: subscription ?? null, licenseKey: licenseKey ?? null, usedActivationKeys, usedActivationKeysPagination: { page, pageSize, total: Number(usedKeyTotal ?? 0), totalPages: Math.max(1, Math.ceil(Number(usedKeyTotal ?? 0) / pageSize)) } };
}

async function createLicenseKeyForUser<
  T extends {
    select: () => any;
    insert: (table: typeof licenseKeys) => any;
  },
>(
  tx: T,
  userId: number,
  isTest = false
) {
  const [existing] = await tx
    .select()
    .from(licenseKeys)
    .where(eq(licenseKeys.userId, userId))
    .limit(1);
  if (existing) return existing;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const keyValue = generateLicenseKey();
    try {
      await tx.insert(licenseKeys).values({ userId, keyValue, isTest });
      const [created] = await tx
        .select()
        .from(licenseKeys)
        .where(eq(licenseKeys.userId, userId))
        .limit(1);
      if (created) return created;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Duplicate")) {
        throw error;
      }
    }
  }
  throw new Error("Could not allocate a unique license key after multiple attempts.");
}

function hashActivationKey(value: string) {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

export async function createActivationKeysForOwner(input: { ownerUserId: number; planCode: PlanCode; quantity: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 100) {
    throw new Error("Quantity must be between 1 and 100.");
  }
  getPlan(input.planCode);
  const created: Array<{ id: number; key: string; keyHint: string; planCode: PlanCode }> = [];
  for (let i = 0; i < input.quantity; i += 1) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const key = generateLicenseKey();
      const keyHash = hashActivationKey(key);
      const keyHint = `${key.slice(0, 4)}…${key.slice(-4)}`;
      try {
        const result = await db.insert(activationKeys).values({ keyHash, keyHint, planCode: input.planCode, createdByUserId: input.ownerUserId });
        created.push({ id: Number(result[0].insertId), key, keyHint, planCode: input.planCode });
        break;
      } catch (error) {
        if (!(error instanceof Error) || !error.message.toLowerCase().includes("duplicate")) throw error;
      }
    }
    if (created.length !== i + 1) throw new Error("Could not generate a unique activation key.");
  }
  return created;
}

export async function listActivationKeysForOwner() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ activation: activationKeys, user: users }).from(activationKeys).leftJoin(users, eq(activationKeys.redeemedByUserId, users.id)).orderBy(desc(activationKeys.createdAt));
}

export async function recordAuditLog(input: {
  actorUserId: number;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  targetUserId?: number | null;
  success?: boolean;
  errorCode?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const db = await getDb();
  if (!db) return null;
  const [created] = await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId == null ? null : String(input.resourceId),
    targetUserId: input.targetUserId ?? null,
    success: input.success ?? true,
    errorCode: input.errorCode ?? null,
    requestId: input.requestId ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
  return { id: Number(created.insertId) };
}

export type AuditLogFilters = {
  from?: Date;
  to?: Date;
  action?: string;
  actor?: string;
  search?: string;
};

export async function listAuditLogsForOwner(filters: AuditLogFilters = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.from) conditions.push(gte(auditLogs.createdAt, filters.from));
  if (filters.to) conditions.push(lte(auditLogs.createdAt, filters.to));
  if (filters.action) conditions.push(like(auditLogs.action, `%${filters.action}%`));
  if (filters.actor) conditions.push(or(like(users.name, `%${filters.actor}%`), like(users.email, `%${filters.actor}%`)));
  if (filters.search) conditions.push(or(like(auditLogs.action, `%${filters.search}%`), like(auditLogs.resourceType, `%${filters.search}%`), like(auditLogs.resourceId, `%${filters.search}%`), like(users.name, `%${filters.search}%`), like(users.email, `%${filters.search}%`)));
  return db.select({ audit: auditLogs, actor: users }).from(auditLogs).leftJoin(users, eq(auditLogs.actorUserId, users.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(auditLogs.createdAt)).limit(250);
}

export type AuditFilterPreferences = {
  fromDate: string;
  toDate: string;
  action: string;
  actor: string;
  search: string;
  range: string;
};

export async function getAuditFilterPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [preference] = await db.select().from(auditFilterPreferences).where(eq(auditFilterPreferences.userId, userId)).limit(1);
  if (!preference) return null;
  return {
    fromDate: preference.fromDate ?? "",
    toDate: preference.toDate ?? "",
    action: preference.action ?? "",
    actor: preference.actor ?? "",
    search: preference.search ?? "",
    range: preference.range,
  } satisfies AuditFilterPreferences;
}

export async function saveAuditFilterPreferences(userId: number, preferences: AuditFilterPreferences) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  await db.insert(auditFilterPreferences).values({
    userId,
    fromDate: preferences.fromDate || null,
    toDate: preferences.toDate || null,
    action: preferences.action || null,
    actor: preferences.actor || null,
    search: preferences.search || null,
    range: preferences.range || "custom",
  }).onDuplicateKeyUpdate({
    set: {
      fromDate: preferences.fromDate || null,
      toDate: preferences.toDate || null,
      action: preferences.action || null,
      actor: preferences.actor || null,
      search: preferences.search || null,
      range: preferences.range || "custom",
    },
  });
  return { success: true } as const;
}

export async function listActivationKeysForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: activationKeys.id, keyHint: activationKeys.keyHint, planCode: activationKeys.planCode, status: activationKeys.status, redeemedAt: activationKeys.redeemedAt, createdAt: activationKeys.createdAt })
    .from(activationKeys)
    .where(eq(activationKeys.redeemedByUserId, userId))
    .orderBy(desc(activationKeys.redeemedAt));
}

export async function getOwnerStats() {
  const db = await getDb();
  if (!db) return { users: 0, activeSubscriptions: 0, availableKeys: 0, redeemedKeys: 0 };
  const [allUsers, active, available, redeemed] = await Promise.all([
    db.select({ id: users.id }).from(users),
    db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.status, "active")),
    db.select({ id: activationKeys.id }).from(activationKeys).where(eq(activationKeys.status, "available")),
    db.select({ id: activationKeys.id }).from(activationKeys).where(eq(activationKeys.status, "redeemed")),
  ]);
  return { users: allUsers.length, activeSubscriptions: active.length, availableKeys: available.length, redeemedKeys: redeemed.length };
}

export const OWNER_ADMIN_ROLES = ["admin", "manager", "support", "analyst"] as const;
export type OwnerAdminRole = (typeof OWNER_ADMIN_ROLES)[number];

export async function listOwnerAdminUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(inArray(users.role, [...OWNER_ADMIN_ROLES]))
    .orderBy(desc(users.lastSignedIn));
}

export async function setOwnerAdminRole(input: {
  actorUserId: number;
  email: string;
  role: OwnerAdminRole | "user";
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const email = input.email.trim().toLowerCase();
  const [target] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!target) throw new Error("USER_NOT_FOUND");
  if (target.id === input.actorUserId && input.role === "user") {
    throw new Error("SELF_ROLE_REVOKE_NOT_ALLOWED");
  }

  const currentlyPrivileged = OWNER_ADMIN_ROLES.includes(target.role as OwnerAdminRole);
  if (currentlyPrivileged && input.role === "user") {
    const administrators = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, [...OWNER_ADMIN_ROLES]));
    if (administrators.length <= 1) throw new Error("LAST_ADMIN_ROLE_REVOKE_NOT_ALLOWED");
  }

  await db.update(users).set({ role: input.role }).where(eq(users.id, target.id));
  const [updated] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(eq(users.id, target.id))
    .limit(1);
  if (!updated) throw new Error("ROLE_UPDATE_FAILED");
  return updated;
}

export async function redeemActivationKey(input: { userId: number; planCode: PlanCode; key: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const normalized = input.key.trim().toUpperCase();
  if (!/^[A-Z0-9]{56}$/.test(normalized)) throw new Error("Invalid activation key.");
  getPlan(input.planCode);
  return db.transaction(async tx => {
    const [activation] = await tx.select().from(activationKeys).where(and(eq(activationKeys.keyHash, hashActivationKey(normalized)), eq(activationKeys.status, "available"))).limit(1);
    if (!activation) throw new Error("This key is invalid, already used, or revoked.");
    if (activation.planCode !== input.planCode) throw new Error("This key belongs to a different plan.");
    const result = await fulfillSubscription({ eventId: `activation:${activation.id}:${input.userId}`, source: "owner_manual", eventType: "activation_key_redeemed", userId: input.userId, planCode: input.planCode, isTest: false, paymentProvider: "owner_manual" });
    await tx.update(activationKeys).set({ status: "redeemed", redeemedByUserId: input.userId, redeemedAt: new Date() }).where(and(eq(activationKeys.id, activation.id), eq(activationKeys.status, "available")));
    return { ...result, activation: { id: activation.id, keyHint: activation.keyHint, planCode: activation.planCode } };
  });
}

export type FulfillSubscriptionInput = {
  eventId: string;
  source: "stripe" | "paypal" | "bit" | "owner_test" | "owner_manual";
  eventType: string;
  userId: number;
  planCode: PlanCode;
  isTest: boolean;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  paymentProvider?: "paypal" | "bit" | "owner_test" | "owner_manual" | null;
  invoiceId?: number | null;
};

/**
 * Fulfills a verified payment atomically. Event IDs make Stripe webhook retries idempotent.
 * No card data or raw webhook data is stored.
 */
export async function fulfillSubscription(input: FulfillSubscriptionInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");

  return db.transaction(async tx => {
    const [existingEvent] = await tx
      .select()
      .from(fulfillmentEvents)
      .where(eq(fulfillmentEvents.providerEventId, input.eventId))
      .limit(1);

    if (existingEvent) {
      const [currentSubscription] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, input.userId))
        .limit(1);
      const licenseKey = await createLicenseKeyForUser(tx, input.userId);
      return { subscription: currentSubscription ?? null, licenseKey, duplicate: true };
    }

    const now = new Date();
    const [current] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, input.userId))
      .limit(1);

    const baseDate =
      current?.status === "active" && current.endsAt.getTime() > now.getTime()
        ? current.endsAt
        : now;
    const endsAt = addPlanMonths(baseDate, input.planCode);
    const plan = getPlan(input.planCode);
    let invoiceId = input.invoiceId ?? null;
    if (!invoiceId) {
      const invoiceNumber = `${input.isTest ? "TEST" : "DAR"}-${Date.now()}-${input.userId}`.slice(0, 32);
      const serialCode = `${input.source.toUpperCase()}-${randomBytes(12).toString("hex").toUpperCase()}`.slice(0, 40);
      const invoiceResult = await tx.insert(invoices).values({
        userId: input.userId,
        manualPaymentRequestId: null,
        planCode: plan.code,
        amountIls: plan.priceIls,
        invoiceNumber,
        serialCode,
        status: "paid",
        proofUrl: null,
        isTest: input.isTest,
      });
      invoiceId = Number(invoiceResult[0].insertId);
    }

    if (current) {
      await tx
        .update(subscriptions)
        .set({
          planCode: plan.code,
          status: "active",
          endsAt,
          canceledAt: null,
          stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? current.stripeCheckoutSessionId,
          stripePaymentIntentId: input.stripePaymentIntentId ?? current.stripePaymentIntentId,
          providerOrderId: input.providerOrderId ?? current.providerOrderId,
          providerPaymentId: input.providerPaymentId ?? current.providerPaymentId,
          paymentProvider: input.paymentProvider ?? current.paymentProvider,
          isTest: input.isTest,
        })
        .where(eq(subscriptions.id, current.id));
    } else {
      await tx.insert(subscriptions).values({
        userId: input.userId,
        planCode: plan.code,
        status: "active",
        startsAt: now,
        endsAt,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        providerOrderId: input.providerOrderId ?? null,
        providerPaymentId: input.providerPaymentId ?? null,
        paymentProvider: input.paymentProvider ?? null,
        isTest: input.isTest,
      });
    }

    await tx.insert(fulfillmentEvents).values({
      providerEventId: input.eventId,
      source: input.source,
      eventType: input.eventType,
      userId: input.userId,
      planCode: plan.code,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      providerOrderId: input.providerOrderId ?? null,
      providerPaymentId: input.providerPaymentId ?? null,
    });

    // Immutable audit record: one verified payment event is recorded exactly once.
    await tx.insert(paymentLedger).values({
      providerEventId: input.eventId,
      providerPaymentId: input.providerPaymentId ?? null,
      providerOrderId: input.providerOrderId ?? null,
      source: input.source,
      eventType: input.eventType,
      userId: input.userId,
      planCode: plan.code,
      amountIls: plan.priceIls,
      invoiceId,
    });

    const [updatedSubscription] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, input.userId))
      .limit(1);
    const licenseKey = await createLicenseKeyForUser(tx, input.userId, input.isTest);

    return { subscription: updatedSubscription ?? null, licenseKey, duplicate: false };
  });
}

export async function listSubscriptionsForOwner() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      subscription: subscriptions,
      user: users,
      license: licenseKeys,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .leftJoin(licenseKeys, eq(licenseKeys.userId, users.id))
    .orderBy(desc(subscriptions.updatedAt));
}

export async function cancelSubscriptionForOwner(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("A valid user id is required.");
  }

  const [current] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (!current) throw new Error("Subscription was not found.");
  const next = cancelActiveSubscription(current);
  await db
    .update(subscriptions)
    .set({ status: next.status, canceledAt: next.canceledAt })
    .where(and(eq(subscriptions.id, current.id), eq(subscriptions.userId, userId)));

  const [updated] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, current.id))
    .limit(1);
  return updated ?? null;
}

export async function extendSubscriptionForOwner(userId: number, days: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("A valid user id is required.");
  }
  if (!Number.isInteger(days) || days < 1 || days > 3660) {
    throw new Error("Extension must be between 1 and 3660 whole days.");
  }

  const [current] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (!current) throw new Error("Subscription was not found.");
  const next = extendActiveSubscription(current, days);
  await db
    .update(subscriptions)
    .set({ status: next.status, endsAt: next.endsAt, canceledAt: next.canceledAt })
    .where(and(eq(subscriptions.id, current.id), eq(subscriptions.userId, userId)));

  const [updated] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, current.id))
    .limit(1);
  return updated ?? null;
}

export async function createManualPaymentRequest(input: {
  userId: number;
  planCode: PlanCode;
  provider: "bit" | "paypal";
  reference: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  getPlan(input.planCode);
  const reference = input.reference.trim();
  if (reference.length < 4 || reference.length > 255) {
    throw new Error("Payment reference must contain 4 to 255 characters.");
  }
  const [existing] = await db
    .select()
    .from(manualPaymentRequests)
    .where(and(
      eq(manualPaymentRequests.userId, input.userId),
      eq(manualPaymentRequests.provider, input.provider),
      eq(manualPaymentRequests.reference, reference),
      inArray(manualPaymentRequests.status, ["pending", "pending_manual_verification"]),
    ))
    .limit(1);
  if (existing) {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.manualPaymentRequestId, existing.id)).limit(1);
    return { request: existing, invoice };
  }
  const result = await db.insert(manualPaymentRequests).values({
    userId: input.userId,
    planCode: input.planCode,
    provider: input.provider,
    reference,
    status: "pending",
  });
  const requestId = Number(result[0].insertId);
  const plan = getPlan(input.planCode);
  const token = randomBytes(10).toString("hex").toUpperCase();
  const invoiceNumber = `DAR-${new Date().getUTCFullYear()}-${requestId.toString().padStart(6, "0")}`;
  const serialCode = `INV-${token}`;
  await db.insert(invoices).values({
    userId: input.userId,
    manualPaymentRequestId: requestId,
    planCode: input.planCode,
    amountIls: plan.priceIls,
    invoiceNumber,
    serialCode,
    status: "pending",
  });
  const [created] = await db.select().from(manualPaymentRequests).where(eq(manualPaymentRequests.id, requestId)).limit(1);
  const [invoice] = await db.select().from(invoices).where(eq(invoices.manualPaymentRequestId, requestId)).limit(1);
  return { request: created, invoice };
}

export async function listManualPaymentRequestsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ request: manualPaymentRequests, invoice: invoices })
    .from(manualPaymentRequests)
    .leftJoin(invoices, eq(invoices.manualPaymentRequestId, manualPaymentRequests.id))
    .where(eq(manualPaymentRequests.userId, userId))
    .orderBy(desc(manualPaymentRequests.createdAt));
}

export async function attachPaymentProof(input: {
  userId: number;
  requestId: number;
  proofUrl: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const [request] = await db
    .select()
    .from(manualPaymentRequests)
    .where(and(eq(manualPaymentRequests.id, input.requestId), eq(manualPaymentRequests.userId, input.userId)))
    .limit(1);
  if (!request) throw new Error("Payment request was not found.");
  if (request.status !== "pending" && request.status !== "pending_manual_verification") throw new Error("Only pending requests can receive proof.");
  await db.update(invoices)
    .set({ proofUrl: input.proofUrl })
    .where(and(eq(invoices.manualPaymentRequestId, input.requestId), eq(invoices.userId, input.userId)));
  await db.update(manualPaymentRequests)
    .set({ status: "pending_manual_verification" })
    .where(and(eq(manualPaymentRequests.id, input.requestId), eq(manualPaymentRequests.userId, input.userId)));
  return { success: true } as const;
}

export async function listInvoicesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(desc(invoices.createdAt));
}

export async function listManualPaymentRequestsForOwner() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ request: manualPaymentRequests, user: users, invoice: invoices })
    .from(manualPaymentRequests)
    .innerJoin(users, eq(manualPaymentRequests.userId, users.id))
    .leftJoin(invoices, eq(invoices.manualPaymentRequestId, manualPaymentRequests.id))
    .orderBy(desc(manualPaymentRequests.createdAt));
}

export function canApproveManualPayment(proofUrl: string | null | undefined) {
  return Boolean(proofUrl?.trim());
}

export async function approveManualPaymentRequest(requestId: number, ownerNote?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  const [request] = await db.select().from(manualPaymentRequests).where(eq(manualPaymentRequests.id, requestId)).limit(1);
  if (!request) throw new Error("Manual payment request was not found.");
  if (request.status === "rejected") throw new Error("Rejected requests cannot be approved.");
  const [user] = await db.select().from(users).where(eq(users.id, request.userId)).limit(1);
  if (!user) throw new Error("User was not found.");
  const [invoice] = await db.select().from(invoices).where(eq(invoices.manualPaymentRequestId, request.id)).limit(1);
  if (!canApproveManualPayment(invoice?.proofUrl)) throw new Error("A payment proof must be uploaded before approval.");
  const result = await fulfillSubscription({
    eventId: `manual:${request.id}`,
    source: request.provider,
    eventType: "manual_payment_approved",
    userId: request.userId,
    planCode: request.planCode as PlanCode,
    isTest: false,
    providerOrderId: request.reference,
    providerPaymentId: request.reference,
    paymentProvider: request.provider,
    invoiceId: invoice.id,
  });
  await db.update(manualPaymentRequests).set({ status: "approved", ownerNote: ownerNote ?? null }).where(eq(manualPaymentRequests.id, request.id));
  await db.update(invoices).set({ status: "paid" }).where(eq(invoices.manualPaymentRequestId, request.id));
  return {
    ...result,
    customerName: user.name ?? null,
    customerEmail: user.email ?? null,
    planCode: request.planCode,
    amountIls: invoice.amountIls,
  };
}

export async function rejectManualPaymentRequest(requestId: number, ownerNote: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available.");
  await db.update(manualPaymentRequests)
    .set({ status: "rejected", ownerNote: ownerNote.trim() || null })
    .where(and(eq(manualPaymentRequests.id, requestId), inArray(manualPaymentRequests.status, ["pending", "pending_manual_verification"])));
  await db.update(invoices).set({ status: "rejected" }).where(eq(invoices.manualPaymentRequestId, requestId));
}


function hashCompanyInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createCompanyInvitation(input: { companyId: number; invitedByUserId: number; email: string; role: Exclude<CompanyRole, "owner"> }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select().from(companyMembers).innerJoin(users, eq(companyMembers.userId, users.id)).where(and(eq(companyMembers.companyId, input.companyId), eq(users.email, email))).limit(1);
  if (existing) throw new Error("ALREADY_MEMBER");
  await db.update(companyInvitations).set({ status: "expired" }).where(and(eq(companyInvitations.companyId, input.companyId), eq(companyInvitations.email, email), eq(companyInvitations.status, "pending")));
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const result = await db.insert(companyInvitations).values({ companyId: input.companyId, email, role: input.role, tokenHash: hashCompanyInviteToken(rawToken), invitedByUserId: input.invitedByUserId, expiresAt });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.invitedByUserId, action: "member.invite.created", resourceType: "company_invitation", resourceId: Number(result[0].insertId), metadata: { email, role: input.role } });
  return { id: Number(result[0].insertId), email, role: input.role, expiresAt, token: rawToken };
}

export async function listCompanyInvitations(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companyInvitations).where(eq(companyInvitations.companyId, companyId)).orderBy(desc(companyInvitations.createdAt));
}

export async function revokeCompanyInvitation(input: { companyId: number; invitationId: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.update(companyInvitations).set({ status: "revoked" }).where(and(eq(companyInvitations.id, input.invitationId), eq(companyInvitations.companyId, input.companyId), eq(companyInvitations.status, "pending")));
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.actorUserId, action: "member.invite.revoked", resourceType: "company_invitation", resourceId: input.invitationId });
  return { success: true } as const;
}

export async function acceptCompanyInvitation(input: { token: string; userId: number; email?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const tokenHash = hashCompanyInviteToken(input.token.trim());
  const [invitation] = await db.select().from(companyInvitations).where(and(eq(companyInvitations.tokenHash, tokenHash), eq(companyInvitations.status, "pending"))).limit(1);
  if (!invitation || invitation.expiresAt.getTime() <= Date.now()) throw new Error("INVITATION_INVALID_OR_EXPIRED");
  if (input.email && input.email.trim().toLowerCase() !== invitation.email) throw new Error("INVITATION_EMAIL_MISMATCH");
  await db.insert(companyMembers).values({ companyId: invitation.companyId, userId: input.userId, role: invitation.role });
  await db.update(companyInvitations).set({ status: "accepted", acceptedByUserId: input.userId, acceptedAt: new Date() }).where(and(eq(companyInvitations.id, invitation.id), eq(companyInvitations.status, "pending")));
  await recordCompanyActivity({ companyId: invitation.companyId, actorUserId: input.userId, action: "member.invite.accepted", resourceType: "company_invitation", resourceId: invitation.id });
  return { companyId: invitation.companyId, role: invitation.role };
}

export async function recordCompanyActivity(input: { companyId: number; actorUserId: number; action: string; resourceType: string; resourceId?: string | number | null; metadata?: Record<string, unknown> | null }) {
  const db = await getDb();
  if (!db) return null;
  const [created] = await db.insert(companyActivityLogs).values({ companyId: input.companyId, actorUserId: input.actorUserId, action: input.action, resourceType: input.resourceType, resourceId: input.resourceId == null ? null : String(input.resourceId), metadata: input.metadata ? JSON.stringify(input.metadata) : null });
  return { id: Number(created.insertId) };
}

type CompanyRevisionOperation = "created" | "updated" | "deleted" | "replaced";

function revisionSnapshot(resourceType: string, resource: Record<string, any>) {
  const fields = resourceType === "unit"
    ? ["id", "companyId", "buildingId", "label", "floor", "bedrooms", "areaSqm", "status", "askingRentIls", "createdAt", "updatedAt"]
    : resourceType === "lease"
      ? ["id", "companyId", "unitId", "tenantId", "reference", "startAt", "endAt", "monthlyRentIls", "securityDepositIls", "paymentDueDay", "status", "renewalDecision", "moveInStatus", "moveOutStatus", "moveOutAt", "depositReturnedIls", "handoverNotes", "createdAt", "updatedAt"]
      : resourceType === "document"
        ? ["id", "companyId", "propertyId", "unitId", "title", "category", "fileKey", "mimeType", "versionNumber", "expiresAt", "uploadedByUserId", "createdAt", "updatedAt"]
        : Object.keys(resource);
  return Object.fromEntries(fields.map(field => [field, resource[field] ?? null]));
}

export async function recordCompanyResourceRevision(input: {
  companyId: number;
  actorUserId: number;
  resourceType: "unit" | "lease" | "document";
  resourceId: string | number;
  operation: CompanyRevisionOperation;
  summary: string;
  beforeSnapshot?: Record<string, any> | null;
  afterSnapshot?: Record<string, any> | null;
  metadata?: Record<string, unknown> | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const beforeSnapshot = input.beforeSnapshot ? JSON.stringify(revisionSnapshot(input.resourceType, input.beforeSnapshot)) : null;
  const afterSnapshot = input.afterSnapshot ? JSON.stringify(revisionSnapshot(input.resourceType, input.afterSnapshot)) : null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const [latest] = await db.select({ revisionNumber: companyResourceRevisions.revisionNumber })
      .from(companyResourceRevisions)
      .where(and(eq(companyResourceRevisions.companyId, input.companyId), eq(companyResourceRevisions.resourceType, input.resourceType), eq(companyResourceRevisions.resourceId, String(input.resourceId))))
      .orderBy(desc(companyResourceRevisions.revisionNumber))
      .limit(1);
    const revisionNumber = (latest?.revisionNumber ?? 0) + 1;
    try {
      const [created] = await db.insert(companyResourceRevisions).values({
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        resourceType: input.resourceType,
        resourceId: String(input.resourceId),
        revisionNumber,
        operation: input.operation,
        summary: input.summary.slice(0, 255),
        beforeSnapshot,
        afterSnapshot,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      });
      return { id: Number(created.insertId), revisionNumber };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (attempt === 2 || !message.includes("duplicate")) throw error;
    }
  }
  throw new Error("RESOURCE_REVISION_WRITE_FAILED");
}

export async function listCompanyResourceRevisions(input: { companyId: number; resourceType: "unit" | "lease" | "document"; resourceId: string | number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ revision: companyResourceRevisions, actor: { id: users.id, name: users.name, email: users.email } })
    .from(companyResourceRevisions)
    .leftJoin(users, eq(companyResourceRevisions.actorUserId, users.id))
    .where(and(eq(companyResourceRevisions.companyId, input.companyId), eq(companyResourceRevisions.resourceType, input.resourceType), eq(companyResourceRevisions.resourceId, String(input.resourceId))))
    .orderBy(desc(companyResourceRevisions.revisionNumber))
    .limit(Math.min(Math.max(input.limit ?? 30, 1), 100));
}

export async function listCompanyActivity(companyId: number, input: { search?: string; page?: number; pageSize?: number } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0, page: input.page ?? 1, pageSize: input.pageSize ?? 25 };
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 25;
  const conditions = [eq(companyActivityLogs.companyId, companyId)];
  if (input.search) conditions.push(or(like(companyActivityLogs.action, `%${input.search}%`), like(companyActivityLogs.resourceType, `%${input.search}%`)) as never);
  const [items, totalRows] = await Promise.all([
    db.select({ activity: companyActivityLogs, actor: users }).from(companyActivityLogs).innerJoin(users, eq(companyActivityLogs.actorUserId, users.id)).where(and(...conditions)).orderBy(desc(companyActivityLogs.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: count() }).from(companyActivityLogs).where(and(...conditions)),
  ]);
  return { items, total: Number(totalRows[0]?.count ?? 0), page, pageSize };
}


export type ResourceKind = "properties" | "clients" | "tasks";

export function getPlanResourceLimits(planCode: PlanCode) {
  return getPlan(planCode).limits;
}

export async function getCompanyResourceUsage(companyId: number) {
  const db = await getDb();
  if (!db) return { properties: 0, clients: 0, tasks: 0 };
  const [propertyRows, clientRows, taskRows] = await Promise.all([
    db.select({ total: count() }).from(properties).where(eq(properties.companyId, companyId)),
    db.select({ total: count() }).from(clients).where(eq(clients.companyId, companyId)),
    db.select({ total: count() }).from(tasks).where(eq(tasks.companyId, companyId)),
  ]);
  return {
    properties: Number(propertyRows[0]?.total ?? 0),
    clients: Number(clientRows[0]?.total ?? 0),
    tasks: Number(taskRows[0]?.total ?? 0),
  };
}

export async function getCompanyResourceSnapshot(companyId: number, userId: number) {
  const [companyMembership, subscription] = await Promise.all([getCompanyMembershipForCompany(companyId, userId), getCompanySubscription(companyId)]);
  if (!companyMembership) throw new Error("COMPANY_ACCESS_REQUIRED");
  const planCode = (subscription?.planCode && subscription.planCode in SUBSCRIPTION_PLANS ? subscription.planCode : "monthly") as PlanCode;
  const usage = await getCompanyResourceUsage(companyId);
  return { usage, limits: getPlanResourceLimits(planCode), planCode };
}

export async function assertCompanySubscription(companyId: number, userId: number) {
  const membership = await getCompanyMembershipForCompany(companyId, userId);
  if (!membership) throw new Error("COMPANY_ACCESS_REQUIRED");
  const subscription = await getCompanySubscription(companyId);
  if (!hasActiveSubscription(subscription)) throw new Error("ACTIVE_SUBSCRIPTION_REQUIRED");
  return { membership, subscription };
}

async function assertCompanySubscriptionAndQuota(companyId: number, userId: number, kind: ResourceKind) {
  const { membership, subscription } = await assertCompanySubscription(companyId, userId);
  const planCode = (subscription?.planCode && subscription.planCode in SUBSCRIPTION_PLANS ? subscription.planCode : "monthly") as PlanCode;
  const usage = await getCompanyResourceUsage(companyId);
  const limit = getPlanResourceLimits(planCode)[kind];
  if (limit !== null && usage[kind] >= limit) throw new Error("PLAN_LIMIT_REACHED");
  return { membership, subscription, planCode, usage, limit };
}

export async function listPortfolioHierarchyForCompany(companyId: number) {
  const db = await getDb();
  if (!db) return { portfolios: [], buildings: [], units: [] };
  const [portfolioRows, buildingRows, unitRows] = await Promise.all([
    db.select().from(portfolios).where(eq(portfolios.companyId, companyId)).orderBy(desc(portfolios.createdAt)),
    db.select().from(buildings).where(eq(buildings.companyId, companyId)).orderBy(desc(buildings.createdAt)),
    db.select().from(units).where(eq(units.companyId, companyId)).orderBy(desc(units.createdAt)),
  ]);
  return { portfolios: portfolioRows, buildings: buildingRows, units: unitRows };
}

export async function getLeasingCenterForCompany(companyId: number) {
  const db = await getDb();
  if (!db) return { leases: [], summary: { totalUnits: 0, occupiedUnits: 0, vacantUnits: 0, expiringSoon: 0, monthlyCommittedIls: 0 } };
  const [unitRows, leaseRows] = await Promise.all([
    db.select().from(units).where(eq(units.companyId, companyId)).orderBy(desc(units.updatedAt)),
    db.select().from(leases).where(eq(leases.companyId, companyId)).orderBy(desc(leases.endAt)),
  ]);
  const now = Date.now();
  const renewalWindow = now + 60 * 24 * 60 * 60 * 1000;
  const activeLeases = leaseRows.filter(lease => ["active", "notice"].includes(lease.status));
  return {
    leases: leaseRows,
    summary: {
      totalUnits: unitRows.length,
      occupiedUnits: unitRows.filter(unit => unit.status === "occupied").length,
      vacantUnits: unitRows.filter(unit => unit.status === "vacant").length,
      expiringSoon: activeLeases.filter(lease => {
        const endsAt = new Date(lease.endAt).getTime();
        return endsAt >= now && endsAt <= renewalWindow;
      }).length,
      monthlyCommittedIls: activeLeases.reduce((sum, lease) => sum + lease.monthlyRentIls, 0),
    },
  };
}

export async function createPortfolioForCompany(input: { companyId: number; userId: number; name: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "properties");
  const name = input.name.trim();
  if (name.length < 2 || name.length > 180) throw new Error("INVALID_PORTFOLIO_NAME");
  const result = await db.insert(portfolios).values({ companyId: input.companyId, name, description: input.description?.trim() || null, createdByUserId: input.userId });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "portfolio.created", resourceType: "portfolio", resourceId: Number(result[0].insertId), metadata: { name } });
  const [created] = await db.select().from(portfolios).where(eq(portfolios.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function createBuildingForCompany(input: { companyId: number; userId: number; portfolioId: number; propertyId?: number | null; name: string; address?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "properties");
  const [portfolio] = await db.select().from(portfolios).where(and(eq(portfolios.id, input.portfolioId), eq(portfolios.companyId, input.companyId))).limit(1);
  if (!portfolio) throw new Error("PORTFOLIO_ACCESS_REQUIRED");
  const name = input.name.trim();
  if (name.length < 2 || name.length > 180) throw new Error("INVALID_BUILDING_NAME");
  if (input.propertyId) {
    const [property] = await db.select({ id: properties.id }).from(properties).where(and(eq(properties.id, input.propertyId), eq(properties.companyId, input.companyId))).limit(1);
    if (!property) throw new Error("PROPERTY_ACCESS_REQUIRED");
  }
  const result = await db.insert(buildings).values({ companyId: input.companyId, portfolioId: input.portfolioId, propertyId: input.propertyId ?? null, name, address: input.address?.trim() || null, createdByUserId: input.userId });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "building.created", resourceType: "building", resourceId: Number(result[0].insertId), metadata: { portfolioId: input.portfolioId, name } });
  const [created] = await db.select().from(buildings).where(eq(buildings.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function createUnitForCompany(input: { companyId: number; userId: number; buildingId: number; label: string; floor?: string; bedrooms?: number; areaSqm?: number | null; status?: "vacant" | "occupied" | "reserved" | "maintenance"; askingRentIls?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "properties");
  const [building] = await db.select().from(buildings).where(and(eq(buildings.id, input.buildingId), eq(buildings.companyId, input.companyId))).limit(1);
  if (!building) throw new Error("BUILDING_ACCESS_REQUIRED");
  const label = input.label.trim();
  if (!label || label.length > 80) throw new Error("INVALID_UNIT_LABEL");
  if ((input.askingRentIls ?? 0) < 0 || (input.areaSqm ?? 0) < 0 || (input.bedrooms ?? 0) < 0) throw new Error("INVALID_UNIT_METRICS");
  const result = await db.insert(units).values({ companyId: input.companyId, buildingId: input.buildingId, label, floor: input.floor?.trim() || null, bedrooms: input.bedrooms ?? 0, areaSqm: input.areaSqm ?? null, status: input.status ?? "vacant", askingRentIls: input.askingRentIls ?? 0, createdByUserId: input.userId });
  await db.update(buildings).set({ totalUnits: building.totalUnits + 1 }).where(and(eq(buildings.id, input.buildingId), eq(buildings.companyId, input.companyId)));
  const [created] = await db.select().from(units).where(eq(units.id, Number(result[0].insertId))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  await recordCompanyResourceRevision({ companyId: input.companyId, actorUserId: input.userId, resourceType: "unit", resourceId: created.id, operation: "created", summary: `Created unit ${created.label}`, afterSnapshot: created, metadata: { buildingId: created.buildingId } });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "unit.created", resourceType: "unit", resourceId: created.id, metadata: { buildingId: input.buildingId, label } });
  return created;
}

export async function updateUnitStatusForCompany(input: { companyId: number; userId: number; unitId: number; status: "vacant" | "occupied" | "reserved" | "maintenance"; askingRentIls?: number }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  if (input.askingRentIls !== undefined && input.askingRentIls < 0) throw new Error("INVALID_UNIT_METRICS");
  const [unit] = await db.select().from(units).where(and(eq(units.id, input.unitId), eq(units.companyId, input.companyId))).limit(1);
  if (!unit) throw new Error("UNIT_ACCESS_REQUIRED");
  await db.update(units).set({ status: input.status, ...(input.askingRentIls === undefined ? {} : { askingRentIls: input.askingRentIls }) }).where(and(eq(units.id, input.unitId), eq(units.companyId, input.companyId)));
  const [updated] = await db.select().from(units).where(and(eq(units.id, input.unitId), eq(units.companyId, input.companyId))).limit(1);
  if (!updated) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyResourceRevision({ companyId: input.companyId, actorUserId: input.userId, resourceType: "unit", resourceId: input.unitId, operation: "updated", summary: `Updated unit ${updated.label} occupancy or asking rent`, beforeSnapshot: unit, afterSnapshot: updated, metadata: { status: input.status, askingRentIls: input.askingRentIls } });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "unit.status_updated", resourceType: "unit", resourceId: input.unitId, metadata: { status: input.status, askingRentIls: input.askingRentIls } });
  return updated;
}

export async function deleteUnitForCompany(input: { companyId: number; userId: number; unitId: number }) {
  await assertCompanySubscription(input.companyId, input.userId);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");

  const [unit] = await db.select().from(units).where(and(eq(units.id, input.unitId), eq(units.companyId, input.companyId))).limit(1);
  if (!unit) throw new Error("UNIT_ACCESS_REQUIRED");

  const [linkedLease] = await db.select({ id: leases.id }).from(leases).where(and(eq(leases.unitId, input.unitId), eq(leases.companyId, input.companyId))).limit(1);
  if (linkedLease) throw new Error("UNIT_HAS_LEASES");

  const [linkedCollection] = await db.select({ id: leaseCollections.id }).from(leaseCollections).where(and(eq(leaseCollections.unitId, input.unitId), eq(leaseCollections.companyId, input.companyId))).limit(1);
  if (linkedCollection) throw new Error("UNIT_HAS_COLLECTIONS");

  await db.delete(units).where(and(eq(units.id, input.unitId), eq(units.companyId, input.companyId)));
  await db.update(buildings).set({ totalUnits: sql`GREATEST(${buildings.totalUnits} - 1, 0)` }).where(and(eq(buildings.id, unit.buildingId), eq(buildings.companyId, input.companyId)));
  await recordCompanyResourceRevision({ companyId: input.companyId, actorUserId: input.userId, resourceType: "unit", resourceId: input.unitId, operation: "deleted", summary: `Deleted unit ${unit.label}`, beforeSnapshot: unit, metadata: { buildingId: unit.buildingId } });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "unit.deleted", resourceType: "unit", resourceId: input.unitId, metadata: { buildingId: unit.buildingId, label: unit.label } });
  return { unitId: input.unitId };
}

async function assertCompanySubscriptionAccess(companyId: number, userId: number) {
  const membership = await getCompanyMembershipForCompany(companyId, userId);
  if (!membership) throw new Error("COMPANY_ACCESS_REQUIRED");
  const subscription = await getCompanySubscription(companyId);
  if (!hasActiveSubscription(subscription)) throw new Error("ACTIVE_SUBSCRIPTION_REQUIRED");
  return membership;
}

export async function listUnifiedPropertyForBuilding(companyId: number, buildingId: number) {
  const db = await getDb();
  if (!db) return { floors: [], rooms: [], amenities: [] };
  const [building] = await db.select({ id: buildings.id }).from(buildings).where(and(eq(buildings.id, buildingId), eq(buildings.companyId, companyId))).limit(1);
  if (!building) throw new Error("BUILDING_ACCESS_REQUIRED");
  const [floors, rooms, amenities] = await Promise.all([
    db.select().from(buildingFloors).where(and(eq(buildingFloors.companyId, companyId), eq(buildingFloors.buildingId, buildingId))).orderBy(buildingFloors.floorNumber, buildingFloors.label),
    db.select().from(buildingRooms).where(and(eq(buildingRooms.companyId, companyId), eq(buildingRooms.buildingId, buildingId))).orderBy(desc(buildingRooms.createdAt)),
    db.select().from(buildingAmenities).where(and(eq(buildingAmenities.companyId, companyId), eq(buildingAmenities.buildingId, buildingId))).orderBy(desc(buildingAmenities.createdAt)),
  ]);
  return { floors, rooms, amenities };
}

export async function createBuildingFloor(input: { companyId: number; userId: number; buildingId: number; label: string; floorNumber?: number | null; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAccess(input.companyId, input.userId);
  const [building] = await db.select({ id: buildings.id }).from(buildings).where(and(eq(buildings.id, input.buildingId), eq(buildings.companyId, input.companyId))).limit(1);
  if (!building) throw new Error("BUILDING_ACCESS_REQUIRED");
  const label = input.label.trim();
  if (!label || label.length > 80) throw new Error("INVALID_FLOOR_LABEL");
  if (input.floorNumber != null && (!Number.isInteger(input.floorNumber) || input.floorNumber < -20 || input.floorNumber > 500)) throw new Error("INVALID_FLOOR_NUMBER");
  const [existing] = await db.select({ id: buildingFloors.id }).from(buildingFloors).where(and(eq(buildingFloors.buildingId, input.buildingId), eq(buildingFloors.label, label))).limit(1);
  if (existing) throw new Error("FLOOR_LABEL_EXISTS");
  const result = await db.insert(buildingFloors).values({ companyId: input.companyId, buildingId: input.buildingId, label, floorNumber: input.floorNumber ?? null, notes: input.notes?.trim() || null, createdByUserId: input.userId });
  const id = Number(result[0].insertId);
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "building_floor.created", resourceType: "building_floor", resourceId: id, metadata: { buildingId: input.buildingId, label, floorNumber: input.floorNumber ?? null } });
  const [created] = await db.select().from(buildingFloors).where(and(eq(buildingFloors.id, id), eq(buildingFloors.companyId, input.companyId))).limit(1);
  return created;
}

export async function createBuildingRoom(input: { companyId: number; userId: number; buildingId: number; floorId?: number | null; label: string; roomType?: "common" | "storage" | "parking" | "amenity" | "office" | "retail" | "other"; areaSqm?: number | null; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAccess(input.companyId, input.userId);
  const [building] = await db.select({ id: buildings.id }).from(buildings).where(and(eq(buildings.id, input.buildingId), eq(buildings.companyId, input.companyId))).limit(1);
  if (!building) throw new Error("BUILDING_ACCESS_REQUIRED");
  if (input.floorId != null) {
    const [floor] = await db.select({ id: buildingFloors.id }).from(buildingFloors).where(and(eq(buildingFloors.id, input.floorId), eq(buildingFloors.companyId, input.companyId), eq(buildingFloors.buildingId, input.buildingId))).limit(1);
    if (!floor) throw new Error("FLOOR_ACCESS_REQUIRED");
  }
  const label = input.label.trim();
  if (!label || label.length > 120) throw new Error("INVALID_ROOM_LABEL");
  if (input.areaSqm != null && (!Number.isInteger(input.areaSqm) || input.areaSqm < 0 || input.areaSqm > 1000000)) throw new Error("INVALID_ROOM_AREA");
  const [existing] = await db.select({ id: buildingRooms.id }).from(buildingRooms).where(and(eq(buildingRooms.buildingId, input.buildingId), eq(buildingRooms.label, label))).limit(1);
  if (existing) throw new Error("ROOM_LABEL_EXISTS");
  const result = await db.insert(buildingRooms).values({ companyId: input.companyId, buildingId: input.buildingId, floorId: input.floorId ?? null, label, roomType: input.roomType ?? "common", areaSqm: input.areaSqm ?? null, notes: input.notes?.trim() || null, createdByUserId: input.userId });
  const id = Number(result[0].insertId);
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "building_room.created", resourceType: "building_room", resourceId: id, metadata: { buildingId: input.buildingId, floorId: input.floorId ?? null, label, roomType: input.roomType ?? "common" } });
  const [created] = await db.select().from(buildingRooms).where(and(eq(buildingRooms.id, id), eq(buildingRooms.companyId, input.companyId))).limit(1);
  return created;
}

export async function createBuildingAmenity(input: { companyId: number; userId: number; buildingId: number; name: string; category?: "security" | "utilities" | "recreation" | "accessibility" | "services" | "other"; status?: "active" | "maintenance" | "inactive"; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAccess(input.companyId, input.userId);
  const [building] = await db.select({ id: buildings.id }).from(buildings).where(and(eq(buildings.id, input.buildingId), eq(buildings.companyId, input.companyId))).limit(1);
  if (!building) throw new Error("BUILDING_ACCESS_REQUIRED");
  const name = input.name.trim();
  if (!name || name.length > 120) throw new Error("INVALID_AMENITY_NAME");
  const [existing] = await db.select({ id: buildingAmenities.id }).from(buildingAmenities).where(and(eq(buildingAmenities.buildingId, input.buildingId), eq(buildingAmenities.name, name))).limit(1);
  if (existing) throw new Error("AMENITY_NAME_EXISTS");
  const result = await db.insert(buildingAmenities).values({ companyId: input.companyId, buildingId: input.buildingId, name, category: input.category ?? "other", status: input.status ?? "active", notes: input.notes?.trim() || null, createdByUserId: input.userId });
  const id = Number(result[0].insertId);
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "building_amenity.created", resourceType: "building_amenity", resourceId: id, metadata: { buildingId: input.buildingId, name, category: input.category ?? "other", status: input.status ?? "active" } });
  const [created] = await db.select().from(buildingAmenities).where(and(eq(buildingAmenities.id, id), eq(buildingAmenities.companyId, input.companyId))).limit(1);
  return created;
}

export async function createLeaseForCompany(input: { companyId: number; userId: number; unitId: number; tenantId: number; reference: string; startAt: Date; endAt: Date; monthlyRentIls: number; securityDepositIls?: number; paymentDueDay?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "properties");
  const reference = input.reference.trim();
  const dueDay = input.paymentDueDay ?? 1;
  if (!reference || input.monthlyRentIls <= 0 || (input.securityDepositIls ?? 0) < 0 || input.startAt >= input.endAt) throw new Error("INVALID_LEASE_TERMS");
  if (dueDay < 1 || dueDay > 28) throw new Error("INVALID_PAYMENT_DUE_DAY");
  const [unitRows, tenantRows] = await Promise.all([
    db.select().from(units).where(and(eq(units.id, input.unitId), eq(units.companyId, input.companyId))).limit(1),
    db.select().from(tenants).where(and(eq(tenants.id, input.tenantId), eq(tenants.companyId, input.companyId))).limit(1),
  ]);
  if (!unitRows[0]) throw new Error("UNIT_ACCESS_REQUIRED");
  if (!tenantRows[0]) throw new Error("TENANT_ACCESS_REQUIRED");
  const existingActive = await db.select({ id: leases.id }).from(leases).where(and(eq(leases.companyId, input.companyId), eq(leases.unitId, input.unitId), eq(leases.status, "active"))).limit(1);
  if (existingActive[0]) throw new Error("UNIT_ALREADY_LEASED");
  const unit = unitRows[0];
  const result = await db.transaction(async tx => {
    const leaseResult = await tx.insert(leases).values({ companyId: input.companyId, unitId: input.unitId, tenantId: input.tenantId, reference, startAt: input.startAt, endAt: input.endAt, monthlyRentIls: input.monthlyRentIls, securityDepositIls: input.securityDepositIls ?? 0, paymentDueDay: dueDay, status: "active", renewalNoticeAt: new Date(input.endAt.getTime() - 60 * 24 * 60 * 60 * 1000), createdByUserId: input.userId });
    const leaseId = Number(leaseResult[0].insertId);
    await tx.update(units).set({ status: "occupied" }).where(and(eq(units.id, input.unitId), eq(units.companyId, input.companyId)));
    await tx.update(tenants).set({ propertyId: unit.buildingId, status: "active" }).where(and(eq(tenants.id, input.tenantId), eq(tenants.companyId, input.companyId)));
    await tx.insert(recurringCharges).values({ companyId: input.companyId, unitId: input.unitId, tenantId: input.tenantId, description: `Rent · ${reference}`, amountIls: input.monthlyRentIls, dueDay, status: "active", nextDueAt: input.startAt, createdByUserId: input.userId });
    await tx.insert(leaseCollections).values({
      companyId: input.companyId,
      leaseId,
      unitId: input.unitId,
      tenantId: input.tenantId,
      periodLabel: input.startAt.toISOString().slice(0, 7),
      dueAt: input.startAt,
      amountDueIls: input.monthlyRentIls,
      status: input.startAt.getTime() <= Date.now() ? "due" : "scheduled",
      createdByUserId: input.userId,
    });
    return leaseResult;
  });
  const leaseId = Number(result[0].insertId);
  const [created] = await db.select().from(leases).where(and(eq(leases.id, leaseId), eq(leases.companyId, input.companyId))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  await recordCompanyResourceRevision({ companyId: input.companyId, actorUserId: input.userId, resourceType: "lease", resourceId: leaseId, operation: "created", summary: `Activated lease ${created.reference}`, afterSnapshot: created, metadata: { unitId: created.unitId, tenantId: created.tenantId, monthlyRentIls: created.monthlyRentIls } });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "lease.activated", resourceType: "lease", resourceId: leaseId, metadata: { unitId: input.unitId, tenantId: input.tenantId, reference, monthlyRentIls: input.monthlyRentIls } });
  return created;
}

export async function updateLeaseLifecycleForCompany(input: {
  companyId: number;
  userId: number;
  leaseId: number;
  renewalDecision?: "not_requested" | "offered" | "accepted" | "declined";
  moveInStatus?: "pending" | "ready" | "completed";
  moveOutStatus?: "not_started" | "scheduled" | "completed";
  depositReturnedIls?: number;
  handoverNotes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "properties");
  const [lease] = await db.select().from(leases).where(and(eq(leases.id, input.leaseId), eq(leases.companyId, input.companyId))).limit(1);
  if (!lease) throw new Error("LEASE_ACCESS_REQUIRED");
  if (input.depositReturnedIls !== undefined && (input.depositReturnedIls < 0 || input.depositReturnedIls > lease.securityDepositIls)) throw new Error("INVALID_DEPOSIT_RETURN");
  const handoverNotes = input.handoverNotes === undefined ? undefined : (input.handoverNotes?.trim() || null);
  const completedMoveOut = input.moveOutStatus === "completed";
  await db.transaction(async tx => {
    await tx.update(leases).set({
      renewalDecision: input.renewalDecision,
      moveInStatus: input.moveInStatus,
      moveOutStatus: input.moveOutStatus,
      moveOutAt: completedMoveOut ? new Date() : undefined,
      depositReturnedIls: input.depositReturnedIls,
      handoverNotes,
      status: completedMoveOut ? "ended" : undefined,
    }).where(and(eq(leases.id, input.leaseId), eq(leases.companyId, input.companyId)));
    if (completedMoveOut) {
      await tx.update(units).set({ status: "vacant" }).where(and(eq(units.id, lease.unitId), eq(units.companyId, input.companyId)));
      await tx.update(recurringCharges).set({ status: "paused" }).where(and(eq(recurringCharges.companyId, input.companyId), eq(recurringCharges.unitId, lease.unitId), eq(recurringCharges.tenantId, lease.tenantId), eq(recurringCharges.status, "active")));
    }
  });
  const [updated] = await db.select().from(leases).where(and(eq(leases.id, input.leaseId), eq(leases.companyId, input.companyId))).limit(1);
  if (!updated) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyResourceRevision({ companyId: input.companyId, actorUserId: input.userId, resourceType: "lease", resourceId: input.leaseId, operation: "updated", summary: completedMoveOut ? `Completed move-out for lease ${updated.reference}` : `Updated lifecycle for lease ${updated.reference}`, beforeSnapshot: lease, afterSnapshot: updated, metadata: { renewalDecision: input.renewalDecision, moveInStatus: input.moveInStatus, moveOutStatus: input.moveOutStatus, depositReturnedIls: input.depositReturnedIls } });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: completedMoveOut ? "lease.move_out_completed" : "lease.lifecycle_updated", resourceType: "lease", resourceId: input.leaseId, metadata: { renewalDecision: input.renewalDecision, moveInStatus: input.moveInStatus, moveOutStatus: input.moveOutStatus, depositReturnedIls: input.depositReturnedIls } });
  return updated;
}

export async function markOverdueCollections(companyId: number) {
  const db = await getDb();
  if (!db) return { updated: 0 };
  const result = await db.update(leaseCollections).set({ status: "overdue" }).where(and(
    eq(leaseCollections.companyId, companyId),
    lte(leaseCollections.dueAt, new Date()),
    inArray(leaseCollections.status, ["scheduled", "due", "partial"]),
  ));
  return { updated: Number(result[0]?.affectedRows ?? 0) };
}

export async function getLeaseCollectionsForCompany(companyId: number, userId: number) {
  await assertCompanyOperationalAccess(companyId, userId);
  const db = await getDb();
  if (!db) return { collections: [], summary: { totalDueIls: 0, totalReceivedIls: 0, outstandingIls: 0, arrearsRiskIls: 0, overdueCount: 0 } };
  await markOverdueCollections(companyId);
  const rows = await db.select().from(leaseCollections).where(eq(leaseCollections.companyId, companyId)).orderBy(leaseCollections.dueAt);
  const [leaseRows, unitRows, tenantRows, paymentEventRows] = await Promise.all([
    db.select().from(leases).where(eq(leases.companyId, companyId)),
    db.select().from(units).where(eq(units.companyId, companyId)),
    db.select().from(tenants).where(eq(tenants.companyId, companyId)),
    db.select().from(collectionPaymentEvents).where(eq(collectionPaymentEvents.companyId, companyId)).orderBy(desc(collectionPaymentEvents.effectiveAt), desc(collectionPaymentEvents.createdAt)),
  ]);
  const leaseReference = new Map(leaseRows.map(lease => [lease.id, lease.reference]));
  const unitLabel = new Map(unitRows.map(unit => [unit.id, unit.label]));
  const tenantName = new Map(tenantRows.map(tenant => [tenant.id, tenant.name]));
  const paymentEventsByCollection = new Map<number, (typeof paymentEventRows)[number][]>();
  const reversedPaymentIdsByCollection = new Map<number, Set<number>>();
  for (const event of paymentEventRows) {
    const events = paymentEventsByCollection.get(event.collectionId) ?? [];
    events.push(event);
    paymentEventsByCollection.set(event.collectionId, events);
    if (event.eventType === "reversal" && event.reversedPaymentEventId) {
      const reversedIds = reversedPaymentIdsByCollection.get(event.collectionId) ?? new Set<number>();
      reversedIds.add(event.reversedPaymentEventId);
      reversedPaymentIdsByCollection.set(event.collectionId, reversedIds);
    }
  }
  const collections = rows.map(collection => {
    const paymentEvents = paymentEventsByCollection.get(collection.id) ?? [];
    const reversedPaymentIds = reversedPaymentIdsByCollection.get(collection.id) ?? new Set<number>();
    return {
      ...collection,
      leaseReference: leaseReference.get(collection.leaseId) ?? `#${collection.leaseId}`,
      unitLabel: unitLabel.get(collection.unitId) ?? `#${collection.unitId}`,
      tenantName: tenantName.get(collection.tenantId) ?? `#${collection.tenantId}`,
      latestPaymentEvent: paymentEvents[0] ?? null,
      paymentEvents: paymentEvents.map(event => ({ ...event, isReversed: event.eventType === "payment" && reversedPaymentIds.has(event.id) })),
    };
  });
  const totalDueIls = collections.reduce((sum, collection) => sum + collection.amountDueIls, 0);
  const totalReceivedIls = collections.reduce((sum, collection) => sum + collection.amountReceivedIls, 0);
  const arrearsRiskIls = collections.filter(collection => collection.status === "overdue").reduce((sum, collection) => sum + Math.max(0, collection.amountDueIls - collection.amountReceivedIls), 0);
  return { collections, summary: { totalDueIls, totalReceivedIls, outstandingIls: Math.max(0, totalDueIls - totalReceivedIls), arrearsRiskIls, overdueCount: collections.filter(collection => collection.status === "overdue").length } };
}

export async function createLeaseCollectionPeriod(input: { companyId: number; userId: number; leaseId: number; periodLabel: string; dueAt: Date; amountDueIls: number; notes?: string | null }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const periodLabel = input.periodLabel.trim();
  if (!periodLabel || periodLabel.length > 80 || !Number.isSafeInteger(input.amountDueIls) || input.amountDueIls <= 0) throw new Error("INVALID_COLLECTION_PERIOD");
  const [lease] = await db.select().from(leases).where(and(eq(leases.id, input.leaseId), eq(leases.companyId, input.companyId))).limit(1);
  if (!lease) throw new Error("LEASE_ACCESS_REQUIRED");
  const [existing] = await db.select({ id: leaseCollections.id }).from(leaseCollections).where(and(eq(leaseCollections.leaseId, input.leaseId), eq(leaseCollections.periodLabel, periodLabel))).limit(1);
  if (existing) throw new Error("COLLECTION_PERIOD_EXISTS");
  const status = input.dueAt.getTime() <= Date.now() ? "due" : "scheduled";
  const result = await db.insert(leaseCollections).values({ companyId: input.companyId, leaseId: lease.id, unitId: lease.unitId, tenantId: lease.tenantId, periodLabel, dueAt: input.dueAt, amountDueIls: input.amountDueIls, status, notes: input.notes?.trim() || null, createdByUserId: input.userId });
  const collectionId = Number(result[0].insertId);
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "collection.period_created", resourceType: "lease_collection", resourceId: collectionId, metadata: { leaseId: lease.id, periodLabel, amountDueIls: input.amountDueIls } });
  const [created] = await db.select().from(leaseCollections).where(and(eq(leaseCollections.id, collectionId), eq(leaseCollections.companyId, input.companyId))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  return created;
}

export async function recordLeasePayment(input: { companyId: number; userId: number; collectionId: number; amountIls: number; paymentMethod: "cash" | "bank" | "card" | "transfer" | "other"; receivedAt?: Date; notes?: string | null; idempotencyKey?: string; requestId?: string }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  if (!Number.isSafeInteger(input.amountIls) || input.amountIls <= 0) throw new Error("INVALID_PAYMENT_AMOUNT");
  const idempotencyKey = input.idempotencyKey?.trim();
  if (!idempotencyKey || idempotencyKey.length > 96) throw new Error("PAYMENT_IDEMPOTENCY_KEY_REQUIRED");
  const result = await db.transaction(async tx => {
    const [existingEvent] = await tx.select().from(collectionPaymentEvents).where(and(eq(collectionPaymentEvents.companyId, input.companyId), eq(collectionPaymentEvents.idempotencyKey, idempotencyKey))).limit(1);
    if (existingEvent) {
      if (existingEvent.collectionId !== input.collectionId) throw new Error("IDEMPOTENCY_KEY_CONFLICT");
      const [existingCollection] = await tx.select().from(leaseCollections).where(and(eq(leaseCollections.id, input.collectionId), eq(leaseCollections.companyId, input.companyId))).limit(1);
      if (!existingCollection) throw new Error("COLLECTION_ACCESS_REQUIRED");
      return { collection: existingCollection, recorded: false, metadata: null };
    }
    const [collection] = await tx.select().from(leaseCollections).where(and(eq(leaseCollections.id, input.collectionId), eq(leaseCollections.companyId, input.companyId))).limit(1);
    if (!collection) throw new Error("COLLECTION_ACCESS_REQUIRED");
    if (["paid", "waived"].includes(collection.status)) throw new Error("COLLECTION_NOT_PAYABLE");
    const amountReceivedIls = collection.amountReceivedIls + input.amountIls;
    if (amountReceivedIls > collection.amountDueIls) throw new Error("PAYMENT_EXCEEDS_BALANCE");
    const receivedAt = input.receivedAt ?? new Date();
    const status = amountReceivedIls === collection.amountDueIls ? "paid" : collection.dueAt.getTime() <= receivedAt.getTime() ? "overdue" : "partial";
    await tx.insert(collectionPaymentEvents).values({ companyId: input.companyId, collectionId: collection.id, leaseId: collection.leaseId, unitId: collection.unitId, tenantId: collection.tenantId, eventType: "payment", idempotencyKey, amountIls: input.amountIls, paymentMethod: input.paymentMethod, effectiveAt: receivedAt, recordedByUserId: input.userId, requestId: input.requestId?.slice(0, 64) || null, notes: input.notes?.trim() || null });
    await tx.update(leaseCollections).set({ amountReceivedIls, status, paymentMethod: input.paymentMethod, receivedAt, notes: input.notes === undefined ? collection.notes : (input.notes?.trim() || null) }).where(and(eq(leaseCollections.id, input.collectionId), eq(leaseCollections.companyId, input.companyId)));
    const [updated] = await tx.select().from(leaseCollections).where(and(eq(leaseCollections.id, input.collectionId), eq(leaseCollections.companyId, input.companyId))).limit(1);
    if (!updated) throw new Error("RESOURCE_NOT_FOUND");
    return { collection: updated, recorded: true, metadata: { leaseId: collection.leaseId, amountReceivedIls, status } };
  });
  if (result.recorded && result.metadata) {
    await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "collection.payment_recorded", resourceType: "lease_collection", resourceId: input.collectionId, metadata: { ...result.metadata, amountIls: input.amountIls, paymentMethod: input.paymentMethod, idempotencyKey } });
  }
  return result.collection;
}

export async function reverseLeasePayment(input: { companyId: number; userId: number; paymentEventId: number; reason: string; idempotencyKey?: string; reversedAt?: Date; requestId?: string }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 1000) throw new Error("PAYMENT_REVERSAL_REASON_REQUIRED");
  const idempotencyKey = input.idempotencyKey?.trim();
  if (!idempotencyKey || idempotencyKey.length > 96) throw new Error("PAYMENT_IDEMPOTENCY_KEY_REQUIRED");

  const result = await db.transaction(async tx => {
    const [existingByKey] = await tx.select().from(collectionPaymentEvents).where(and(
      eq(collectionPaymentEvents.companyId, input.companyId),
      eq(collectionPaymentEvents.idempotencyKey, idempotencyKey),
    )).limit(1);
    if (existingByKey) {
      if (existingByKey.eventType !== "reversal" || existingByKey.reversedPaymentEventId !== input.paymentEventId) throw new Error("IDEMPOTENCY_KEY_CONFLICT");
      const [existingCollection] = await tx.select().from(leaseCollections).where(and(
        eq(leaseCollections.id, existingByKey.collectionId),
        eq(leaseCollections.companyId, input.companyId),
      )).limit(1);
      if (!existingCollection) throw new Error("COLLECTION_ACCESS_REQUIRED");
      return { collection: existingCollection, reversed: false, metadata: null };
    }

    const [paymentEvent] = await tx.select().from(collectionPaymentEvents).where(and(
      eq(collectionPaymentEvents.id, input.paymentEventId),
      eq(collectionPaymentEvents.companyId, input.companyId),
    )).limit(1);
    if (!paymentEvent || paymentEvent.eventType !== "payment") throw new Error("PAYMENT_EVENT_ACCESS_REQUIRED");

    const [existingReversal] = await tx.select({ id: collectionPaymentEvents.id }).from(collectionPaymentEvents).where(and(
      eq(collectionPaymentEvents.companyId, input.companyId),
      eq(collectionPaymentEvents.reversedPaymentEventId, paymentEvent.id),
    )).limit(1);
    if (existingReversal) throw new Error("PAYMENT_ALREADY_REVERSED");

    const [collection] = await tx.select().from(leaseCollections).where(and(
      eq(leaseCollections.id, paymentEvent.collectionId),
      eq(leaseCollections.companyId, input.companyId),
    )).limit(1);
    if (!collection) throw new Error("COLLECTION_ACCESS_REQUIRED");
    if (collection.amountReceivedIls < paymentEvent.amountIls) throw new Error("PAYMENT_REVERSAL_BALANCE_INVALID");

    const paymentEvents = await tx.select().from(collectionPaymentEvents).where(and(
      eq(collectionPaymentEvents.companyId, input.companyId),
      eq(collectionPaymentEvents.collectionId, collection.id),
    )).orderBy(desc(collectionPaymentEvents.effectiveAt), desc(collectionPaymentEvents.createdAt));
    const reversedPaymentIds = new Set(paymentEvents
      .filter(event => event.eventType === "reversal" && event.reversedPaymentEventId)
      .map(event => event.reversedPaymentEventId as number));
    const latestRemainingPayment = paymentEvents.find(event => event.eventType === "payment" && event.id !== paymentEvent.id && !reversedPaymentIds.has(event.id));
    const amountReceivedIls = collection.amountReceivedIls - paymentEvent.amountIls;
    const reversedAt = input.reversedAt ?? new Date();
    const status = amountReceivedIls === 0
      ? (collection.dueAt.getTime() <= reversedAt.getTime() ? "overdue" : "scheduled")
      : (collection.dueAt.getTime() <= reversedAt.getTime() ? "overdue" : "partial");

    await tx.insert(collectionPaymentEvents).values({
      companyId: input.companyId,
      collectionId: collection.id,
      leaseId: collection.leaseId,
      unitId: collection.unitId,
      tenantId: collection.tenantId,
      eventType: "reversal",
      idempotencyKey,
      amountIls: -paymentEvent.amountIls,
      paymentMethod: paymentEvent.paymentMethod,
      reversedPaymentEventId: paymentEvent.id,
      effectiveAt: reversedAt,
      recordedByUserId: input.userId,
      requestId: input.requestId?.slice(0, 64) || null,
      notes: reason,
    });
    await tx.update(leaseCollections).set({
      amountReceivedIls,
      status,
      paymentMethod: latestRemainingPayment?.paymentMethod ?? null,
      receivedAt: latestRemainingPayment?.effectiveAt ?? null,
    }).where(and(eq(leaseCollections.id, collection.id), eq(leaseCollections.companyId, input.companyId)));
    const [updated] = await tx.select().from(leaseCollections).where(and(
      eq(leaseCollections.id, collection.id),
      eq(leaseCollections.companyId, input.companyId),
    )).limit(1);
    if (!updated) throw new Error("RESOURCE_NOT_FOUND");
    return { collection: updated, reversed: true, metadata: { collectionId: collection.id, paymentEventId: paymentEvent.id, amountIls: paymentEvent.amountIls, amountReceivedIls, status } };
  });

  if (result.reversed && result.metadata) {
    await recordCompanyActivity({
      companyId: input.companyId,
      actorUserId: input.userId,
      action: "collection.payment_reversed",
      resourceType: "lease_collection",
      resourceId: result.metadata.collectionId,
      metadata: { ...result.metadata, reason, idempotencyKey },
    });
  }
  return result.collection;
}

export async function listPropertiesForCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(properties).where(eq(properties.companyId, companyId)).orderBy(desc(properties.createdAt));
}

export async function getTenantPortalForEmail(email: string) {
  const db = await getDb();
  if (!db || !email) return { tenant: null, contracts: [], payments: [], documents: [] };
  const [tenant] = await db.select().from(tenants).where(eq(tenants.email, email.toLowerCase())).orderBy(desc(tenants.updatedAt)).limit(1);
  if (!tenant) return { tenant: null, contracts: [], payments: [], documents: [] };
  const [tenantContracts, tenantPayments, tenantDocuments] = await Promise.all([
    db.select().from(contracts).where(and(eq(contracts.companyId, tenant.companyId), eq(contracts.tenantId, tenant.id))).orderBy(desc(contracts.endAt)),
    db.select().from(operationalPayments).where(and(eq(operationalPayments.companyId, tenant.companyId), eq(operationalPayments.tenantId, tenant.id))).orderBy(desc(operationalPayments.createdAt)),
    tenant.propertyId ? db.select().from(documents).where(and(eq(documents.companyId, tenant.companyId), eq(documents.propertyId, tenant.propertyId))).orderBy(desc(documents.updatedAt)) : Promise.resolve([]),
  ]);
  return { tenant, contracts: tenantContracts, payments: tenantPayments, documents: tenantDocuments };
}

export async function getDocumentsCenterForCompany(companyId: number) {
  const db = await getDb();
  if (!db) return { documents: [], summary: { total: 0, expiringSoon: 0, categories: 0 } };
  const rows = await db.select().from(documents).where(eq(documents.companyId, companyId)).orderBy(desc(documents.updatedAt));
  const now = Date.now(); const soon = now + 30 * 24 * 3600000;
  return { documents: rows, summary: { total: rows.length, expiringSoon: rows.filter(doc => doc.expiresAt && new Date(doc.expiresAt).getTime() >= now && new Date(doc.expiresAt).getTime() <= soon).length, categories: new Set(rows.map(doc => doc.category)).size } };
}

export async function createDocumentMetadataForCompany(input: { companyId: number; userId: number; title: string; category: string; fileKey: string; fileUrl: string; mimeType: string; propertyId?: number | null; unitId?: number | null; expiresAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscription(input.companyId, input.userId);
  if (!input.fileKey.startsWith(`${input.companyId}/`)) throw new Error("DOCUMENT_KEY_INVALID");
  await assertDocumentRelationsForCompany(input.companyId, input.propertyId, input.unitId);
  const result = await db.insert(documents).values({ companyId: input.companyId, propertyId: input.propertyId ?? null, unitId: input.unitId ?? null, title: input.title.trim(), category: input.category.trim(), fileKey: input.fileKey, fileUrl: input.fileUrl, mimeType: input.mimeType, expiresAt: input.expiresAt ?? null, uploadedByUserId: input.userId });
  const [created] = await db.select().from(documents).where(and(eq(documents.id, Number(result[0].insertId)), eq(documents.companyId, input.companyId))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  await recordCompanyResourceRevision({ companyId: input.companyId, actorUserId: input.userId, resourceType: "document", resourceId: created.id, operation: "created", summary: `Created document ${created.title}`, afterSnapshot: created, metadata: { category: created.category, versionNumber: created.versionNumber } });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "document.created", resourceType: "document", resourceId: created.id, metadata: { category: input.category.trim() } });
  return created;
}

async function assertDocumentRelationsForCompany(companyId: number, propertyId?: number | null, unitId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  if (propertyId) {
    const [property] = await db.select({ id: properties.id }).from(properties).where(and(eq(properties.id, propertyId), eq(properties.companyId, companyId))).limit(1);
    if (!property) throw new Error("PROPERTY_ACCESS_REQUIRED");
  }
  if (unitId) {
    const [unit] = await db.select({ id: units.id }).from(units).where(and(eq(units.id, unitId), eq(units.companyId, companyId))).limit(1);
    if (!unit) throw new Error("UNIT_ACCESS_REQUIRED");
  }
}

export async function updateDocumentMetadataForCompany(input: { companyId: number; userId: number; documentId: number; title: string; category: string; propertyId?: number | null; unitId?: number | null; expiresAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscription(input.companyId, input.userId);
  await assertDocumentRelationsForCompany(input.companyId, input.propertyId, input.unitId);
  const [existing] = await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.companyId, input.companyId))).limit(1);
  if (!existing) throw new Error("DOCUMENT_ACCESS_REQUIRED");
  await db.update(documents).set({ title: input.title.trim(), category: input.category.trim(), propertyId: input.propertyId ?? null, unitId: input.unitId ?? null, expiresAt: input.expiresAt ?? null }).where(and(eq(documents.id, input.documentId), eq(documents.companyId, input.companyId)));
  const [updated] = await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.companyId, input.companyId))).limit(1);
  if (!updated) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyResourceRevision({ companyId: input.companyId, actorUserId: input.userId, resourceType: "document", resourceId: input.documentId, operation: "updated", summary: `Updated document metadata for ${updated.title}`, beforeSnapshot: existing, afterSnapshot: updated, metadata: { category: updated.category } });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "document.metadata.updated", resourceType: "document", resourceId: input.documentId, metadata: { category: input.category.trim() } });
  return updated;
}

export async function replaceDocumentFileForCompany(input: { companyId: number; userId: number; documentId: number; fileKey: string; fileUrl: string; mimeType: string }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscription(input.companyId, input.userId);
  if (!input.fileKey.startsWith(`${input.companyId}/`)) throw new Error("DOCUMENT_KEY_INVALID");
  const [existing] = await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.companyId, input.companyId))).limit(1);
  if (!existing) throw new Error("DOCUMENT_ACCESS_REQUIRED");
  await db.update(documents).set({ fileKey: input.fileKey, fileUrl: input.fileUrl, mimeType: input.mimeType, versionNumber: existing.versionNumber + 1 }).where(and(eq(documents.id, input.documentId), eq(documents.companyId, input.companyId)));
  const [updated] = await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.companyId, input.companyId))).limit(1);
  if (!updated) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyResourceRevision({ companyId: input.companyId, actorUserId: input.userId, resourceType: "document", resourceId: input.documentId, operation: "replaced", summary: `Replaced file for document ${updated.title}`, beforeSnapshot: existing, afterSnapshot: updated, metadata: { previousVersion: existing.versionNumber, versionNumber: updated.versionNumber } });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "document.file.replaced", resourceType: "document", resourceId: input.documentId, metadata: { version: existing.versionNumber + 1 } });
  return updated;
}

export async function removeDocumentForCompany(input: { companyId: number; userId: number; documentId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscription(input.companyId, input.userId);
  const [existing] = await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.companyId, input.companyId))).limit(1);
  if (!existing) throw new Error("DOCUMENT_ACCESS_REQUIRED");
  await db.delete(documents).where(and(eq(documents.id, input.documentId), eq(documents.companyId, input.companyId)));
  await recordCompanyResourceRevision({ companyId: input.companyId, actorUserId: input.userId, resourceType: "document", resourceId: input.documentId, operation: "deleted", summary: `Removed document ${existing.title}`, beforeSnapshot: existing, metadata: { category: existing.category, versionNumber: existing.versionNumber } });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "document.removed", resourceType: "document", resourceId: input.documentId, metadata: { category: existing.category } });
  return { documentId: input.documentId };
}

export async function getDocumentFileForCompany(input: { companyId: number; documentId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [document] = await db.select().from(documents).where(and(eq(documents.id, input.documentId), eq(documents.companyId, input.companyId))).limit(1);
  if (!document) throw new Error("DOCUMENT_ACCESS_REQUIRED");
  return document;
}

export async function getOperationsCenterForCompany(companyId: number) {
  const db = await getDb();
  if (!db) return { vendors: [], workOrders: [], summary: { open: 0, urgent: 0, overdue: 0, activeVendors: 0 } };
  const [vendorRows, orderRows] = await Promise.all([
    db.select().from(vendors).where(and(eq(vendors.companyId, companyId), eq(vendors.status, "active"))).orderBy(desc(vendors.createdAt)),
    db.select().from(workOrders).where(eq(workOrders.companyId, companyId)).orderBy(desc(workOrders.updatedAt)),
  ]);
  const now = Date.now();
  return { vendors: vendorRows, workOrders: orderRows, summary: { open: orderRows.filter(order => !["resolved", "closed"].includes(order.status)).length, urgent: orderRows.filter(order => order.priority === "urgent" && !["resolved", "closed"].includes(order.status)).length, overdue: orderRows.filter(order => order.dueAt && new Date(order.dueAt).getTime() < now && !["resolved", "closed"].includes(order.status)).length, activeVendors: vendorRows.length } };
}

export async function createVendorForCompany(input: { companyId: number; userId: number; name: string; phone?: string; email?: string; specialty?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "properties");
  const result = await db.insert(vendors).values({ companyId: input.companyId, name: input.name.trim(), phone: input.phone?.trim() || null, email: input.email?.trim().toLowerCase() || null, specialty: input.specialty?.trim() || null, createdByUserId: input.userId });
  const [created] = await db.select().from(vendors).where(and(eq(vendors.id, Number(result[0].insertId)), eq(vendors.companyId, input.companyId))).limit(1);
  return created;
}

export async function createWorkOrderForCompany(input: { companyId: number; userId: number; buildingId?: number | null; unitId?: number | null; tenantId?: number | null; vendorId?: number | null; title: string; priority?: "low" | "medium" | "high" | "urgent"; slaHours?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "tasks");
  if (input.unitId) { const [unit] = await db.select({ id: units.id }).from(units).where(and(eq(units.id, input.unitId), eq(units.companyId, input.companyId))).limit(1); if (!unit) throw new Error("UNIT_ACCESS_REQUIRED"); }
  if (input.tenantId) { const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(and(eq(tenants.id, input.tenantId), eq(tenants.companyId, input.companyId))).limit(1); if (!tenant) throw new Error("TENANT_ACCESS_REQUIRED"); }
  if (input.vendorId) { const [vendor] = await db.select({ id: vendors.id }).from(vendors).where(and(eq(vendors.id, input.vendorId), eq(vendors.companyId, input.companyId), eq(vendors.status, "active"))).limit(1); if (!vendor) throw new Error("VENDOR_ACCESS_REQUIRED"); }
  const dueAt = new Date(Date.now() + (input.slaHours ?? 48) * 3600000);
  const result = await db.insert(workOrders).values({ companyId: input.companyId, buildingId: input.buildingId ?? null, unitId: input.unitId ?? null, tenantId: input.tenantId ?? null, vendorId: input.vendorId ?? null, title: input.title.trim(), priority: input.priority ?? "medium", slaHours: input.slaHours ?? 48, dueAt, createdByUserId: input.userId });
  const [created] = await db.select().from(workOrders).where(and(eq(workOrders.id, Number(result[0].insertId)), eq(workOrders.companyId, input.companyId))).limit(1);
  return created;
}

export async function updateWorkOrderForCompany(input: { companyId: number; userId: number; workOrderId: number; status?: "open" | "assigned" | "in_progress" | "resolved" | "closed"; vendorId?: number | null; estimatedCostIls?: number | null; actualCostIls?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "tasks");
  const [existing] = await db.select({ id: workOrders.id }).from(workOrders).where(and(eq(workOrders.id, input.workOrderId), eq(workOrders.companyId, input.companyId))).limit(1);
  if (!existing) throw new Error("WORK_ORDER_ACCESS_REQUIRED");
  if (input.vendorId) {
    const [vendor] = await db.select({ id: vendors.id }).from(vendors).where(and(eq(vendors.id, input.vendorId), eq(vendors.companyId, input.companyId), eq(vendors.status, "active"))).limit(1);
    if (!vendor) throw new Error("VENDOR_ACCESS_REQUIRED");
  }
  const resolved = input.status === "resolved" || input.status === "closed";
  await db.update(workOrders).set({
    status: input.status,
    vendorId: input.vendorId,
    estimatedCostIls: input.estimatedCostIls,
    actualCostIls: input.actualCostIls,
    resolvedAt: resolved ? new Date() : undefined,
  }).where(and(eq(workOrders.id, input.workOrderId), eq(workOrders.companyId, input.companyId)));
  const [updated] = await db.select().from(workOrders).where(and(eq(workOrders.id, input.workOrderId), eq(workOrders.companyId, input.companyId))).limit(1);
  return updated;
}

export async function getFinanceCenterForCompany(companyId: number) {
  const db = await getDb();
  if (!db) return { recurringCharges: [], expenses: [], collections: [], summary: { monthlyExpectedIls: 0, expensesThisMonthIls: 0, approvedExpensesIls: 0, arrearsRiskIls: 0 } };
  await markOverdueCollections(companyId);
  const [charges, expenseRows, collectionRows] = await Promise.all([
    db.select().from(recurringCharges).where(and(eq(recurringCharges.companyId, companyId), eq(recurringCharges.status, "active"))).orderBy(desc(recurringCharges.createdAt)),
    db.select().from(expenses).where(eq(expenses.companyId, companyId)).orderBy(desc(expenses.expenseDate)),
    db.select().from(leaseCollections).where(eq(leaseCollections.companyId, companyId)).orderBy(desc(leaseCollections.dueAt)),
  ]);
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const expensesThisMonthIls = expenseRows.filter(expense => new Date(expense.expenseDate).getTime() >= start.getTime()).reduce((sum, expense) => sum + expense.amountIls, 0);
  const approvedExpensesIls = expenseRows.filter(expense => expense.status === "approved").reduce((sum, expense) => sum + expense.amountIls, 0);
  const monthlyExpectedIls = charges.reduce((sum, charge) => sum + charge.amountIls, 0);
  const arrearsRiskIls = collectionRows.filter(collection => collection.status === "overdue").reduce((sum, collection) => sum + Math.max(0, collection.amountDueIls - collection.amountReceivedIls), 0);
  return { recurringCharges: charges, expenses: expenseRows, collections: collectionRows, summary: { monthlyExpectedIls, expensesThisMonthIls, approvedExpensesIls, arrearsRiskIls } };
}

type CompanyNotificationPriority = "high" | "medium" | "low";
type CompanyNotificationKind = "task_overdue" | "collection_overdue" | "lease_expiring" | "work_order_overdue" | "work_order_urgent" | "document_expiring";

type CompanyNotification = {
  key: string;
  kind: CompanyNotificationKind;
  priority: CompanyNotificationPriority;
  href: "/workspace/action-center" | "/workspace/collections" | "/workspace/leases" | "/workspace/work-orders" | "/workspace/documents";
  subject: string;
  dueAt: Date | null;
  amountIls: number | null;
  readAt: Date | null;
};

export async function getCompanyNotificationsForUser(input: { companyId: number; userId: number }) {
  await assertCompanySubscription(input.companyId, input.userId);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");

  await markOverdueCollections(input.companyId);
  const now = Date.now();
  const expiringWindow = now + 30 * 24 * 60 * 60 * 1000;
  const [taskRows, collectionRows, leaseRows, workOrderRows, documentRows, readRows] = await Promise.all([
    db.select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt, status: tasks.status }).from(tasks).where(eq(tasks.companyId, input.companyId)).orderBy(desc(tasks.dueAt)),
    db.select({ id: leaseCollections.id, periodLabel: leaseCollections.periodLabel, dueAt: leaseCollections.dueAt, amountDueIls: leaseCollections.amountDueIls, amountReceivedIls: leaseCollections.amountReceivedIls, status: leaseCollections.status }).from(leaseCollections).where(eq(leaseCollections.companyId, input.companyId)).orderBy(desc(leaseCollections.dueAt)),
    db.select({ id: leases.id, reference: leases.reference, endAt: leases.endAt, status: leases.status }).from(leases).where(eq(leases.companyId, input.companyId)).orderBy(leases.endAt),
    db.select({ id: workOrders.id, title: workOrders.title, priority: workOrders.priority, dueAt: workOrders.dueAt, status: workOrders.status }).from(workOrders).where(eq(workOrders.companyId, input.companyId)).orderBy(desc(workOrders.updatedAt)),
    db.select({ id: documents.id, title: documents.title, expiresAt: documents.expiresAt }).from(documents).where(eq(documents.companyId, input.companyId)).orderBy(documents.expiresAt),
    db.select({ notificationKey: companyNotificationReads.notificationKey, readAt: companyNotificationReads.readAt }).from(companyNotificationReads).where(and(eq(companyNotificationReads.companyId, input.companyId), eq(companyNotificationReads.userId, input.userId))),
  ]);
  const readByKey = new Map(readRows.map(row => [row.notificationKey, row.readAt]));
  const notifications: CompanyNotification[] = [];
  const add = (notification: Omit<CompanyNotification, "readAt">) => notifications.push({ ...notification, readAt: readByKey.get(notification.key) ?? null });

  taskRows.filter(task => task.dueAt && new Date(task.dueAt).getTime() < now && task.status !== "done").forEach(task => add({ key: `task-overdue-${task.id}`, kind: "task_overdue", priority: "high", href: "/workspace/action-center", subject: task.title, dueAt: task.dueAt, amountIls: null }));
  collectionRows.filter(collection => collection.dueAt && new Date(collection.dueAt).getTime() < now && ["due", "partial", "overdue"].includes(collection.status)).forEach(collection => add({ key: `collection-overdue-${collection.id}`, kind: "collection_overdue", priority: "high", href: "/workspace/collections", subject: collection.periodLabel, dueAt: collection.dueAt, amountIls: Math.max(collection.amountDueIls - collection.amountReceivedIls, 0) }));
  leaseRows.filter(lease => ["active", "notice"].includes(lease.status) && new Date(lease.endAt).getTime() >= now && new Date(lease.endAt).getTime() <= expiringWindow).forEach(lease => add({ key: `lease-expiring-${lease.id}`, kind: "lease_expiring", priority: "medium", href: "/workspace/leases", subject: lease.reference, dueAt: lease.endAt, amountIls: null }));
  workOrderRows.filter(order => !["resolved", "closed"].includes(order.status)).forEach(order => {
    const isOverdue = order.dueAt && new Date(order.dueAt).getTime() < now;
    if (isOverdue) add({ key: `work-order-overdue-${order.id}`, kind: "work_order_overdue", priority: "high", href: "/workspace/work-orders", subject: order.title, dueAt: order.dueAt, amountIls: null });
    else if (order.priority === "urgent") add({ key: `work-order-urgent-${order.id}`, kind: "work_order_urgent", priority: "medium", href: "/workspace/work-orders", subject: order.title, dueAt: order.dueAt, amountIls: null });
  });
  documentRows.filter(document => document.expiresAt && new Date(document.expiresAt).getTime() >= now && new Date(document.expiresAt).getTime() <= expiringWindow).forEach(document => add({ key: `document-expiring-${document.id}`, kind: "document_expiring", priority: "low", href: "/workspace/documents", subject: document.title, dueAt: document.expiresAt, amountIls: null }));

  const priorityRank: Record<CompanyNotificationPriority, number> = { high: 0, medium: 1, low: 2 };
  const items = notifications.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0)).slice(0, 100);
  return { items, unreadCount: items.filter(item => !item.readAt).length };
}

export async function markCompanyNotificationsRead(input: { companyId: number; userId: number; notificationKeys?: string[]; markAll?: boolean }) {
  await assertCompanySubscription(input.companyId, input.userId);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const feed = await getCompanyNotificationsForUser({ companyId: input.companyId, userId: input.userId });
  const requestedKeys = input.markAll ? feed.items.map(item => item.key) : Array.from(new Set(input.notificationKeys ?? []));
  if (requestedKeys.length === 0) return { markedCount: 0 };
  if (requestedKeys.length > 100 || requestedKeys.some(key => !feed.items.some(item => item.key === key))) throw new Error("NOTIFICATION_ACCESS_REQUIRED");
  const readAt = new Date();
  await db.insert(companyNotificationReads).values(requestedKeys.map(notificationKey => ({ companyId: input.companyId, userId: input.userId, notificationKey, readAt }))).onDuplicateKeyUpdate({ set: { readAt } });
  return { markedCount: requestedKeys.length };
}

export async function createRecurringChargeForCompany(input: { companyId: number; userId: number; unitId?: number | null; tenantId?: number | null; description: string; amountIls: number; dueDay?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "properties");
  if (input.amountIls <= 0 || input.dueDay && (input.dueDay < 1 || input.dueDay > 28)) throw new Error("INVALID_CHARGE");
  if (input.unitId) { const [unit] = await db.select({ id: units.id }).from(units).where(and(eq(units.id, input.unitId), eq(units.companyId, input.companyId))).limit(1); if (!unit) throw new Error("UNIT_ACCESS_REQUIRED"); }
  const result = await db.insert(recurringCharges).values({ companyId: input.companyId, unitId: input.unitId ?? null, tenantId: input.tenantId ?? null, description: input.description.trim(), amountIls: input.amountIls, dueDay: input.dueDay ?? 1, createdByUserId: input.userId });
  const [created] = await db.select().from(recurringCharges).where(and(eq(recurringCharges.id, Number(result[0].insertId)), eq(recurringCharges.companyId, input.companyId))).limit(1);
  return created;
}

export async function createExpenseForCompany(input: { companyId: number; userId: number; buildingId?: number | null; category: string; description: string; amountIls: number; expenseDate: Date; status?: "planned" | "approved" | "paid" }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "properties");
  if (input.amountIls <= 0) throw new Error("INVALID_EXPENSE");
  if (input.buildingId) { const [building] = await db.select({ id: buildings.id }).from(buildings).where(and(eq(buildings.id, input.buildingId), eq(buildings.companyId, input.companyId))).limit(1); if (!building) throw new Error("BUILDING_ACCESS_REQUIRED"); }
  const result = await db.insert(expenses).values({ companyId: input.companyId, buildingId: input.buildingId ?? null, category: input.category.trim(), description: input.description.trim(), amountIls: input.amountIls, expenseDate: input.expenseDate, status: input.status ?? "planned", createdByUserId: input.userId });
  const [created] = await db.select().from(expenses).where(and(eq(expenses.id, Number(result[0].insertId)), eq(expenses.companyId, input.companyId))).limit(1);
  return created;
}

export async function createPropertyForCompany(input: { companyId: number; userId: number; name: string; address?: string | null; status?: "active" | "vacant" | "maintenance"; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "properties");
  const result = await db.insert(properties).values({ companyId: input.companyId, name: input.name.trim(), address: input.address?.trim() || null, status: input.status ?? "active", notes: input.notes?.trim() || null, createdByUserId: input.userId });
  const [created] = await db.select().from(properties).where(and(eq(properties.id, Number(result[0].insertId)), eq(properties.companyId, input.companyId))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "property.created", resourceType: "property", resourceId: created.id });
  return created;
}

export async function updatePropertyForCompany(input: { companyId: number; userId: number; id: number; name: string; address?: string | null; status: "active" | "vacant" | "maintenance"; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.update(properties).set({ name: input.name.trim(), address: input.address?.trim() || null, status: input.status, notes: input.notes?.trim() || null }).where(and(eq(properties.id, input.id), eq(properties.companyId, input.companyId)));
  const [updated] = await db.select().from(properties).where(and(eq(properties.id, input.id), eq(properties.companyId, input.companyId))).limit(1);
  if (!updated) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "property.updated", resourceType: "property", resourceId: input.id });
  return updated;
}

export async function deletePropertyForCompany(input: { companyId: number; userId: number; id: number }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.delete(properties).where(and(eq(properties.id, input.id), eq(properties.companyId, input.companyId)));
  if (Number(result[0]?.affectedRows ?? 0) < 1) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "property.deleted", resourceType: "property", resourceId: input.id });
  return { success: true } as const;
}

export async function listClientsForCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).where(eq(clients.companyId, companyId)).orderBy(desc(clients.createdAt));
}

export async function createClientForCompany(input: { companyId: number; userId: number; name: string; email?: string | null; phone?: string | null; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "clients");
  const result = await db.insert(clients).values({ companyId: input.companyId, name: input.name.trim(), email: input.email?.trim().toLowerCase() || null, phone: input.phone?.trim() || null, notes: input.notes?.trim() || null, createdByUserId: input.userId });
  const [created] = await db.select().from(clients).where(and(eq(clients.id, Number(result[0].insertId)), eq(clients.companyId, input.companyId))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "client.created", resourceType: "client", resourceId: created.id });
  return created;
}

export async function updateClientForCompany(input: { companyId: number; userId: number; id: number; name: string; email?: string | null; phone?: string | null; notes?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.update(clients).set({ name: input.name.trim(), email: input.email?.trim().toLowerCase() || null, phone: input.phone?.trim() || null, notes: input.notes?.trim() || null }).where(and(eq(clients.id, input.id), eq(clients.companyId, input.companyId)));
  const [updated] = await db.select().from(clients).where(and(eq(clients.id, input.id), eq(clients.companyId, input.companyId))).limit(1);
  if (!updated) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "client.updated", resourceType: "client", resourceId: input.id });
  return updated;
}

export async function deleteClientForCompany(input: { companyId: number; userId: number; id: number }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.delete(clients).where(and(eq(clients.id, input.id), eq(clients.companyId, input.companyId)));
  if (Number(result[0]?.affectedRows ?? 0) < 1) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "client.deleted", resourceType: "client", resourceId: input.id });
  return { success: true } as const;
}

export async function listTasksForCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.companyId, companyId)).orderBy(desc(tasks.createdAt));
}

export async function createTaskForCompany(input: { companyId: number; userId: number; title: string; description?: string | null; status?: "todo" | "in_progress" | "done"; dueAt?: Date | null; assignedToUserId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await assertCompanySubscriptionAndQuota(input.companyId, input.userId, "tasks");
  const result = await db.insert(tasks).values({ companyId: input.companyId, title: input.title.trim(), description: input.description?.trim() || null, status: input.status ?? "todo", dueAt: input.dueAt ?? null, assignedToUserId: input.assignedToUserId ?? null, createdByUserId: input.userId });
  const [created] = await db.select().from(tasks).where(and(eq(tasks.id, Number(result[0].insertId)), eq(tasks.companyId, input.companyId))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "task.created", resourceType: "task", resourceId: created.id });
  return created;
}

export async function updateTaskForCompany(input: { companyId: number; userId: number; id: number; title: string; description?: string | null; status: "todo" | "in_progress" | "done"; dueAt?: Date | null; assignedToUserId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.update(tasks).set({ title: input.title.trim(), description: input.description?.trim() || null, status: input.status, dueAt: input.dueAt ?? null, assignedToUserId: input.assignedToUserId ?? null }).where(and(eq(tasks.id, input.id), eq(tasks.companyId, input.companyId)));
  const [updated] = await db.select().from(tasks).where(and(eq(tasks.id, input.id), eq(tasks.companyId, input.companyId))).limit(1);
  if (!updated) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "task.updated", resourceType: "task", resourceId: input.id });
  return updated;
}

export async function deleteTaskForCompany(input: { companyId: number; userId: number; id: number }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.delete(tasks).where(and(eq(tasks.id, input.id), eq(tasks.companyId, input.companyId)));
  if (Number(result[0]?.affectedRows ?? 0) < 1) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "task.deleted", resourceType: "task", resourceId: input.id });
  return { success: true } as const;
}


export type LegacyResourceKind = "tenants" | "maintenance";

async function assertCompanyOperationalAccess(companyId: number, userId: number, write = false) {
  const membership = await getCompanyMembershipForCompany(companyId, userId);
  if (!membership) throw new Error("COMPANY_ACCESS_REQUIRED");
  const subscription = await getCompanySubscription(companyId);
  if (!hasActiveSubscription(subscription)) throw new Error("ACTIVE_SUBSCRIPTION_REQUIRED");
  if (write && !["owner", "admin", "manager", "member"].includes(membership.member.role)) throw new Error("COMPANY_WRITE_REQUIRED");
  return { membership, subscription };
}

export async function getLegacyOperationalSnapshot(companyId: number, userId: number) {
  await assertCompanyOperationalAccess(companyId, userId);
  const db = await getDb();
  if (!db) return { tenants: 0, activeTenants: 0, contracts: 0, activeContracts: 0, openMaintenance: 0, paymentsPending: 0, paymentsCollectedIls: 0 };
  const [tenantRows, activeTenantRows, contractRows, activeContractRows, openMaintenanceRows, pendingPaymentRows, collectedRows] = await Promise.all([
    db.select({ total: count() }).from(tenants).where(eq(tenants.companyId, companyId)),
    db.select({ total: count() }).from(tenants).where(and(eq(tenants.companyId, companyId), eq(tenants.status, "active"))),
    db.select({ total: count() }).from(contracts).where(eq(contracts.companyId, companyId)),
    db.select({ total: count() }).from(contracts).where(and(eq(contracts.companyId, companyId), eq(contracts.status, "active"))),
    db.select({ total: count() }).from(maintenance).where(and(eq(maintenance.companyId, companyId), inArray(maintenance.status, ["open", "in_progress"]))),
    db.select({ total: count() }).from(operationalPayments).where(and(eq(operationalPayments.companyId, companyId), inArray(operationalPayments.status, ["pending", "overdue"]))),
    db.select({ total: count() }).from(operationalPayments).where(and(eq(operationalPayments.companyId, companyId), eq(operationalPayments.status, "paid"))),
  ]);
  const paidRows = await db.select({ amount: operationalPayments.amountIls }).from(operationalPayments).where(and(eq(operationalPayments.companyId, companyId), eq(operationalPayments.status, "paid")));
  return { tenants: Number(tenantRows[0]?.total ?? 0), activeTenants: Number(activeTenantRows[0]?.total ?? 0), contracts: Number(contractRows[0]?.total ?? 0), activeContracts: Number(activeContractRows[0]?.total ?? 0), openMaintenance: Number(openMaintenanceRows[0]?.total ?? 0), paymentsPending: Number(pendingPaymentRows[0]?.total ?? 0), paymentsCollectedIls: paidRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0) };
}

export async function listTenantsForCompany(companyId: number, userId: number) { await assertCompanyOperationalAccess(companyId, userId); const db = await getDb(); if (!db) return []; return db.select().from(tenants).where(eq(tenants.companyId, companyId)).orderBy(desc(tenants.createdAt)); }
export async function createTenantForCompany(input: { companyId: number; userId: number; name: string; email?: string | null; phone?: string | null; propertyId?: number | null; status?: "active" | "late" | "ended"; notes?: string | null }) { await assertCompanyOperationalAccess(input.companyId, input.userId, true); await assertLinkedRecordsBelongToCompany(input.companyId, { propertyId: input.propertyId }); const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE"); const result = await db.insert(tenants).values({ companyId: input.companyId, name: input.name.trim(), email: input.email?.trim().toLowerCase() || null, phone: input.phone?.trim() || null, propertyId: input.propertyId ?? null, status: input.status ?? "active", notes: input.notes?.trim() || null, createdByUserId: input.userId }); const [created] = await db.select().from(tenants).where(and(eq(tenants.companyId, input.companyId), eq(tenants.id, Number(result[0].insertId)))).limit(1); if (!created) throw new Error("RESOURCE_CREATE_FAILED"); await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "tenant.created", resourceType: "tenant", resourceId: created.id }); return created; }
export async function updateTenantForCompany(input: { companyId: number; userId: number; id: number; name: string; email?: string | null; phone?: string | null; propertyId?: number | null; status: "active" | "late" | "ended"; notes?: string | null }) { await assertCompanyOperationalAccess(input.companyId, input.userId, true); await assertLinkedRecordsBelongToCompany(input.companyId, { propertyId: input.propertyId }); const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE"); await db.update(tenants).set({ name: input.name.trim(), email: input.email?.trim().toLowerCase() || null, phone: input.phone?.trim() || null, propertyId: input.propertyId ?? null, status: input.status, notes: input.notes?.trim() || null }).where(and(eq(tenants.companyId, input.companyId), eq(tenants.id, input.id))); const [updated] = await db.select().from(tenants).where(and(eq(tenants.companyId, input.companyId), eq(tenants.id, input.id))).limit(1); if (!updated) throw new Error("RESOURCE_NOT_FOUND"); await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "tenant.updated", resourceType: "tenant", resourceId: input.id }); return updated; }
export async function deleteTenantForCompany(input: { companyId: number; userId: number; id: number }) { await assertCompanyOperationalAccess(input.companyId, input.userId, true); const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE"); const result = await db.delete(tenants).where(and(eq(tenants.companyId, input.companyId), eq(tenants.id, input.id))); if (Number(result[0]?.affectedRows ?? 0) < 1) throw new Error("RESOURCE_NOT_FOUND"); await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "tenant.deleted", resourceType: "tenant", resourceId: input.id }); return { success: true } as const; }

export async function listMaintenanceForCompany(companyId: number, userId: number) { await assertCompanyOperationalAccess(companyId, userId); const db = await getDb(); if (!db) return []; return db.select().from(maintenance).where(eq(maintenance.companyId, companyId)).orderBy(desc(maintenance.createdAt)); }
export async function createMaintenanceForCompany(input: { companyId: number; userId: number; title: string; description?: string | null; propertyId?: number | null; priority?: "low" | "medium" | "high" | "urgent"; status?: "open" | "in_progress" | "completed" | "cancelled"; scheduledAt?: Date | null; costIls?: number }) { await assertCompanyOperationalAccess(input.companyId, input.userId, true); await assertLinkedRecordsBelongToCompany(input.companyId, { propertyId: input.propertyId }); const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE"); const result = await db.insert(maintenance).values({ companyId: input.companyId, title: input.title.trim(), description: input.description?.trim() || null, propertyId: input.propertyId ?? null, priority: input.priority ?? "medium", status: input.status ?? "open", scheduledAt: input.scheduledAt ?? null, costIls: input.costIls ?? 0, createdByUserId: input.userId }); const [created] = await db.select().from(maintenance).where(and(eq(maintenance.companyId, input.companyId), eq(maintenance.id, Number(result[0].insertId)))).limit(1); if (!created) throw new Error("RESOURCE_CREATE_FAILED"); await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "maintenance.created", resourceType: "maintenance", resourceId: created.id }); return created; }
export async function updateMaintenanceForCompany(input: { companyId: number; userId: number; id: number; title: string; description?: string | null; propertyId?: number | null; priority: "low" | "medium" | "high" | "urgent"; status: "open" | "in_progress" | "completed" | "cancelled"; scheduledAt?: Date | null; costIls?: number }) { await assertCompanyOperationalAccess(input.companyId, input.userId, true); await assertLinkedRecordsBelongToCompany(input.companyId, { propertyId: input.propertyId }); const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE"); await db.update(maintenance).set({ title: input.title.trim(), description: input.description?.trim() || null, propertyId: input.propertyId ?? null, priority: input.priority, status: input.status, scheduledAt: input.scheduledAt ?? null, costIls: input.costIls ?? 0 }).where(and(eq(maintenance.companyId, input.companyId), eq(maintenance.id, input.id))); const [updated] = await db.select().from(maintenance).where(and(eq(maintenance.companyId, input.companyId), eq(maintenance.id, input.id))).limit(1); if (!updated) throw new Error("RESOURCE_NOT_FOUND"); await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "maintenance.updated", resourceType: "maintenance", resourceId: input.id }); return updated; }
export async function deleteMaintenanceForCompany(input: { companyId: number; userId: number; id: number }) { await assertCompanyOperationalAccess(input.companyId, input.userId, true); const db = await getDb(); if (!db) throw new Error("DATABASE_UNAVAILABLE"); const result = await db.delete(maintenance).where(and(eq(maintenance.companyId, input.companyId), eq(maintenance.id, input.id))); if (Number(result[0]?.affectedRows ?? 0) < 1) throw new Error("RESOURCE_NOT_FOUND"); await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "maintenance.deleted", resourceType: "maintenance", resourceId: input.id }); return { success: true } as const; }

export async function listContractsForCompany(companyId: number, userId: number) { await assertCompanyOperationalAccess(companyId, userId); const db = await getDb(); if (!db) return []; return db.select().from(contracts).where(eq(contracts.companyId, companyId)).orderBy(desc(contracts.endAt)); }
export async function listOperationalPaymentsForCompany(companyId: number, userId: number) { await assertCompanyOperationalAccess(companyId, userId); const db = await getDb(); if (!db) return []; return db.select().from(operationalPayments).where(eq(operationalPayments.companyId, companyId)).orderBy(desc(operationalPayments.createdAt)); }

export async function createContractForCompany(input: { companyId: number; userId: number; title: string; tenantId?: number | null; propertyId?: number | null; startAt: Date; endAt: Date; rentAmountIls?: number; status?: "active" | "expired" | "terminated"; notes?: string | null }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  await assertLinkedRecordsBelongToCompany(input.companyId, { propertyId: input.propertyId, tenantId: input.tenantId });
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.insert(contracts).values({ companyId: input.companyId, title: input.title.trim(), tenantId: input.tenantId ?? null, propertyId: input.propertyId ?? null, startAt: input.startAt, endAt: input.endAt, rentAmountIls: input.rentAmountIls ?? 0, status: input.status ?? "active", notes: input.notes?.trim() || null, createdByUserId: input.userId });
  const [created] = await db.select().from(contracts).where(and(eq(contracts.companyId, input.companyId), eq(contracts.id, Number(result[0].insertId)))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "contract.created", resourceType: "contract", resourceId: created.id });
  return created;
}

export async function updateContractForCompany(input: { companyId: number; userId: number; id: number; title: string; tenantId?: number | null; propertyId?: number | null; startAt: Date; endAt: Date; rentAmountIls?: number; status: "active" | "expired" | "terminated"; notes?: string | null }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  await assertLinkedRecordsBelongToCompany(input.companyId, { propertyId: input.propertyId, tenantId: input.tenantId });
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.update(contracts).set({ title: input.title.trim(), tenantId: input.tenantId ?? null, propertyId: input.propertyId ?? null, startAt: input.startAt, endAt: input.endAt, rentAmountIls: input.rentAmountIls ?? 0, status: input.status, notes: input.notes?.trim() || null }).where(and(eq(contracts.companyId, input.companyId), eq(contracts.id, input.id)));
  const [updated] = await db.select().from(contracts).where(and(eq(contracts.companyId, input.companyId), eq(contracts.id, input.id))).limit(1);
  if (!updated) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "contract.updated", resourceType: "contract", resourceId: input.id });
  return updated;
}

export async function deleteContractForCompany(input: { companyId: number; userId: number; id: number }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.delete(contracts).where(and(eq(contracts.companyId, input.companyId), eq(contracts.id, input.id)));
  if (Number(result[0]?.affectedRows ?? 0) < 1) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "contract.deleted", resourceType: "contract", resourceId: input.id });
  return { success: true } as const;
}

export async function createOperationalPaymentForCompany(input: { companyId: number; userId: number; tenantId?: number | null; contractId?: number | null; amountIls: number; method?: "cash" | "bank" | "card" | "transfer"; status?: "paid" | "pending" | "overdue"; paidAt?: Date | null; notes?: string | null }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  await assertLinkedRecordsBelongToCompany(input.companyId, { tenantId: input.tenantId, contractId: input.contractId });
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.insert(operationalPayments).values({ companyId: input.companyId, tenantId: input.tenantId ?? null, contractId: input.contractId ?? null, amountIls: input.amountIls, method: input.method ?? "bank", status: input.status ?? "pending", paidAt: input.paidAt ?? null, notes: input.notes?.trim() || null, createdByUserId: input.userId });
  const [created] = await db.select().from(operationalPayments).where(and(eq(operationalPayments.companyId, input.companyId), eq(operationalPayments.id, Number(result[0].insertId)))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "operational_payment.created", resourceType: "operational_payment", resourceId: created.id });
  return created;
}

export async function updateOperationalPaymentForCompany(input: { companyId: number; userId: number; id: number; tenantId?: number | null; contractId?: number | null; amountIls: number; method: "cash" | "bank" | "card" | "transfer"; status: "paid" | "pending" | "overdue"; paidAt?: Date | null; notes?: string | null }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  await assertLinkedRecordsBelongToCompany(input.companyId, { tenantId: input.tenantId, contractId: input.contractId });
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.update(operationalPayments).set({ tenantId: input.tenantId ?? null, contractId: input.contractId ?? null, amountIls: input.amountIls, method: input.method, status: input.status, paidAt: input.paidAt ?? null, notes: input.notes?.trim() || null }).where(and(eq(operationalPayments.companyId, input.companyId), eq(operationalPayments.id, input.id)));
  const [updated] = await db.select().from(operationalPayments).where(and(eq(operationalPayments.companyId, input.companyId), eq(operationalPayments.id, input.id))).limit(1);
  if (!updated) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "operational_payment.updated", resourceType: "operational_payment", resourceId: input.id });
  return updated;
}

export async function deleteOperationalPaymentForCompany(input: { companyId: number; userId: number; id: number }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.delete(operationalPayments).where(and(eq(operationalPayments.companyId, input.companyId), eq(operationalPayments.id, input.id)));
  if (Number(result[0]?.affectedRows ?? 0) < 1) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "operational_payment.deleted", resourceType: "operational_payment", resourceId: input.id });
  return { success: true } as const;
}


async function assertLinkedRecordsBelongToCompany(companyId: number, ids: { propertyId?: number | null; tenantId?: number | null; contractId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  if (ids.propertyId != null) {
    const [row] = await db.select({ id: properties.id }).from(properties).where(and(eq(properties.id, ids.propertyId), eq(properties.companyId, companyId))).limit(1);
    if (!row) throw new Error("PROPERTY_COMPANY_MISMATCH");
  }
  if (ids.tenantId != null) {
    const [row] = await db.select({ id: tenants.id }).from(tenants).where(and(eq(tenants.id, ids.tenantId), eq(tenants.companyId, companyId))).limit(1);
    if (!row) throw new Error("TENANT_COMPANY_MISMATCH");
  }
  if (ids.contractId != null) {
    const [row] = await db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.id, ids.contractId), eq(contracts.companyId, companyId))).limit(1);
    if (!row) throw new Error("CONTRACT_COMPANY_MISMATCH");
  }
}


export async function listAttendanceForCompany(companyId: number, userId: number, attendanceDate?: string) {
  await assertCompanyOperationalAccess(companyId, userId);
  const db = await getDb();
  if (!db) return [];
  const filters = attendanceDate
    ? and(eq(attendance.companyId, companyId), eq(attendance.attendanceDate, attendanceDate))
    : eq(attendance.companyId, companyId);
  return db.select().from(attendance).where(filters).orderBy(desc(attendance.attendanceDate), desc(attendance.createdAt));
}

export async function createAttendanceForCompany(input: {
  companyId: number;
  userId: number;
  attendanceUserId: number;
  attendanceDate: string;
  status: "present" | "absent" | "late" | "leave";
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
}) {
  const membership = await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const targetMembership = await getCompanyMembership(input.attendanceUserId);
  if (!targetMembership || targetMembership.company.id !== input.companyId) throw new Error("COMPANY_LINK_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.insert(attendance).values({
    companyId: input.companyId,
    userId: input.attendanceUserId,
    attendanceDate: input.attendanceDate,
    status: input.status,
    checkIn: input.checkIn?.trim() || null,
    checkOut: input.checkOut?.trim() || null,
    notes: input.notes?.trim() || null,
    createdByUserId: input.userId,
  });
  const [created] = await db.select().from(attendance).where(and(eq(attendance.companyId, input.companyId), eq(attendance.id, Number(result[0].insertId)))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "attendance.created", resourceType: "attendance", resourceId: created.id });
  return created;
}

export async function updateAttendanceForCompany(input: {
  companyId: number;
  userId: number;
  id: number;
  attendanceUserId: number;
  attendanceDate: string;
  status: "present" | "absent" | "late" | "leave";
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
}) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const targetMembership = await getCompanyMembership(input.attendanceUserId);
  if (!targetMembership || targetMembership.company.id !== input.companyId) throw new Error("COMPANY_LINK_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db.update(attendance).set({ userId: input.attendanceUserId, attendanceDate: input.attendanceDate, status: input.status, checkIn: input.checkIn?.trim() || null, checkOut: input.checkOut?.trim() || null, notes: input.notes?.trim() || null }).where(and(eq(attendance.companyId, input.companyId), eq(attendance.id, input.id)));
  const [updated] = await db.select().from(attendance).where(and(eq(attendance.companyId, input.companyId), eq(attendance.id, input.id))).limit(1);
  if (!updated) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "attendance.updated", resourceType: "attendance", resourceId: input.id });
  return updated;
}

export async function deleteAttendanceForCompany(input: { companyId: number; userId: number; id: number }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.delete(attendance).where(and(eq(attendance.companyId, input.companyId), eq(attendance.id, input.id)));
  if (Number(result[0]?.affectedRows ?? 0) < 1) throw new Error("RESOURCE_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "attendance.deleted", resourceType: "attendance", resourceId: input.id });
  return { success: true } as const;
}

type SalesImportKind = "properties" | "clients";
type SalesDiscountKind = "none" | "fixed" | "percentage";
type SalesPaymentFrequency = "quarterly" | "semiannual" | "annual";

function salesCellValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function salesInteger(value: unknown): number | null {
  const normalized = salesCellValue(value)?.replace(/[^0-9.-]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function salesPropertyStatus(value: string | null): "available" | "reserved" | "sold" | "inactive" {
  const normalized = value?.toLowerCase().trim() ?? "";
  if (["unsold", "available", "vacant", "متاح", "غير مباع", "זמין"].some(term => normalized.includes(term))) return "available";
  if (["sold", "completed", "مباع", "נמכר"].some(term => normalized.includes(term))) return "sold";
  if (["reserved", "contracted", "hold", "محجوز", "متعاقد", "שמור"].some(term => normalized.includes(term))) return "reserved";
  if (["inactive", "cancelled", "غير نشط", "לא פעיל"].some(term => normalized.includes(term))) return "inactive";
  return "available";
}

function salesNormalizedHeader(header: string) {
  return header.toLowerCase().replace(/[\s_\-./()]/g, "").trim();
}

export function getSalesImportRowValue(row: Record<string, unknown>, aliases: readonly string[]) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [salesNormalizedHeader(key), value]));
  for (const alias of aliases) {
    const value = normalized.get(salesNormalizedHeader(alias));
    const text = salesCellValue(value);
    if (text) return text;
  }
  return null;
}

const salesRowValue = getSalesImportRowValue;

export function salesImportedPropertyStatus(row: Record<string, unknown>) {
  const statusCode = salesRowValue(row, ["status_code", "status code", "رمز الحالة"]);
  const statusDescription = salesRowValue(row, ["status", "availability", "availability status", "الحالة", "סטטוס"]);
  return salesPropertyStatus(statusCode ?? statusDescription);
}

function parseSalesImportRows(fileBuffer: Buffer) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("IMPORT_SHEET_REQUIRED");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: null, raw: false });
  if (!rows.length) throw new Error("IMPORT_ROWS_REQUIRED");
  if (rows.length > 5000) throw new Error("IMPORT_ROW_LIMIT_EXCEEDED");
  return rows;
}

const SALES_IMPORT_SUMMARY_ALIASES = {
  properties: [
    ["project", "project_name", "project name", "development", "المشروع", "اسم المشروع", "פרויקט"],
    ["unit_number", "unit number", "unit no", "unit", "apartment", "flat", "رقم الوحدة", "الوحدة", "יחידה"],
    ["name", "property", "property_name", "property name", "unit", "اسم", "اسم العقار", "שם", "נכס"],
    ["owner", "owner_name", "owner name", "developer", "developer name", "المالك", "مالك", "اسم المالك", "باسم المالك", "בעלים", "יזם"],
    ["status", "status_code", "status code", "availability", "availability status", "الحالة", "رمز الحالة", "סטטוס"],
    ["address", "location", "building", "building name", "العنوان", "בניין", "כתובת"],
    ["type", "property_type", "property type", "unit_type", "unit type", "category", "النوع", "نوع الوحدة", "סוג"],
    ["floor", "floor_number", "floor no", "level", "طابق", "الدور", "קומה"],
    ["view", "view_description", "view description", "outlook", "إطلالة", "منظر", "وصف الإطلالة", "נוף", "תיאור נוף"],
    ["area", "area_sqm", "area sqm", "total_area", "total area", "net area", "sqm", "m2", "المساحة", "المساحة الكلية", "שטח"],
    ["price", "list_price", "list price", "price_ils", "sale_price", "sale price", "amount", "gross_amount", "gross amount", "السعر", "سعر البيع", "المبلغ", "מחיר", "סכום"],
  ],
  clients: [
    ["name", "full_name", "full name", "client", "client_name", "client name", "customer", "customer name", "اسم", "اسم العميل", "اسم العميل الكامل", "שם", "לקוח"],
    ["email", "e-mail", "mail", "email address", "البريد", "البريد الإلكتروني", "דואל"],
    ["phone", "phone number", "mobile", "mobile number", "telephone", "tel", "الهاتف", "رقم الهاتف", "التليفون", "رقم التليفون", "الجوال", "رقم الجوال", "טלפון", "מספר טלפון"],
    ["identity", "identity_number", "identity number", "id_number", "id number", "national id", "الهوية", "رقم الهوية", "תז"],
  ],
} as const;

export function summarizeSalesImportRows(kind: SalesImportKind, rows: Record<string, unknown>[]) {
  const sourceColumns = Array.from(new Set(rows.flatMap(row => Object.keys(row).map(key => key.trim()).filter(Boolean))));
  const aliases = SALES_IMPORT_SUMMARY_ALIASES[kind].flat();
  const mappedColumns = sourceColumns.filter(column => aliases.some(alias => salesNormalizedHeader(alias) === salesNormalizedHeader(column)));
  const retainedColumns = sourceColumns.filter(column => !mappedColumns.includes(column));
  const missingClientContactRows = kind === "clients"
    ? rows.filter(row => !salesRowValue(row, ["email", "e-mail", "mail", "email address", "البريد", "البريد الإلكتروني", "דואל"]) && !salesRowValue(row, ["phone", "phone number", "mobile", "mobile number", "telephone", "tel", "الهاتف", "رقم الهاتف", "التليفون", "رقم التليفون", "الجوال", "رقم الجوال", "טלפון", "מספר טלפון"])).length
    : 0;
  const missingContractPriceRows = kind === "properties"
    ? rows.filter(row => salesInteger(salesRowValue(row, ["price", "list_price", "list price", "price_ils", "sale_price", "sale price", "amount", "gross_amount", "gross amount", "السعر", "سعر البيع", "المبلغ", "מחיר", "סכום"])) === null).length
    : 0;
  return { sourceColumnCount: sourceColumns.length, mappedColumns, retainedColumns, missingClientContactRows, missingContractPriceRows };
}

export function prepareSalesImportRows(kind: SalesImportKind, rows: Record<string, unknown>[]) {
  let skippedBlankRows = 0;
  let skippedMissingNameRows = 0;
  const validRows = rows.filter(row => {
    const hasContent = Object.values(row).some(value => String(value ?? "").trim().length > 0);
    if (!hasContent) {
      skippedBlankRows += 1;
      return false;
    }
    const project = salesRowValue(row, ["project", "project_name", "project name", "development", "المشروع", "اسم المشروع", "פרויקט"]);
    const unitNumber = salesRowValue(row, ["unit_number", "unit number", "unit no", "unit", "apartment", "flat", "رقم الوحدة", "الوحدة", "יחידה"]);
    const name = kind === "properties"
      ? unitNumber ? [project, unitNumber].filter(Boolean).join(" · ") : salesRowValue(row, ["name", "property", "property_name", "property name", "unit", "اسم", "اسم العقار", "שם", "נכס"])
      : salesRowValue(row, ["name", "full_name", "full name", "client", "client_name", "client name", "customer", "customer name", "اسم", "اسم العميل", "اسم العميل الكامل", "שם", "לקוח"]);
    if (!name) {
      skippedMissingNameRows += 1;
      return false;
    }
    return true;
  });
  return { validRows, skippedBlankRows, skippedMissingNameRows };
}

export async function listSalesCenterForCompany(companyId: number, userId: number) {
  const access = await getSalesTeamAccess(companyId, userId);
  const db = await getDb();
  if (!db) return { batches: [], properties: [], clients: [], contracts: [], installments: [] };
  if (!access.canManage) {
    const assignments = access.salesMember
      ? await db.select().from(salesAssignments).where(and(
        eq(salesAssignments.companyId, companyId),
        eq(salesAssignments.salesTeamMemberId, access.salesMember.id),
        eq(salesAssignments.status, "active")
      ))
      : [];
    const propertyIds = Array.from(new Set(assignments.map(assignment => assignment.salesPropertyId).filter((id): id is number => id != null)));
    const clientIds = Array.from(new Set(assignments.map(assignment => assignment.salesClientId).filter((id): id is number => id != null)));
    const [properties, clients, propertyContracts, clientContracts] = await Promise.all([
      db.select().from(salesProperties).where(eq(salesProperties.companyId, companyId)).orderBy(desc(salesProperties.updatedAt)),
      clientIds.length
        ? db.select().from(salesClients).where(and(eq(salesClients.companyId, companyId), inArray(salesClients.id, clientIds))).orderBy(desc(salesClients.updatedAt))
        : Promise.resolve([]),
      db.select().from(salesContracts).where(eq(salesContracts.companyId, companyId)).orderBy(desc(salesContracts.createdAt)),
      clientIds.length
        ? db.select().from(salesContracts).where(and(eq(salesContracts.companyId, companyId), inArray(salesContracts.salesClientId, clientIds))).orderBy(desc(salesContracts.createdAt))
        : Promise.resolve([]),
    ]);
    const contractsById = new Map<number, typeof salesContracts.$inferSelect>();
    propertyContracts.forEach(contract => contractsById.set(contract.id, contract));
    clientContracts.forEach(contract => contractsById.set(contract.id, contract));
    const contracts = Array.from(contractsById.values())
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
    const contractIds = contracts.map(contract => contract.id);
    const installments = contractIds.length
      ? await db.select().from(salesInstallments).where(and(eq(salesInstallments.companyId, companyId), inArray(salesInstallments.salesContractId, contractIds))).orderBy(salesInstallments.salesContractId, salesInstallments.sequenceNumber)
      : [];
    return { batches: [], properties, clients, contracts, installments };
  }
  const [batches, salesPropertyRows, salesClientRows, contractRows] = await Promise.all([
    db.select().from(salesImportBatches).where(eq(salesImportBatches.companyId, companyId)).orderBy(desc(salesImportBatches.createdAt)),
    db.select().from(salesProperties).where(eq(salesProperties.companyId, companyId)).orderBy(desc(salesProperties.updatedAt)),
    db.select().from(salesClients).where(eq(salesClients.companyId, companyId)).orderBy(desc(salesClients.updatedAt)),
    db.select().from(salesContracts).where(eq(salesContracts.companyId, companyId)).orderBy(desc(salesContracts.createdAt)),
  ]);
  const contractIds = contractRows.map(contract => contract.id);
  const installments = contractIds.length
    ? await db.select().from(salesInstallments).where(and(eq(salesInstallments.companyId, companyId), inArray(salesInstallments.salesContractId, contractIds))).orderBy(salesInstallments.salesContractId, salesInstallments.sequenceNumber)
    : [];
  return { batches, properties: salesPropertyRows, clients: salesClientRows, contracts: contractRows, installments };
}

export async function importSalesBatchForCompany(input: {
  companyId: number;
  userId: number;
  kind: SalesImportKind;
  fileName: string;
  contentType: string;
  base64Content: string;
}) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const safeFileName = input.fileName.trim().replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180);
  if (!safeFileName || !/\.(xlsx|xls|csv)$/i.test(safeFileName)) throw new Error("UNSUPPORTED_IMPORT_FILE");
  const fileBuffer = Buffer.from(input.base64Content, "base64");
  if (!fileBuffer.length || fileBuffer.length > 8 * 1024 * 1024) throw new Error("IMPORT_FILE_SIZE_INVALID");
  const rawRows = parseSalesImportRows(fileBuffer);
  const preparedRows = prepareSalesImportRows(input.kind, rawRows);
  if (!preparedRows.validRows.length) throw new Error(input.kind === "properties" ? "IMPORT_NO_VALID_PROPERTY_ROWS" : "IMPORT_NO_VALID_CLIENT_ROWS");
  const importSummary = {
    ...summarizeSalesImportRows(input.kind, rawRows),
    parsedRowCount: rawRows.length,
    importedRowCount: preparedRows.validRows.length,
    skippedBlankRows: preparedRows.skippedBlankRows,
    skippedMissingNameRows: preparedRows.skippedMissingNameRows,
  };
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const storage = await storagePut(`sales-imports/${input.companyId}/${Date.now()}-${safeFileName}`, fileBuffer, input.contentType || "application/octet-stream");
  const result = await db.transaction(async tx => {
    const batchResult = await tx.insert(salesImportBatches).values({
      companyId: input.companyId,
      kind: input.kind,
      fileName: safeFileName,
      fileKey: storage.key,
      fileUrl: storage.url,
      rowCount: preparedRows.validRows.length,
      status: "completed",
      uploadedByUserId: input.userId,
    });
    const batchId = Number(batchResult[0].insertId);
    if (input.kind === "properties") {
      const values = preparedRows.validRows.map(row => {
        const project = salesRowValue(row, ["project", "project_name", "project name", "development", "المشروع", "اسم المشروع", "פרויקט"]);
        const unitNumber = salesRowValue(row, ["unit_number", "unit number", "unit no", "unit", "apartment", "flat", "رقم الوحدة", "الوحدة", "יחידה"]);
        const name = unitNumber
          ? [project, unitNumber].filter(Boolean).join(" · ")
          : salesRowValue(row, ["name", "property", "property_name", "property name", "unit", "اسم", "اسم العقار", "שם", "נכס"]);
        return {
          companyId: input.companyId,
          importBatchId: batchId,
          externalId: salesRowValue(row, ["id", "external_id", "external id", "code", "unit_number", "unit number", "unit no", "رقم", "رقم الوحدة", "מזהה", "יחידה"]),
          name: name ?? "",
          address: salesRowValue(row, ["address", "location", "project", "project_name", "project name", "building", "building name", "العنوان", "المشروع", "בניין", "כתובת"]),
          ownerName: salesRowValue(row, ["owner", "owner_name", "owner name", "developer", "developer name", "المالك", "مالك", "اسم المالك", "باسم المالك", "בעלים", "יזם"]),
          propertyType: salesRowValue(row, ["type", "property_type", "property type", "unit_type", "unit type", "category", "النوع", "نوع الوحدة", "סוג"]),
          status: salesImportedPropertyStatus(row),
          areaSqm: salesInteger(salesRowValue(row, ["area", "area_sqm", "area sqm", "total_area", "total area", "net area", "sqm", "m2", "المساحة", "المساحة الكلية", "שטח"])),
          listPriceIls: salesInteger(salesRowValue(row, ["price", "list_price", "list price", "price_ils", "sale_price", "sale price", "amount", "gross_amount", "gross amount", "السعر", "سعر البيع", "المبلغ", "מחיר", "סכום"])),
          attributesJson: JSON.stringify(row),
          createdByUserId: input.userId,
        };
      });
      await tx.insert(salesProperties).values(values);
    } else {
      const values = preparedRows.validRows.map(row => {
        const name = salesRowValue(row, ["name", "full_name", "full name", "client", "client_name", "client name", "customer", "customer name", "اسم", "اسم العميل", "اسم العميل الكامل", "שם", "לקוח"]);
        return {
          companyId: input.companyId,
          importBatchId: batchId,
          externalId: salesRowValue(row, ["id", "external_id", "external id", "client_id", "client id", "code", "رقم", "رقم العميل", "מזהה"]),
          name: name ?? "",
          email: salesRowValue(row, ["email", "e-mail", "mail", "email address", "البريد", "البريد الإلكتروني", "דואל"]),
          phone: salesRowValue(row, ["phone", "phone number", "mobile", "mobile number", "telephone", "tel", "الهاتف", "رقم الهاتف", "التليفون", "رقم التليفون", "الجوال", "رقم الجوال", "טלפון", "מספר טלפון"]),
          identityNumber: salesRowValue(row, ["identity", "identity_number", "identity number", "id_number", "id number", "national id", "الهوية", "رقم الهوية", "תז"]),
          attributesJson: JSON.stringify(row),
          createdByUserId: input.userId,
        };
      });
      await tx.insert(salesClients).values(values);
    }
    return batchId;
  });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: `sales_import.${input.kind}.created`, resourceType: "sales_import_batch", resourceId: result, metadata: { fileName: safeFileName, rowCount: preparedRows.validRows.length, skippedBlankRows: preparedRows.skippedBlankRows, skippedMissingNameRows: preparedRows.skippedMissingNameRows } });
  return { batchId: result, rowCount: preparedRows.validRows.length, fileUrl: storage.url, importSummary };
}

export async function deleteSalesImportBatchForCompany(input: { companyId: number; userId: number; batchId: number }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [batch] = await db.select().from(salesImportBatches).where(and(eq(salesImportBatches.id, input.batchId), eq(salesImportBatches.companyId, input.companyId))).limit(1);
  if (!batch) throw new Error("IMPORT_BATCH_NOT_FOUND");
  const importRows = batch.kind === "properties"
    ? await db.select({ id: salesProperties.id }).from(salesProperties).where(and(eq(salesProperties.companyId, input.companyId), eq(salesProperties.importBatchId, input.batchId)))
    : await db.select({ id: salesClients.id }).from(salesClients).where(and(eq(salesClients.companyId, input.companyId), eq(salesClients.importBatchId, input.batchId)));
  const importedIds = importRows.map(row => row.id);
  if (importedIds.length) {
    const linkedContracts = batch.kind === "properties"
      ? await db.select({ id: salesContracts.id }).from(salesContracts).where(and(eq(salesContracts.companyId, input.companyId), inArray(salesContracts.salesPropertyId, importedIds)))
      : await db.select({ id: salesContracts.id }).from(salesContracts).where(and(eq(salesContracts.companyId, input.companyId), inArray(salesContracts.salesClientId, importedIds)));
    if (linkedContracts.length) throw new Error("IMPORT_BATCH_HAS_SALE_CONTRACTS");
  }
  await db.transaction(async tx => {
    if (batch.kind === "properties") await tx.delete(salesProperties).where(and(eq(salesProperties.companyId, input.companyId), eq(salesProperties.importBatchId, input.batchId)));
    else await tx.delete(salesClients).where(and(eq(salesClients.companyId, input.companyId), eq(salesClients.importBatchId, input.batchId)));
    await tx.delete(salesImportBatches).where(and(eq(salesImportBatches.id, input.batchId), eq(salesImportBatches.companyId, input.companyId)));
  });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: `sales_import.${batch.kind}.deleted`, resourceType: "sales_import_batch", resourceId: input.batchId, metadata: { rowCount: batch.rowCount } });
  return { success: true } as const;
}

export async function updateSalesPropertyForCompany(input: { companyId: number; userId: number; id: number; name: string; address?: string | null; ownerName?: string | null; propertyType?: string | null; status: "available" | "reserved" | "sold" | "inactive"; areaSqm?: number | null; listPriceIls?: number | null; attributesJson?: string | null }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const name = input.name.trim();
  if (!name || name.length > 220 || (input.areaSqm ?? 0) < 0 || (input.listPriceIls ?? 0) < 0) throw new Error("INVALID_SALES_PROPERTY");
  await db.update(salesProperties).set({ name, address: input.address?.trim() || null, ownerName: input.ownerName?.trim() || null, propertyType: input.propertyType?.trim() || null, status: input.status, areaSqm: input.areaSqm ?? null, listPriceIls: input.listPriceIls ?? null, attributesJson: input.attributesJson?.trim() || null }).where(and(eq(salesProperties.id, input.id), eq(salesProperties.companyId, input.companyId)));
  const [updated] = await db.select().from(salesProperties).where(and(eq(salesProperties.id, input.id), eq(salesProperties.companyId, input.companyId))).limit(1);
  if (!updated) throw new Error("SALES_PROPERTY_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "sales_property.updated", resourceType: "sales_property", resourceId: input.id });
  return updated;
}

export async function updateSalesPropertyPublicSettingsForCompany(input: { companyId: number; userId: number; id: number; isPublished: boolean; publicDescription?: string | null; publicImagesJson?: string | null; paymentPlanJson?: string | null; publicVideoUrl?: string | null; publicTourUrl?: string | null; publicFloorPlanUrl?: string | null; publicLatitude?: string | null; publicLongitude?: string | null }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const description = input.publicDescription?.trim() || null;
  const images = input.publicImagesJson?.trim() || null;
  const paymentPlan = input.paymentPlanJson?.trim() || null;
  const publicVideoUrl = input.publicVideoUrl?.trim() || null;
  const publicTourUrl = input.publicTourUrl?.trim() || null;
  const publicFloorPlanUrl = input.publicFloorPlanUrl?.trim() || null;
  const publicLatitude = input.publicLatitude?.trim() || null;
  const publicLongitude = input.publicLongitude?.trim() || null;
  if (description && description.length > 12000) throw new Error("INVALID_PUBLIC_DESCRIPTION");
  if (images && images.length > 20000) throw new Error("INVALID_PUBLIC_IMAGES");
  if (paymentPlan && paymentPlan.length > 12000) throw new Error("INVALID_PAYMENT_PLAN");
  if (publicVideoUrl && publicVideoUrl.length > 2000) throw new Error("INVALID_PUBLIC_VIDEO");
  if (publicTourUrl && publicTourUrl.length > 2000) throw new Error("INVALID_PUBLIC_TOUR");
  if (publicFloorPlanUrl && publicFloorPlanUrl.length > 2000) throw new Error("INVALID_PUBLIC_FLOOR_PLAN");
  if ((publicLatitude && !/^-?\d{1,3}(?:\.\d+)?$/.test(publicLatitude)) || (publicLongitude && !/^-?\d{1,3}(?:\.\d+)?$/.test(publicLongitude))) throw new Error("INVALID_PUBLIC_COORDINATES");
  await db.update(salesProperties).set({ isPublished: input.isPublished, publicDescription: description, publicImagesJson: images, paymentPlanJson: paymentPlan, publicVideoUrl, publicTourUrl, publicFloorPlanUrl, publicLatitude, publicLongitude }).where(and(eq(salesProperties.id, input.id), eq(salesProperties.companyId, input.companyId)));
  const [updated] = await db.select().from(salesProperties).where(and(eq(salesProperties.id, input.id), eq(salesProperties.companyId, input.companyId))).limit(1);
  if (!updated) throw new Error("SALES_PROPERTY_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: input.isPublished ? "sales_property.published" : "sales_property.unpublished", resourceType: "sales_property", resourceId: input.id });
  return updated;
}

export async function listPublishedSalesProperties() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: salesProperties.id, name: salesProperties.name, address: salesProperties.address, propertyType: salesProperties.propertyType, status: salesProperties.status, areaSqm: salesProperties.areaSqm, listPriceIls: salesProperties.listPriceIls, publicDescription: salesProperties.publicDescription, publicImagesJson: salesProperties.publicImagesJson, paymentPlanJson: salesProperties.paymentPlanJson, publicVideoUrl: salesProperties.publicVideoUrl, publicTourUrl: salesProperties.publicTourUrl, publicFloorPlanUrl: salesProperties.publicFloorPlanUrl, publicLatitude: salesProperties.publicLatitude, publicLongitude: salesProperties.publicLongitude, updatedAt: salesProperties.updatedAt }).from(salesProperties).where(and(eq(salesProperties.isPublished, true), eq(salesProperties.status, "available"))).orderBy(desc(salesProperties.updatedAt));
}

const publicSalesPropertySelection = {
  id: salesProperties.id,
  name: salesProperties.name,
  address: salesProperties.address,
  propertyType: salesProperties.propertyType,
  status: salesProperties.status,
  areaSqm: salesProperties.areaSqm,
  listPriceIls: salesProperties.listPriceIls,
  publicDescription: salesProperties.publicDescription,
  publicImagesJson: salesProperties.publicImagesJson,
  paymentPlanJson: salesProperties.paymentPlanJson,
  publicVideoUrl: salesProperties.publicVideoUrl,
  publicTourUrl: salesProperties.publicTourUrl,
  publicFloorPlanUrl: salesProperties.publicFloorPlanUrl,
  publicLatitude: salesProperties.publicLatitude,
  publicLongitude: salesProperties.publicLongitude,
  updatedAt: salesProperties.updatedAt,
};

export async function listPublishedSalesPropertiesForCompanySlug(companySlug: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select(publicSalesPropertySelection).from(salesProperties).innerJoin(companies, eq(salesProperties.companyId, companies.id)).where(and(eq(companies.slug, companySlug), eq(salesProperties.isPublished, true), eq(salesProperties.status, "available"))).orderBy(desc(salesProperties.updatedAt));
}

export async function getPublishedSalesPropertyForCompanySlug(companySlug: string, propertyId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select(publicSalesPropertySelection).from(salesProperties).innerJoin(companies, eq(salesProperties.companyId, companies.id)).where(and(eq(companies.slug, companySlug), eq(salesProperties.id, propertyId), eq(salesProperties.isPublished, true), eq(salesProperties.status, "available"))).limit(1);
  return row ?? null;
}

export async function createPublicPropertyInquiry(input: { salesPropertyId: number; name: string; phone: string; email?: string | null; message: string }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const name = input.name.trim();
  const phone = input.phone.trim();
  const message = input.message.trim();
  const email = input.email?.trim() || null;
  if (name.length < 2 || name.length > 180 || phone.length < 5 || phone.length > 48 || message.length < 5 || message.length > 4000) throw new Error("INVALID_PROPERTY_INQUIRY");
  if (email && email.length > 320) throw new Error("INVALID_PROPERTY_INQUIRY");
  const [property] = await db.select({ id: salesProperties.id, companyId: salesProperties.companyId }).from(salesProperties).where(and(eq(salesProperties.id, input.salesPropertyId), eq(salesProperties.isPublished, true), eq(salesProperties.status, "available"))).limit(1);
  if (!property) throw new Error("PUBLIC_PROPERTY_NOT_FOUND");
  const [created] = await db.insert(propertyInquiries).values({ companyId: property.companyId, salesPropertyId: property.id, name, phone, email, message }).$returningId();
  return { success: true, inquiryId: created.id } as const;
}

export async function createIntegrationLeadForCompany(input: {
  companySlug: string;
  propertyId?: number;
  name: string;
  phone: string;
  email?: string | null;
  message: string;
  source: string;
  externalId?: string;
  preferredPropertyType?: string;
  preferredLocation?: string;
  budgetMinIls?: number;
  budgetMaxIls?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, input.companySlug.trim())).limit(1);
  if (!company) throw new Error("COMPANY_NOT_FOUND");

  if (input.externalId) {
    const [existing] = await db.select({ id: salesClients.id }).from(salesClients).where(and(eq(salesClients.companyId, company.id), eq(salesClients.externalId, input.externalId.trim()))).limit(1);
    if (existing) return { created: false, duplicate: true, salesClientId: existing.id, source: input.source } as const;
  }

  let property: { id: number; companyId: number } | null = null;
  if (input.propertyId) {
    const [published] = await db.select({ id: salesProperties.id, companyId: salesProperties.companyId }).from(salesProperties).where(and(eq(salesProperties.id, input.propertyId), eq(salesProperties.companyId, company.id), eq(salesProperties.isPublished, true), eq(salesProperties.status, "available"))).limit(1);
    if (!published) throw new Error("PROPERTY_NOT_FOUND");
    property = published;
  }

  const result = await db.insert(salesClients).values({
    companyId: company.id,
    externalId: input.externalId?.trim() || null,
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone.trim(),
    leadSource: input.source.trim(),
    pipelineStage: "new",
    budgetMinIls: input.budgetMinIls ?? null,
    budgetMaxIls: input.budgetMaxIls ?? null,
    preferredPropertyType: input.preferredPropertyType?.trim() || null,
    preferredLocation: input.preferredLocation?.trim() || null,
    createdByUserId: 0,
  });
  const salesClientId = Number(result[0].insertId);

  await db.insert(crmActivities).values({
    companyId: company.id,
    salesClientId,
    salesTeamMemberId: null,
    type: "note",
    subject: `Website lead · ${input.source.trim()}`.slice(0, 180),
    notes: input.message.trim(),
    createdByUserId: 0,
  });

  if (property) {
    await db.insert(crmClientProperties).values({
      companyId: company.id,
      salesClientId,
      salesPropertyId: property.id,
      interestLevel: "medium",
      notes: `Captured from ${input.source.trim()}`,
      createdByUserId: 0,
    }).onDuplicateKeyUpdate({ set: { interestLevel: "medium", notes: `Captured from ${input.source.trim()}`, updatedAt: new Date() } });
    await db.insert(propertyInquiries).values({ companyId: company.id, salesPropertyId: property.id, name: input.name.trim(), phone: input.phone.trim(), email: input.email?.trim() || null, message: input.message.trim() });
  }

  return { created: true, duplicate: false, salesClientId, propertyId: property?.id ?? null, source: input.source } as const;
}

export async function updateSalesClientForCompany(input: { companyId: number; userId: number; id: number; name: string; email?: string | null; phone?: string | null; identityNumber?: string | null; attributesJson?: string | null }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const name = input.name.trim();
  if (!name || name.length > 220) throw new Error("INVALID_SALES_CLIENT");
  await db.update(salesClients).set({ name, email: input.email?.trim() || null, phone: input.phone?.trim() || null, identityNumber: input.identityNumber?.trim() || null, attributesJson: input.attributesJson?.trim() || null }).where(and(eq(salesClients.id, input.id), eq(salesClients.companyId, input.companyId)));
  const [updated] = await db.select().from(salesClients).where(and(eq(salesClients.id, input.id), eq(salesClients.companyId, input.companyId))).limit(1);
  if (!updated) throw new Error("SALES_CLIENT_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "sales_client.updated", resourceType: "sales_client", resourceId: input.id });
  return updated;
}

export function calculateSalesPaymentPlan(input: { listPriceIls: number; discountKind: SalesDiscountKind; discountValue: number; depositIls: number; paymentFrequency: SalesPaymentFrequency; termYears: number; firstInstallmentAt?: Date | null }) {
  const listPriceIls = Math.round(input.listPriceIls);
  const discountValue = Math.round(input.discountValue);
  const depositIls = Math.round(input.depositIls);
  if (!Number.isInteger(listPriceIls) || listPriceIls <= 0 || discountValue < 0 || depositIls < 0) throw new Error("INVALID_SALES_FINANCIAL_VALUES");
  if (!Number.isInteger(input.termYears) || input.termYears < 1 || input.termYears > 5) throw new Error("INVALID_SALES_TERM_YEARS");
  const discountAmountIls = input.discountKind === "fixed" ? discountValue : input.discountKind === "percentage" ? Math.round((listPriceIls * discountValue) / 100) : 0;
  if ((input.discountKind === "percentage" && discountValue > 100) || discountAmountIls > listPriceIls) throw new Error("INVALID_SALES_DISCOUNT");
  const netPriceIls = listPriceIls - discountAmountIls;
  if (depositIls > netPriceIls) throw new Error("INVALID_SALES_DEPOSIT");
  const balanceIls = netPriceIls - depositIls;
  const periodsPerYear = input.paymentFrequency === "quarterly" ? 4 : input.paymentFrequency === "semiannual" ? 2 : 1;
  const installmentCount = balanceIls === 0 ? 0 : periodsPerYear * input.termYears;
  if (balanceIls > 0 && !input.firstInstallmentAt) throw new Error("FIRST_INSTALLMENT_DATE_REQUIRED");
  const baseInstallmentIls = installmentCount ? Math.floor(balanceIls / installmentCount) : 0;
  const remainderIls = installmentCount ? balanceIls - baseInstallmentIls * installmentCount : 0;
  const monthsPerInstallment = 12 / periodsPerYear;
  const installments = installmentCount && input.firstInstallmentAt
    ? Array.from({ length: installmentCount }, (_, index) => {
      const dueAt = new Date(input.firstInstallmentAt!);
      dueAt.setUTCMonth(dueAt.getUTCMonth() + monthsPerInstallment * index);
      return { sequenceNumber: index + 1, dueAt, amountIls: baseInstallmentIls + (index === installmentCount - 1 ? remainderIls : 0) };
    })
    : [];
  return { listPriceIls, discountAmountIls, netPriceIls, depositIls, balanceIls, installmentCount, installmentAmountIls: baseInstallmentIls, installments };
}

export async function createSalesContractForCompany(input: { companyId: number; userId: number; salesPropertyId: number; salesClientId: number; contractNumber: string; status?: "draft" | "active" | "completed" | "cancelled"; listPriceIls: number; discountKind: SalesDiscountKind; discountValue: number; depositIls: number; paymentFrequency: SalesPaymentFrequency; termYears: number; firstInstallmentAt?: Date | null; notes?: string | null }) {
  await assertCompanyOperationalAccess(input.companyId, input.userId, true);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const contractNumber = input.contractNumber.trim();
  if (!contractNumber || contractNumber.length > 80) throw new Error("INVALID_SALES_CONTRACT_NUMBER");
  const [salesProperty, salesClient] = await Promise.all([
    db.select({ id: salesProperties.id }).from(salesProperties).where(and(eq(salesProperties.id, input.salesPropertyId), eq(salesProperties.companyId, input.companyId))).limit(1),
    db.select({ id: salesClients.id }).from(salesClients).where(and(eq(salesClients.id, input.salesClientId), eq(salesClients.companyId, input.companyId))).limit(1),
  ]);
  if (!salesProperty) throw new Error("SALES_PROPERTY_NOT_FOUND");
  if (!salesClient) throw new Error("SALES_CLIENT_NOT_FOUND");
  const plan = calculateSalesPaymentPlan(input);
  const result = await db.transaction(async tx => {
    const createdResult = await tx.insert(salesContracts).values({
      companyId: input.companyId,
      salesPropertyId: input.salesPropertyId,
      salesClientId: input.salesClientId,
      contractNumber,
      status: input.status ?? "draft",
      listPriceIls: plan.listPriceIls,
      discountKind: input.discountKind,
      discountValue: Math.round(input.discountValue),
      discountAmountIls: plan.discountAmountIls,
      netPriceIls: plan.netPriceIls,
      depositIls: plan.depositIls,
      balanceIls: plan.balanceIls,
      paymentFrequency: input.paymentFrequency,
      termYears: input.termYears,
      installmentCount: plan.installmentCount,
      installmentAmountIls: plan.installmentAmountIls,
      firstInstallmentAt: input.firstInstallmentAt ?? null,
      notes: input.notes?.trim() || null,
      createdByUserId: input.userId,
    });
    const contractId = Number(createdResult[0].insertId);
    if (plan.installments.length) await tx.insert(salesInstallments).values(plan.installments.map(installment => ({ companyId: input.companyId, salesContractId: contractId, ...installment, status: "pending" as const })));
    return contractId;
  });
  const [created] = await db.select().from(salesContracts).where(and(eq(salesContracts.id, result), eq(salesContracts.companyId, input.companyId))).limit(1);
  if (!created) throw new Error("RESOURCE_CREATE_FAILED");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "sales_contract.created", resourceType: "sales_contract", resourceId: created.id, metadata: { contractNumber, balanceIls: plan.balanceIls, installmentCount: plan.installmentCount } });
  return { contract: created, installments: plan.installments };
}

type SalesTeamRole = "manager" | "supervisor" | "representative";
type SalesTeamStatus = "active" | "inactive";
type SalesTaskStatus = "todo" | "in_progress" | "done" | "cancelled";

function salesOperationDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function salesInviteHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getSalesTeamAccess(companyId: number, userId: number) {
  const membership = await getCompanyMembershipForCompany(companyId, userId);
  if (!membership) throw new Error("COMPANY_ACCESS_REQUIRED");
  const subscription = await getCompanySubscription(companyId);
  if (!hasActiveSubscription(subscription)) throw new Error("ACTIVE_SUBSCRIPTION_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [salesMember] = await db.select().from(salesTeamMembers).where(and(eq(salesTeamMembers.companyId, companyId), eq(salesTeamMembers.userId, userId))).limit(1);
  const companyManager = ["owner", "admin", "manager"].includes(membership.member.role);
  if (!companyManager && (!salesMember || salesMember.status !== "active")) throw new Error("SALES_TEAM_ACCESS_REQUIRED");
  const canManage = companyManager || salesMember?.role === "manager" || salesMember?.role === "supervisor";
  return { membership, salesMember: salesMember ?? null, canManage };
}

export type CrmPipelineStage = "new" | "contacted" | "qualified" | "viewing" | "negotiation" | "won" | "lost";
export type CrmActivityType = "call" | "whatsapp" | "meeting" | "viewing" | "email" | "note" | "other";

async function ensureCrmClientVisible(input: { companyId: number; userId: number; salesClientId: number }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [client] = await db.select().from(salesClients).where(and(eq(salesClients.id, input.salesClientId), eq(salesClients.companyId, input.companyId))).limit(1);
  if (!client) throw new Error("SALES_CLIENT_NOT_FOUND");
  if (access.canManage) return { access, client };
  if (!access.salesMember) throw new Error("SALES_TEAM_ACCESS_REQUIRED");
  const [assignment] = await db.select({ id: salesAssignments.id }).from(salesAssignments).where(and(
    eq(salesAssignments.companyId, input.companyId),
    eq(salesAssignments.salesClientId, input.salesClientId),
    eq(salesAssignments.salesTeamMemberId, access.salesMember.id),
    eq(salesAssignments.status, "active")
  )).limit(1);
  if (!assignment && client.assignedSalesTeamMemberId !== access.salesMember.id) throw new Error("SALES_CLIENT_NOT_ASSIGNED");
  return { access, client };
}

export async function listCrmClientsForCompany(input: { companyId: number; userId: number; search?: string; stage?: CrmPipelineStage; assignedSalesTeamMemberId?: number }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(salesClients.companyId, input.companyId)];
  if (input.stage) conditions.push(eq(salesClients.pipelineStage, input.stage));
  if (input.search?.trim()) {
    const search = `%${input.search.trim()}%`;
    conditions.push(or(like(salesClients.name, search), like(salesClients.phone, search), like(salesClients.email, search))!);
  }
  if (access.canManage && input.assignedSalesTeamMemberId) conditions.push(eq(salesClients.assignedSalesTeamMemberId, input.assignedSalesTeamMemberId));
  if (!access.canManage && access.salesMember) {
    const assignedRows = await db.select({ salesClientId: salesAssignments.salesClientId }).from(salesAssignments).where(and(
      eq(salesAssignments.companyId, input.companyId),
      eq(salesAssignments.salesTeamMemberId, access.salesMember.id),
      eq(salesAssignments.status, "active")
    ));
    const assignedIds = assignedRows.map(row => row.salesClientId).filter((id): id is number => id != null);
    conditions.push(assignedIds.length ? or(eq(salesClients.assignedSalesTeamMemberId, access.salesMember.id), inArray(salesClients.id, assignedIds))! : eq(salesClients.assignedSalesTeamMemberId, access.salesMember.id));
  }
  return db.select().from(salesClients).where(and(...conditions)).orderBy(desc(salesClients.updatedAt));
}

export async function getCrmClientForCompany(input: { companyId: number; userId: number; salesClientId: number }) {
  const { client } = await ensureCrmClientVisible(input);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [activities, interests, stageHistory] = await Promise.all([
    db.select().from(crmActivities).where(and(eq(crmActivities.companyId, input.companyId), eq(crmActivities.salesClientId, input.salesClientId))).orderBy(desc(crmActivities.createdAt)),
    db.select({ interest: crmClientProperties, property: salesProperties }).from(crmClientProperties).innerJoin(salesProperties, eq(crmClientProperties.salesPropertyId, salesProperties.id)).where(and(eq(crmClientProperties.companyId, input.companyId), eq(crmClientProperties.salesClientId, input.salesClientId))).orderBy(desc(crmClientProperties.updatedAt)),
    db.select().from(crmStageHistory).where(and(eq(crmStageHistory.companyId, input.companyId), eq(crmStageHistory.salesClientId, input.salesClientId))).orderBy(desc(crmStageHistory.createdAt)),
  ]);
  return { client, activities, interests, stageHistory };
}

export async function updateCrmClientForCompany(input: {
  companyId: number;
  userId: number;
  salesClientId: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  leadSource?: string | null;
  pipelineStage?: CrmPipelineStage;
  budgetMinIls?: number | null;
  budgetMaxIls?: number | null;
  preferredPropertyType?: string | null;
  preferredLocation?: string | null;
  nextFollowUpAt?: Date | null;
  lostReason?: string | null;
  assignedSalesTeamMemberId?: number | null;
}) {
  const { access, client } = await ensureCrmClientVisible(input);
  if (input.assignedSalesTeamMemberId !== undefined && !access.canManage) throw new Error("SALES_TEAM_MANAGE_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  if (input.assignedSalesTeamMemberId != null) {
    const [member] = await db.select({ id: salesTeamMembers.id }).from(salesTeamMembers).where(and(eq(salesTeamMembers.id, input.assignedSalesTeamMemberId), eq(salesTeamMembers.companyId, input.companyId), eq(salesTeamMembers.status, "active"))).limit(1);
    if (!member) throw new Error("SALES_TEAM_MEMBER_NOT_FOUND");
  }
  const nextStage = input.pipelineStage ?? client.pipelineStage;
  const updates = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
    ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
    ...(input.leadSource !== undefined ? { leadSource: input.leadSource?.trim() || null } : {}),
    ...(input.pipelineStage !== undefined ? { pipelineStage: input.pipelineStage } : {}),
    ...(input.budgetMinIls !== undefined ? { budgetMinIls: input.budgetMinIls } : {}),
    ...(input.budgetMaxIls !== undefined ? { budgetMaxIls: input.budgetMaxIls } : {}),
    ...(input.preferredPropertyType !== undefined ? { preferredPropertyType: input.preferredPropertyType?.trim() || null } : {}),
    ...(input.preferredLocation !== undefined ? { preferredLocation: input.preferredLocation?.trim() || null } : {}),
    ...(input.nextFollowUpAt !== undefined ? { nextFollowUpAt: input.nextFollowUpAt } : {}),
    ...(input.lostReason !== undefined ? { lostReason: input.lostReason?.trim() || null } : {}),
    ...(input.assignedSalesTeamMemberId !== undefined ? { assignedSalesTeamMemberId: input.assignedSalesTeamMemberId } : {}),
    ...(input.pipelineStage && input.pipelineStage !== client.pipelineStage && input.pipelineStage !== "lost" ? { lostReason: null } : {}),
  };
  if (Object.keys(updates).length) await db.update(salesClients).set(updates).where(and(eq(salesClients.id, input.salesClientId), eq(salesClients.companyId, input.companyId)));
  if (input.pipelineStage && input.pipelineStage !== client.pipelineStage) {
    await db.insert(crmStageHistory).values({ companyId: input.companyId, salesClientId: input.salesClientId, fromStage: client.pipelineStage, toStage: input.pipelineStage, actorUserId: input.userId });
  }
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "crm.client.updated", resourceType: "sales_client", resourceId: input.salesClientId, metadata: { pipelineStage: nextStage, assignedSalesTeamMemberId: input.assignedSalesTeamMemberId } });
  return { success: true } as const;
}

export async function createCrmActivityForCompany(input: { companyId: number; userId: number; salesClientId: number; type: CrmActivityType; subject: string; outcome?: string | null; scheduledAt?: Date | null; completedAt?: Date | null; notes?: string | null }) {
  const { access, client } = await ensureCrmClientVisible(input);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.insert(crmActivities).values({ companyId: input.companyId, salesClientId: input.salesClientId, salesTeamMemberId: access.salesMember?.id ?? client.assignedSalesTeamMemberId ?? null, type: input.type, subject: input.subject.trim(), outcome: input.outcome?.trim() || null, scheduledAt: input.scheduledAt ?? null, completedAt: input.completedAt ?? null, notes: input.notes?.trim() || null, createdByUserId: input.userId });
  const id = Number(result[0].insertId);
  const updates: { lastContactedAt?: Date; nextFollowUpAt?: Date | null } = {};
  if (input.completedAt) updates.lastContactedAt = input.completedAt;
  if (input.scheduledAt && !input.completedAt) updates.nextFollowUpAt = input.scheduledAt;
  if (Object.keys(updates).length) await db.update(salesClients).set(updates).where(and(eq(salesClients.id, input.salesClientId), eq(salesClients.companyId, input.companyId)));
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "crm.activity.created", resourceType: "crm_activity", resourceId: id, metadata: { salesClientId: input.salesClientId, type: input.type } });
  return { id };
}

export async function linkCrmPropertyToClient(input: { companyId: number; userId: number; salesClientId: number; salesPropertyId: number; interestLevel: "low" | "medium" | "high"; notes?: string | null }) {
  const { access } = await ensureCrmClientVisible(input);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await ensureSalesReferenceOwnership({ companyId: input.companyId, salesPropertyId: input.salesPropertyId, salesClientId: input.salesClientId });
  const result = await db.insert(crmClientProperties).values({ companyId: input.companyId, salesClientId: input.salesClientId, salesPropertyId: input.salesPropertyId, interestLevel: input.interestLevel, notes: input.notes?.trim() || null, createdByUserId: input.userId }).onDuplicateKeyUpdate({ set: { interestLevel: input.interestLevel, notes: input.notes?.trim() || null, updatedAt: new Date() } });
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "crm.property_interest.updated", resourceType: "crm_client_property", resourceId: Number(result[0]?.insertId ?? 0), metadata: { salesClientId: input.salesClientId, salesPropertyId: input.salesPropertyId, interestLevel: input.interestLevel, canManage: access.canManage } });
  return { success: true } as const;
}

export async function getCrmPipelineSummaryForCompany(input: { companyId: number; userId: number }) {
  const clients = await listCrmClientsForCompany(input);
  const stages: CrmPipelineStage[] = ["new", "contacted", "qualified", "viewing", "negotiation", "won", "lost"];
  return stages.reduce<Record<CrmPipelineStage, number>>((summary, stage) => {
    summary[stage] = clients.filter(client => client.pipelineStage === stage).length;
    return summary;
  }, { new: 0, contacted: 0, qualified: 0, viewing: 0, negotiation: 0, won: 0, lost: 0 });
}

async function ensureSalesReferenceOwnership(input: { companyId: number; salesPropertyId?: number | null; salesClientId?: number | null }) {
  if (!input.salesPropertyId && !input.salesClientId) return;
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [property, client] = await Promise.all([
    input.salesPropertyId ? db.select({ id: salesProperties.id }).from(salesProperties).where(and(eq(salesProperties.id, input.salesPropertyId), eq(salesProperties.companyId, input.companyId))).limit(1) : Promise.resolve([]),
    input.salesClientId ? db.select({ id: salesClients.id }).from(salesClients).where(and(eq(salesClients.id, input.salesClientId), eq(salesClients.companyId, input.companyId))).limit(1) : Promise.resolve([]),
  ]);
  if (input.salesPropertyId && !property[0]) throw new Error("SALES_PROPERTY_NOT_FOUND");
  if (input.salesClientId && !client[0]) throw new Error("SALES_CLIENT_NOT_FOUND");
}

export async function getSalesOperationsForCompany(input: { companyId: number; userId: number; taskDate?: string }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  const db = await getDb();
  if (!db) return { viewer: { role: "representative" as const, canManage: false }, team: [], invitations: [], assignments: [], tasks: [], attendance: [], messages: [], properties: [], clients: [] };
  const taskDate = input.taskDate || salesOperationDate();
  const team = await db.select({ member: salesTeamMembers, user: users }).from(salesTeamMembers).innerJoin(users, eq(salesTeamMembers.userId, users.id)).where(eq(salesTeamMembers.companyId, input.companyId)).orderBy(desc(salesTeamMembers.createdAt));
  const visibleMemberIds = access.canManage ? team.map(row => row.member.id) : access.salesMember ? [access.salesMember.id] : [];
  const [assignments, tasks, attendanceRows, messageRows, propertiesRows, clientRows, invitations] = await Promise.all([
    visibleMemberIds.length ? db.select().from(salesAssignments).where(and(eq(salesAssignments.companyId, input.companyId), inArray(salesAssignments.salesTeamMemberId, visibleMemberIds))).orderBy(desc(salesAssignments.updatedAt)) : Promise.resolve([]),
    visibleMemberIds.length ? db.select().from(salesDailyTasks).where(and(eq(salesDailyTasks.companyId, input.companyId), inArray(salesDailyTasks.salesTeamMemberId, visibleMemberIds), eq(salesDailyTasks.taskDate, taskDate))).orderBy(desc(salesDailyTasks.updatedAt)) : Promise.resolve([]),
    access.canManage
      ? db.select().from(attendance).where(and(eq(attendance.companyId, input.companyId), eq(attendance.attendanceDate, taskDate))).orderBy(desc(attendance.updatedAt))
      : db.select().from(attendance).where(and(eq(attendance.companyId, input.companyId), eq(attendance.userId, input.userId), eq(attendance.attendanceDate, taskDate))).orderBy(desc(attendance.updatedAt)),
    access.canManage
      ? db.select().from(salesMessages).where(eq(salesMessages.companyId, input.companyId)).orderBy(desc(salesMessages.createdAt)).limit(200)
      : db.select().from(salesMessages).where(and(eq(salesMessages.companyId, input.companyId), or(eq(salesMessages.scope, "team"), eq(salesMessages.senderUserId, input.userId), eq(salesMessages.recipientUserId, input.userId)))).orderBy(desc(salesMessages.createdAt)).limit(200),
    db.select().from(salesProperties).where(eq(salesProperties.companyId, input.companyId)).orderBy(desc(salesProperties.updatedAt)),
    access.canManage ? db.select().from(salesClients).where(eq(salesClients.companyId, input.companyId)).orderBy(desc(salesClients.updatedAt)) : Promise.resolve([]),
    access.canManage ? db.select().from(salesTeamInvitations).where(eq(salesTeamInvitations.companyId, input.companyId)).orderBy(desc(salesTeamInvitations.createdAt)) : Promise.resolve([]),
  ]);
  const assignedPropertyIds = Array.from(new Set(assignments.map(assignment => assignment.salesPropertyId).filter((id): id is number => id != null)));
  const assignedClientIds = Array.from(new Set(assignments.map(assignment => assignment.salesClientId).filter((id): id is number => id != null)));
  const [assignedProperties, assignedClients] = access.canManage
    ? [propertiesRows, clientRows]
    : await Promise.all([
      Promise.resolve(propertiesRows),
      assignedClientIds.length
        ? db.select().from(salesClients).where(and(eq(salesClients.companyId, input.companyId), inArray(salesClients.id, assignedClientIds))).orderBy(desc(salesClients.updatedAt))
        : Promise.resolve([]),
    ]);
  return {
    viewer: { role: access.salesMember?.role ?? "manager", canManage: access.canManage, salesTeamMemberId: access.salesMember?.id ?? null },
    team,
    invitations,
    assignments,
    tasks,
    attendance: attendanceRows,
    messages: messageRows.reverse(),
    properties: assignedProperties,
    clients: assignedClients,
  };
}

export async function createSalesCallInventoryForCompany(input: {
  companyId: number;
  userId: number;
  salesClientId: number;
  callType: "inbound" | "outbound" | "meeting" | "whatsapp" | "other";
  outcome: string;
  interestLevel: "not_interested" | "low" | "medium" | "high" | "very_high";
  interestSubject?: string | null;
  nextCallAt?: Date | null;
  notes?: string | null;
}) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [client, assignment] = await Promise.all([
    db.select({ id: salesClients.id }).from(salesClients).where(and(eq(salesClients.id, input.salesClientId), eq(salesClients.companyId, input.companyId))).limit(1),
    db.select({ salesTeamMemberId: salesAssignments.salesTeamMemberId }).from(salesAssignments).where(and(
      eq(salesAssignments.companyId, input.companyId),
      eq(salesAssignments.salesClientId, input.salesClientId),
      eq(salesAssignments.status, "active")
    )).orderBy(desc(salesAssignments.updatedAt)).limit(1),
  ]);
  if (!client[0]) throw new Error("SALES_CLIENT_NOT_FOUND");
  if (!access.canManage && (!access.salesMember || assignment[0]?.salesTeamMemberId !== access.salesMember.id)) {
    throw new Error("SALES_CLIENT_NOT_ASSIGNED");
  }
  const salesTeamMemberId = access.salesMember?.id ?? assignment[0]?.salesTeamMemberId;
  if (!salesTeamMemberId) throw new Error("SALES_CALL_MEMBER_REQUIRED");
  const outcome = input.outcome.trim();
  if (!outcome) throw new Error("SALES_CALL_OUTCOME_REQUIRED");
  const result = await db.insert(salesCallInventory).values({
    companyId: input.companyId,
    salesClientId: input.salesClientId,
    salesTeamMemberId,
    callType: input.callType,
    outcome,
    interestLevel: input.interestLevel,
    interestSubject: input.interestSubject?.trim() || null,
    nextCallAt: input.nextCallAt ?? null,
    notes: input.notes?.trim() || null,
    createdByUserId: input.userId,
  });
  const id = Number(result[0].insertId);
  await recordCompanyActivity({
    companyId: input.companyId,
    actorUserId: input.userId,
    action: "sales_call_inventory.created",
    resourceType: "sales_call_inventory",
    resourceId: id,
    metadata: { salesClientId: input.salesClientId, interestLevel: input.interestLevel, callType: input.callType },
  });
  return { id };
}

export async function listSalesCallInventoryForClient(input: { companyId: number; userId: number; salesClientId: number }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  const db = await getDb();
  if (!db) return [];
  const [client, assignment] = await Promise.all([
    db.select({ id: salesClients.id }).from(salesClients).where(and(eq(salesClients.id, input.salesClientId), eq(salesClients.companyId, input.companyId))).limit(1),
    !access.canManage && access.salesMember
      ? db.select({ id: salesAssignments.id }).from(salesAssignments).where(and(
        eq(salesAssignments.companyId, input.companyId),
        eq(salesAssignments.salesClientId, input.salesClientId),
        eq(salesAssignments.salesTeamMemberId, access.salesMember.id),
        eq(salesAssignments.status, "active")
      )).limit(1)
      : Promise.resolve([]),
  ]);
  if (!client[0]) throw new Error("SALES_CLIENT_NOT_FOUND");
  if (!access.canManage && !assignment[0]) throw new Error("SALES_CLIENT_NOT_ASSIGNED");
  const filter = access.canManage
    ? and(eq(salesCallInventory.companyId, input.companyId), eq(salesCallInventory.salesClientId, input.salesClientId))
    : and(
      eq(salesCallInventory.companyId, input.companyId),
      eq(salesCallInventory.salesClientId, input.salesClientId),
      eq(salesCallInventory.salesTeamMemberId, access.salesMember!.id)
    );
  return db.select().from(salesCallInventory).where(filter).orderBy(desc(salesCallInventory.createdAt));
}

export async function createSalesTeamInvitationForCompany(input: { companyId: number; userId: number; email: string; role: SalesTeamRole }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  if (!access.canManage) throw new Error("SALES_TEAM_MANAGE_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_SALES_TEAM_EMAIL");
  await db.update(salesTeamInvitations).set({ status: "revoked" }).where(and(eq(salesTeamInvitations.companyId, input.companyId), eq(salesTeamInvitations.email, email), eq(salesTeamInvitations.status, "pending")));
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const result = await db.insert(salesTeamInvitations).values({ companyId: input.companyId, email, role: input.role, tokenHash: salesInviteHash(token), invitedByUserId: input.userId, expiresAt });
  const invitationId = Number(result[0].insertId);
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "sales_team.invitation.created", resourceType: "sales_team_invitation", resourceId: invitationId, metadata: { email, role: input.role } });
  return { invitationId, token, expiresAt };
}

export async function revokeSalesTeamInvitationForCompany(input: { companyId: number; userId: number; invitationId: number }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  if (!access.canManage) throw new Error("SALES_TEAM_MANAGE_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const result = await db.update(salesTeamInvitations).set({ status: "revoked" }).where(and(eq(salesTeamInvitations.id, input.invitationId), eq(salesTeamInvitations.companyId, input.companyId), eq(salesTeamInvitations.status, "pending")));
  if (Number(result[0]?.affectedRows ?? 0) < 1) throw new Error("SALES_TEAM_INVITATION_NOT_FOUND");
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "sales_team.invitation.revoked", resourceType: "sales_team_invitation", resourceId: input.invitationId });
  return { success: true } as const;
}

export async function acceptSalesTeamInvitationForUser(input: { userId: number; token: string }) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const tokenHash = salesInviteHash(input.token.trim());
  const [invitation] = await db.select().from(salesTeamInvitations).where(eq(salesTeamInvitations.tokenHash, tokenHash)).limit(1);
  if (!invitation || invitation.status !== "pending") throw new Error("SALES_TEAM_INVITATION_INVALID");
  if (invitation.expiresAt.getTime() <= Date.now()) {
    await db.update(salesTeamInvitations).set({ status: "expired" }).where(eq(salesTeamInvitations.id, invitation.id));
    throw new Error("SALES_TEAM_INVITATION_EXPIRED");
  }
  const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user?.email || user.email.trim().toLowerCase() !== invitation.email) throw new Error("SALES_TEAM_INVITATION_EMAIL_MISMATCH");
  const existingMembership = await getCompanyMembership(input.userId);
  if (existingMembership && existingMembership.company.id !== invitation.companyId) throw new Error("USER_ALREADY_LINKED_TO_ANOTHER_COMPANY");
  await db.transaction(async tx => {
    if (!existingMembership) await tx.insert(companyMembers).values({ companyId: invitation.companyId, userId: input.userId, role: "member" });
    await tx.insert(salesTeamMembers).values({ companyId: invitation.companyId, userId: input.userId, role: invitation.role, status: "active", createdByUserId: invitation.invitedByUserId }).onDuplicateKeyUpdate({ set: { role: invitation.role, status: "active", updatedAt: new Date() } });
    await tx.update(salesTeamInvitations).set({ status: "accepted", acceptedByUserId: input.userId, acceptedAt: new Date() }).where(and(eq(salesTeamInvitations.id, invitation.id), eq(salesTeamInvitations.status, "pending")));
  });
  await recordCompanyActivity({ companyId: invitation.companyId, actorUserId: input.userId, action: "sales_team.invitation.accepted", resourceType: "sales_team_invitation", resourceId: invitation.id, metadata: { role: invitation.role } });
  return { companyId: invitation.companyId, role: invitation.role };
}

export async function updateSalesTeamMemberForCompany(input: { companyId: number; userId: number; salesTeamMemberId: number; role: SalesTeamRole; status: SalesTeamStatus }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  if (!access.canManage) throw new Error("SALES_TEAM_MANAGE_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [target] = await db.select().from(salesTeamMembers).where(and(eq(salesTeamMembers.id, input.salesTeamMemberId), eq(salesTeamMembers.companyId, input.companyId))).limit(1);
  if (!target) throw new Error("SALES_TEAM_MEMBER_NOT_FOUND");
  if (target.userId === input.userId && input.status === "inactive") throw new Error("SALES_TEAM_SELF_DEACTIVATION_BLOCKED");
  await db.update(salesTeamMembers).set({ role: input.role, status: input.status }).where(and(eq(salesTeamMembers.id, input.salesTeamMemberId), eq(salesTeamMembers.companyId, input.companyId)));
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "sales_team.member.updated", resourceType: "sales_team_member", resourceId: input.salesTeamMemberId, metadata: { role: input.role, status: input.status } });
  return { success: true } as const;
}

export async function createSalesAssignmentForCompany(input: { companyId: number; userId: number; salesTeamMemberId: number; salesPropertyId?: number | null; salesClientId?: number | null; notes?: string | null }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  if (!access.canManage) throw new Error("SALES_TEAM_MANAGE_REQUIRED");
  if (!input.salesPropertyId && !input.salesClientId) throw new Error("SALES_ASSIGNMENT_TARGET_REQUIRED");
  await ensureSalesReferenceOwnership(input);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [member] = await db.select().from(salesTeamMembers).where(and(eq(salesTeamMembers.id, input.salesTeamMemberId), eq(salesTeamMembers.companyId, input.companyId), eq(salesTeamMembers.status, "active"))).limit(1);
  if (!member) throw new Error("SALES_TEAM_MEMBER_NOT_FOUND");
  const result = await db.insert(salesAssignments).values({ companyId: input.companyId, salesTeamMemberId: input.salesTeamMemberId, salesPropertyId: input.salesPropertyId ?? null, salesClientId: input.salesClientId ?? null, notes: input.notes?.trim() || null, assignedByUserId: input.userId });
  const id = Number(result[0].insertId);
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "sales_assignment.created", resourceType: "sales_assignment", resourceId: id, metadata: { salesTeamMemberId: input.salesTeamMemberId, salesPropertyId: input.salesPropertyId ?? null, salesClientId: input.salesClientId ?? null } });
  return { id };
}

export async function createSalesDailyTaskForCompany(input: { companyId: number; userId: number; salesTeamMemberId: number; title: string; taskDate: string; targetContacts: number; salesPropertyId?: number | null; salesClientId?: number | null; notes?: string | null }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  if (!access.canManage) throw new Error("SALES_TEAM_MANAGE_REQUIRED");
  const title = input.title.trim();
  if (!title || title.length > 180 || !/^\d{4}-\d{2}-\d{2}$/.test(input.taskDate) || !Number.isInteger(input.targetContacts) || input.targetContacts < 0 || input.targetContacts > 10000) throw new Error("INVALID_SALES_DAILY_TASK");
  await ensureSalesReferenceOwnership(input);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [member] = await db.select().from(salesTeamMembers).where(and(eq(salesTeamMembers.id, input.salesTeamMemberId), eq(salesTeamMembers.companyId, input.companyId), eq(salesTeamMembers.status, "active"))).limit(1);
  if (!member) throw new Error("SALES_TEAM_MEMBER_NOT_FOUND");
  const result = await db.insert(salesDailyTasks).values({ companyId: input.companyId, salesTeamMemberId: input.salesTeamMemberId, title, taskDate: input.taskDate, targetContacts: input.targetContacts, salesPropertyId: input.salesPropertyId ?? null, salesClientId: input.salesClientId ?? null, notes: input.notes?.trim() || null, createdByUserId: input.userId });
  const id = Number(result[0].insertId);
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "sales_daily_task.created", resourceType: "sales_daily_task", resourceId: id, metadata: { salesTeamMemberId: input.salesTeamMemberId, taskDate: input.taskDate, targetContacts: input.targetContacts } });
  return { id };
}

export async function updateSalesDailyTaskForCompany(input: { companyId: number; userId: number; id: number; status: SalesTaskStatus; completedContacts: number; notes?: string | null }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [task] = await db.select().from(salesDailyTasks).where(and(eq(salesDailyTasks.id, input.id), eq(salesDailyTasks.companyId, input.companyId))).limit(1);
  if (!task) throw new Error("SALES_DAILY_TASK_NOT_FOUND");
  if (!access.canManage && task.salesTeamMemberId !== access.salesMember?.id) throw new Error("SALES_DAILY_TASK_ACCESS_REQUIRED");
  if (!Number.isInteger(input.completedContacts) || input.completedContacts < 0 || input.completedContacts > task.targetContacts) throw new Error("INVALID_SALES_TASK_PROGRESS");
  await db.update(salesDailyTasks).set({ status: input.status, completedContacts: input.completedContacts, notes: input.notes?.trim() || null }).where(and(eq(salesDailyTasks.id, input.id), eq(salesDailyTasks.companyId, input.companyId)));
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: "sales_daily_task.updated", resourceType: "sales_daily_task", resourceId: input.id, metadata: { status: input.status, completedContacts: input.completedContacts } });
  return { success: true } as const;
}

export async function recordSalesAttendanceForUser(input: { companyId: number; userId: number; action: "check_in" | "check_out"; occurredAt?: Date }) {
  const access = await getSalesTeamAccess(input.companyId, input.userId);
  // Company owners, admins, and managers receive sales-team management access through
  // getSalesTeamAccess even before they create a separate sales-representative record.
  // Their own attendance must therefore be recordable without weakening access for ordinary users.
  if (!access.salesMember && !access.canManage) throw new Error("SALES_TEAM_MEMBER_REQUIRED");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const occurredAt = input.occurredAt ?? new Date();
  const attendanceDate = salesOperationDate(occurredAt);
  // attendance.checkIn/checkOut are varchar(5) clock fields in the live schema.
  const timeValue = occurredAt.toISOString().slice(11, 16);
  const [existing] = await db.select().from(attendance).where(and(eq(attendance.companyId, input.companyId), eq(attendance.userId, input.userId), eq(attendance.attendanceDate, attendanceDate))).limit(1);
  if (input.action === "check_in") {
    if (!existing) await db.insert(attendance).values({ companyId: input.companyId, userId: input.userId, attendanceDate, status: "present", checkIn: timeValue, createdByUserId: input.userId });
    else if (!existing.checkIn) await db.update(attendance).set({ status: "present", checkIn: timeValue }).where(and(eq(attendance.id, existing.id), eq(attendance.companyId, input.companyId)));
  } else {
    if (!existing?.checkIn) throw new Error("SALES_ATTENDANCE_CHECK_IN_REQUIRED");
    if (!existing.checkOut) await db.update(attendance).set({ checkOut: timeValue }).where(and(eq(attendance.id, existing.id), eq(attendance.companyId, input.companyId)));
  }
  const [record] = await db.select().from(attendance).where(and(eq(attendance.companyId, input.companyId), eq(attendance.userId, input.userId), eq(attendance.attendanceDate, attendanceDate))).limit(1);
  await recordCompanyActivity({ companyId: input.companyId, actorUserId: input.userId, action: `sales_attendance.${input.action}`, resourceType: "attendance", resourceId: record?.id, metadata: { attendanceDate } });
  return record;
}

export async function createSalesMessageForCompany(input: { companyId: number; userId: number; scope: "team" | "direct"; recipientUserId?: number | null; body: string }) {
  await getSalesTeamAccess(input.companyId, input.userId);
  const body = input.body.trim();
  if (!body || body.length > 4000) throw new Error("INVALID_SALES_MESSAGE");
  if (input.scope === "direct" && (!input.recipientUserId || input.recipientUserId === input.userId)) throw new Error("INVALID_SALES_MESSAGE_RECIPIENT");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  if (input.scope === "direct" && input.recipientUserId) {
    const [recipient] = await db.select().from(salesTeamMembers).where(and(eq(salesTeamMembers.companyId, input.companyId), eq(salesTeamMembers.userId, input.recipientUserId), eq(salesTeamMembers.status, "active"))).limit(1);
    if (!recipient) throw new Error("SALES_MESSAGE_RECIPIENT_NOT_FOUND");
  }
  const result = await db.insert(salesMessages).values({ companyId: input.companyId, scope: input.scope, senderUserId: input.userId, recipientUserId: input.scope === "direct" ? input.recipientUserId ?? null : null, body });
  return { id: Number(result[0].insertId) };
}

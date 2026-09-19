import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin", "manager", "support", "analyst"]).default("user").notNull(),
    stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const companies = mysqlTable(
  "companies",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    ownerUserId: int("ownerUserId").notNull().unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("companies_owner_idx").on(table.ownerUserId)]
);

export const companyMembers = mysqlTable(
  "company_members",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["owner", "admin", "manager", "member", "viewer"]).default("member").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("company_members_company_idx").on(table.companyId, table.createdAt),
    index("company_members_user_idx").on(table.userId),
    uniqueIndex("company_members_company_user_unique").on(table.companyId, table.userId),
  ]
);

export const companyInvitations = mysqlTable(
  "company_invitations",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    role: mysqlEnum("role", ["admin", "manager", "member", "viewer"]).default("member").notNull(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
    status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"]).default("pending").notNull(),
    invitedByUserId: int("invitedByUserId").notNull(),
    acceptedByUserId: int("acceptedByUserId"),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("company_invitations_company_idx").on(table.companyId, table.createdAt), index("company_invitations_email_idx").on(table.email, table.status)]
);

export const companyActivityLogs = mysqlTable(
  "company_activity_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    actorUserId: int("actorUserId").notNull(),
    action: varchar("action", { length: 128 }).notNull(),
    resourceType: varchar("resourceType", { length: 64 }).notNull(),
    resourceId: varchar("resourceId", { length: 128 }),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("company_activity_company_idx").on(table.companyId, table.createdAt), index("company_activity_actor_idx").on(table.actorUserId, table.createdAt)]
);

export const companyResourceRevisions = mysqlTable(
  "company_resource_revisions",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    resourceType: varchar("resourceType", { length: 64 }).notNull(),
    resourceId: varchar("resourceId", { length: 128 }).notNull(),
    revisionNumber: int("revisionNumber").notNull(),
    operation: mysqlEnum("operation", ["created", "updated", "deleted", "replaced"]).notNull(),
    summary: varchar("summary", { length: 255 }).notNull(),
    beforeSnapshot: text("beforeSnapshot"),
    afterSnapshot: text("afterSnapshot"),
    metadata: text("metadata"),
    actorUserId: int("actorUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("company_resource_revisions_unique").on(table.companyId, table.resourceType, table.resourceId, table.revisionNumber),
    index("company_resource_revisions_resource_idx").on(table.companyId, table.resourceType, table.resourceId, table.revisionNumber),
    index("company_resource_revisions_actor_idx").on(table.companyId, table.actorUserId, table.createdAt),
  ]
);

export const companyNotificationReads = mysqlTable(
  "company_notification_reads",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    userId: int("userId").notNull(),
    notificationKey: varchar("notificationKey", { length: 160 }).notNull(),
    readAt: timestamp("readAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("company_notification_reads_unique").on(table.companyId, table.userId, table.notificationKey),
    index("company_notification_reads_member_idx").on(table.companyId, table.userId, table.readAt),
  ]
);

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    planCode: varchar("planCode", { length: 32 }).notNull(),
    status: mysqlEnum("status", ["active", "canceled", "expired"]).default("active").notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    canceledAt: timestamp("canceledAt"),
    stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }).unique(),
    stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }).unique(),
    stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).unique(),
    paymentProvider: mysqlEnum("paymentProvider", ["paypal", "bit", "owner_test", "owner_manual"]),
    providerOrderId: varchar("providerOrderId", { length: 255 }).unique(),
    providerPaymentId: varchar("providerPaymentId", { length: 255 }).unique(),
    isTest: boolean("isTest").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("subscriptions_status_ends_idx").on(table.status, table.endsAt)]
);

export const manualPaymentRequests = mysqlTable(
  "manual_payment_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    planCode: varchar("planCode", { length: 32 }).notNull(),
    provider: mysqlEnum("provider", ["bit", "paypal"]).notNull(),
    reference: varchar("reference", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["pending", "pending_manual_verification", "approved", "rejected"]).default("pending").notNull(),
    ownerNote: text("ownerNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("manual_payment_requests_user_idx").on(table.userId, table.createdAt), index("manual_payment_requests_status_idx").on(table.status, table.createdAt)]
);

export const invoices = mysqlTable(
  "invoices",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    manualPaymentRequestId: int("manualPaymentRequestId"),
    planCode: varchar("planCode", { length: 32 }).notNull(),
    amountIls: int("amountIls").notNull(),
    invoiceNumber: varchar("invoiceNumber", { length: 32 }).notNull().unique(),
    serialCode: varchar("serialCode", { length: 40 }).notNull().unique(),
    status: mysqlEnum("status", ["issued", "pending", "paid", "rejected"]).default("pending").notNull(),
    proofUrl: text("proofUrl"),
    isTest: boolean("isTest").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("invoices_user_idx").on(table.userId, table.createdAt), index("invoices_status_idx").on(table.status, table.createdAt)]
);

export const licenseKeys = mysqlTable(
  "license_keys",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    keyValue: varchar("keyValue", { length: 56 }).notNull().unique(),
    isTest: boolean("isTest").default(false).notNull(),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export const activationKeys = mysqlTable(
  "activation_keys",
  {
    id: int("id").autoincrement().primaryKey(),
    keyHash: varchar("keyHash", { length: 64 }).notNull().unique(),
    keyHint: varchar("keyHint", { length: 12 }).notNull(),
    planCode: varchar("planCode", { length: 32 }).notNull(),
    status: mysqlEnum("status", ["available", "redeemed", "revoked"]).default("available").notNull(),
    redeemedByUserId: int("redeemedByUserId"),
    redeemedAt: timestamp("redeemedAt"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("activation_keys_status_plan_idx").on(table.status, table.planCode), index("activation_keys_redeemed_user_idx").on(table.redeemedByUserId)]
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorUserId: int("actorUserId").notNull(),
    action: varchar("action", { length: 128 }).notNull(),
    resourceType: varchar("resourceType", { length: 64 }).notNull(),
    resourceId: varchar("resourceId", { length: 128 }),
    targetUserId: int("targetUserId"),
    success: boolean("success").default(true).notNull(),
    errorCode: varchar("errorCode", { length: 128 }),
    requestId: varchar("requestId", { length: 64 }),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("audit_logs_actor_idx").on(table.actorUserId, table.createdAt), index("audit_logs_action_idx").on(table.action, table.createdAt), index("audit_logs_target_idx").on(table.targetUserId, table.createdAt), index("audit_logs_request_idx").on(table.requestId, table.createdAt)]
);

export const auditFilterPreferences = mysqlTable(
  "audit_filter_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    fromDate: varchar("fromDate", { length: 10 }),
    toDate: varchar("toDate", { length: 10 }),
    action: varchar("action", { length: 120 }),
    actor: varchar("actor", { length: 160 }),
    search: varchar("search", { length: 160 }),
    range: varchar("range", { length: 16 }).default("custom").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("audit_filter_preferences_user_idx").on(table.userId)]
);

export const paymentLedger = mysqlTable(
  "payment_ledger",
  {
    id: int("id").autoincrement().primaryKey(),
    providerEventId: varchar("providerEventId", { length: 255 }).notNull().unique(),
    providerPaymentId: varchar("providerPaymentId", { length: 255 }).unique(),
    providerOrderId: varchar("providerOrderId", { length: 255 }),
    source: mysqlEnum("source", ["stripe", "paypal", "bit", "owner_test", "owner_manual"]).notNull(),
    eventType: varchar("eventType", { length: 128 }).notNull(),
    userId: int("userId").notNull(),
    planCode: varchar("planCode", { length: 32 }).notNull(),
    amountIls: int("amountIls").notNull(),
    invoiceId: int("invoiceId"),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  table => [index("payment_ledger_user_idx").on(table.userId, table.recordedAt)]
);

export const fulfillmentEvents = mysqlTable(
  "fulfillment_events",
  {
    id: int("id").autoincrement().primaryKey(),
    providerEventId: varchar("providerEventId", { length: 255 }).notNull().unique(),
    source: mysqlEnum("source", ["stripe", "paypal", "bit", "owner_test", "owner_manual"]).notNull(),
    eventType: varchar("eventType", { length: 128 }).notNull(),
    userId: int("userId").notNull(),
    planCode: varchar("planCode", { length: 32 }).notNull(),
    stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
    stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
    providerOrderId: varchar("providerOrderId", { length: 255 }),
    providerPaymentId: varchar("providerPaymentId", { length: 255 }),
    processedAt: timestamp("processedAt").defaultNow().notNull(),
  },
  table => [index("fulfillment_events_user_idx").on(table.userId, table.processedAt)]
);

export const properties = mysqlTable(
  "properties",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    address: varchar("address", { length: 255 }),
    status: mysqlEnum("status", ["active", "vacant", "maintenance"]).default("active").notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("properties_company_idx").on(table.companyId, table.createdAt)]
);

export const clients = mysqlTable(
  "clients",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 40 }),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("clients_company_idx").on(table.companyId, table.createdAt)]
);

export const salesImportBatches = mysqlTable(
  "sales_import_batches",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    kind: mysqlEnum("kind", ["properties", "clients"]).notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileKey: varchar("fileKey", { length: 512 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    rowCount: int("rowCount").default(0).notNull(),
    status: mysqlEnum("status", ["completed", "failed"]).default("completed").notNull(),
    uploadedByUserId: int("uploadedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("sales_import_batches_company_idx").on(table.companyId, table.kind, table.createdAt)]
);

export const salesProperties = mysqlTable(
  "sales_properties",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    importBatchId: int("importBatchId"),
    externalId: varchar("externalId", { length: 160 }),
    name: varchar("name", { length: 220 }).notNull(),
    address: varchar("address", { length: 320 }),
    ownerName: varchar("ownerName", { length: 220 }),
    propertyType: varchar("propertyType", { length: 120 }),
    status: mysqlEnum("status", ["available", "reserved", "sold", "inactive"]).default("available").notNull(),
    areaSqm: int("areaSqm"),
    listPriceIls: int("listPriceIls"),
    isPublished: boolean("isPublished").default(false).notNull(),
    publicDescription: text("publicDescription"),
    publicImagesJson: text("publicImagesJson"),
    paymentPlanJson: text("paymentPlanJson"),
    publicVideoUrl: text("publicVideoUrl"),
    publicTourUrl: text("publicTourUrl"),
    publicFloorPlanUrl: text("publicFloorPlanUrl"),
    publicLatitude: varchar("publicLatitude", { length: 32 }),
    publicLongitude: varchar("publicLongitude", { length: 32 }),
    attributesJson: text("attributesJson"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("sales_properties_company_idx").on(table.companyId, table.status, table.createdAt),
    index("sales_properties_batch_idx").on(table.importBatchId, table.createdAt),
  ]
);

export const propertyInquiries = mysqlTable(
  "property_inquiries",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    salesPropertyId: int("salesPropertyId").notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    phone: varchar("phone", { length: 48 }).notNull(),
    email: varchar("email", { length: 320 }),
    message: text("message").notNull(),
    status: mysqlEnum("status", ["new", "contacted", "closed"]).default("new").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("property_inquiries_company_idx").on(table.companyId, table.status, table.createdAt),
    index("property_inquiries_property_idx").on(table.salesPropertyId, table.createdAt),
  ]
);

export const salesClients = mysqlTable(
  "sales_clients",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    importBatchId: int("importBatchId"),
    externalId: varchar("externalId", { length: 160 }),
    name: varchar("name", { length: 220 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 48 }),
    identityNumber: varchar("identityNumber", { length: 120 }),
    leadSource: varchar("leadSource", { length: 100 }),
    pipelineStage: mysqlEnum("pipelineStage", ["new", "contacted", "qualified", "viewing", "negotiation", "won", "lost"]).default("new").notNull(),
    budgetMinIls: int("budgetMinIls"),
    budgetMaxIls: int("budgetMaxIls"),
    preferredPropertyType: varchar("preferredPropertyType", { length: 120 }),
    preferredLocation: varchar("preferredLocation", { length: 180 }),
    nextFollowUpAt: timestamp("nextFollowUpAt"),
    lastContactedAt: timestamp("lastContactedAt"),
    lostReason: text("lostReason"),
    assignedSalesTeamMemberId: int("assignedSalesTeamMemberId"),
    attributesJson: text("attributesJson"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("sales_clients_company_idx").on(table.companyId, table.createdAt),
    index("sales_clients_batch_idx").on(table.importBatchId, table.createdAt),
    index("sales_clients_company_stage_idx").on(table.companyId, table.pipelineStage, table.updatedAt),
    index("sales_clients_follow_up_idx").on(table.companyId, table.nextFollowUpAt),
    index("sales_clients_assignee_idx").on(table.companyId, table.assignedSalesTeamMemberId),
  ]
);

export const crmClientProperties = mysqlTable(
  "crm_client_properties",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    salesClientId: int("salesClientId").notNull(),
    salesPropertyId: int("salesPropertyId").notNull(),
    interestLevel: mysqlEnum("interestLevel", ["low", "medium", "high"]).default("medium").notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("crm_client_properties_unique").on(table.companyId, table.salesClientId, table.salesPropertyId),
    index("crm_client_properties_client_idx").on(table.companyId, table.salesClientId, table.updatedAt),
    index("crm_client_properties_property_idx").on(table.companyId, table.salesPropertyId),
  ]
);

export const crmActivities = mysqlTable(
  "crm_activities",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    salesClientId: int("salesClientId").notNull(),
    salesTeamMemberId: int("salesTeamMemberId"),
    type: mysqlEnum("type", ["call", "whatsapp", "meeting", "viewing", "email", "note", "other"]).default("note").notNull(),
    subject: varchar("subject", { length: 180 }).notNull(),
    outcome: text("outcome"),
    scheduledAt: timestamp("scheduledAt"),
    completedAt: timestamp("completedAt"),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("crm_activities_client_idx").on(table.companyId, table.salesClientId, table.createdAt),
    index("crm_activities_member_idx").on(table.companyId, table.salesTeamMemberId, table.scheduledAt),
    index("crm_activities_schedule_idx").on(table.companyId, table.scheduledAt),
  ]
);

export const crmStageHistory = mysqlTable(
  "crm_stage_history",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    salesClientId: int("salesClientId").notNull(),
    fromStage: varchar("fromStage", { length: 32 }),
    toStage: varchar("toStage", { length: 32 }).notNull(),
    actorUserId: int("actorUserId").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("crm_stage_history_client_idx").on(table.companyId, table.salesClientId, table.createdAt),
    index("crm_stage_history_stage_idx").on(table.companyId, table.toStage, table.createdAt),
  ]
);

export const salesContracts = mysqlTable(
  "sales_contracts",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    salesPropertyId: int("salesPropertyId").notNull(),
    salesClientId: int("salesClientId").notNull(),
    contractNumber: varchar("contractNumber", { length: 80 }).notNull(),
    status: mysqlEnum("status", ["draft", "active", "completed", "cancelled"]).default("draft").notNull(),
    listPriceIls: int("listPriceIls").notNull(),
    discountKind: mysqlEnum("discountKind", ["none", "fixed", "percentage"]).default("none").notNull(),
    discountValue: int("discountValue").default(0).notNull(),
    discountAmountIls: int("discountAmountIls").default(0).notNull(),
    netPriceIls: int("netPriceIls").notNull(),
    depositIls: int("depositIls").default(0).notNull(),
    balanceIls: int("balanceIls").notNull(),
    paymentFrequency: mysqlEnum("paymentFrequency", ["quarterly", "semiannual", "annual"]).default("quarterly").notNull(),
    termYears: int("termYears").notNull(),
    installmentCount: int("installmentCount").notNull(),
    installmentAmountIls: int("installmentAmountIls").notNull(),
    firstInstallmentAt: timestamp("firstInstallmentAt"),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("sales_contracts_company_number_unique").on(table.companyId, table.contractNumber),
    index("sales_contracts_company_status_idx").on(table.companyId, table.status, table.createdAt),
    index("sales_contracts_property_idx").on(table.salesPropertyId),
    index("sales_contracts_client_idx").on(table.salesClientId),
  ]
);

export const salesInstallments = mysqlTable(
  "sales_installments",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    salesContractId: int("salesContractId").notNull(),
    sequenceNumber: int("sequenceNumber").notNull(),
    dueAt: timestamp("dueAt").notNull(),
    amountIls: int("amountIls").notNull(),
    status: mysqlEnum("status", ["pending", "paid", "overdue", "cancelled"]).default("pending").notNull(),
    paidAt: timestamp("paidAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("sales_installments_contract_sequence_unique").on(table.salesContractId, table.sequenceNumber),
    index("sales_installments_company_due_idx").on(table.companyId, table.status, table.dueAt),
  ]
);

export const salesTeamMembers = mysqlTable(
  "sales_team_members",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["manager", "supervisor", "representative"]).default("representative").notNull(),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("sales_team_members_company_user_unique").on(table.companyId, table.userId),
    index("sales_team_members_company_role_idx").on(table.companyId, table.role, table.status),
  ]
);

export const salesTeamInvitations = mysqlTable(
  "sales_team_invitations",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    role: mysqlEnum("role", ["manager", "supervisor", "representative"]).default("representative").notNull(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
    status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"]).default("pending").notNull(),
    invitedByUserId: int("invitedByUserId").notNull(),
    acceptedByUserId: int("acceptedByUserId"),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("sales_team_invites_company_status_idx").on(table.companyId, table.status, table.createdAt),
    index("sales_team_invites_email_status_idx").on(table.email, table.status),
  ]
);

export const salesAssignments = mysqlTable(
  "sales_assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    salesTeamMemberId: int("salesTeamMemberId").notNull(),
    salesPropertyId: int("salesPropertyId"),
    salesClientId: int("salesClientId"),
    status: mysqlEnum("status", ["active", "closed"]).default("active").notNull(),
    notes: text("notes"),
    assignedByUserId: int("assignedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("sales_assignments_company_member_idx").on(table.companyId, table.salesTeamMemberId, table.status),
    index("sales_assignments_property_idx").on(table.salesPropertyId),
    index("sales_assignments_client_idx").on(table.salesClientId),
  ]
);

export const salesCallInventory = mysqlTable(
  "sales_call_inventory",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    salesClientId: int("salesClientId").notNull(),
    salesTeamMemberId: int("salesTeamMemberId").notNull(),
    callType: mysqlEnum("callType", ["inbound", "outbound", "meeting", "whatsapp", "other"]).default("outbound").notNull(),
    outcome: text("outcome").notNull(),
    interestLevel: mysqlEnum("interestLevel", ["not_interested", "low", "medium", "high", "very_high"]).default("medium").notNull(),
    interestSubject: varchar("interestSubject", { length: 500 }),
    nextCallAt: timestamp("nextCallAt"),
    completedAt: timestamp("completedAt").defaultNow().notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("sales_call_inventory_company_client_idx").on(table.companyId, table.salesClientId, table.createdAt),
    index("sales_call_inventory_member_idx").on(table.salesTeamMemberId, table.createdAt),
  ]
);

export const salesDailyTasks = mysqlTable(
  "sales_daily_tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    salesTeamMemberId: int("salesTeamMemberId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    taskDate: varchar("taskDate", { length: 10 }).notNull(),
    targetContacts: int("targetContacts").default(0).notNull(),
    completedContacts: int("completedContacts").default(0).notNull(),
    status: mysqlEnum("status", ["todo", "in_progress", "done", "cancelled"]).default("todo").notNull(),
    salesPropertyId: int("salesPropertyId"),
    salesClientId: int("salesClientId"),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("sales_daily_tasks_company_date_idx").on(table.companyId, table.taskDate, table.status),
    index("sales_daily_tasks_member_date_idx").on(table.salesTeamMemberId, table.taskDate, table.status),
  ]
);

export const salesMessages = mysqlTable(
  "sales_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    scope: mysqlEnum("scope", ["team", "direct"]).default("team").notNull(),
    senderUserId: int("senderUserId").notNull(),
    recipientUserId: int("recipientUserId"),
    body: text("body").notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("sales_messages_company_created_idx").on(table.companyId, table.createdAt),
    index("sales_messages_recipient_read_idx").on(table.recipientUserId, table.readAt),
  ]
);

export const tasks = mysqlTable(
  "tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["todo", "in_progress", "done"]).default("todo").notNull(),
    dueAt: timestamp("dueAt"),
    assignedToUserId: int("assignedToUserId"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("tasks_company_idx").on(table.companyId, table.createdAt), index("tasks_assignee_idx").on(table.assignedToUserId)]
);

export const tenants = mysqlTable(
  "tenants",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 40 }),
    propertyId: int("propertyId"),
    status: mysqlEnum("status", ["active", "late", "ended"]).default("active").notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("tenants_company_idx").on(table.companyId, table.createdAt), index("tenants_property_idx").on(table.propertyId)]
);

export const contracts = mysqlTable(
  "contracts",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    tenantId: int("tenantId"),
    propertyId: int("propertyId"),
    title: varchar("title", { length: 180 }).notNull(),
    startAt: timestamp("startAt").notNull(),
    endAt: timestamp("endAt").notNull(),
    rentAmountIls: int("rentAmountIls").default(0).notNull(),
    status: mysqlEnum("status", ["active", "expired", "terminated"]).default("active").notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("contracts_company_idx").on(table.companyId, table.createdAt), index("contracts_end_idx").on(table.endAt)]
);

export const maintenance = mysqlTable(
  "maintenance",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    propertyId: int("propertyId"),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
    status: mysqlEnum("status", ["open", "in_progress", "completed", "cancelled"]).default("open").notNull(),
    scheduledAt: timestamp("scheduledAt"),
    costIls: int("costIls").default(0).notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("maintenance_company_idx").on(table.companyId, table.createdAt), index("maintenance_status_idx").on(table.status)]
);

export const operationalPayments = mysqlTable(
  "operational_payments",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    tenantId: int("tenantId"),
    contractId: int("contractId"),
    amountIls: int("amountIls").notNull(),
    method: mysqlEnum("method", ["cash", "bank", "card", "transfer"]).default("bank").notNull(),
    status: mysqlEnum("status", ["paid", "pending", "overdue"]).default("pending").notNull(),
    paidAt: timestamp("paidAt"),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("operational_payments_company_idx").on(table.companyId, table.createdAt), index("operational_payments_status_idx").on(table.status)]
);

export const attendance = mysqlTable(
  "attendance",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    userId: int("userId").notNull(),
    attendanceDate: varchar("attendanceDate", { length: 10 }).notNull(),
    status: mysqlEnum("status", ["present", "absent", "late", "leave"]).default("present").notNull(),
    checkIn: varchar("checkIn", { length: 5 }),
    checkOut: varchar("checkOut", { length: 5 }),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("attendance_company_date_idx").on(table.companyId, table.attendanceDate), uniqueIndex("attendance_company_user_date_unique").on(table.companyId, table.userId, table.attendanceDate)]
);

export const portfolios = mysqlTable(
  "portfolios",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("portfolios_company_idx").on(table.companyId, table.createdAt)]
);

export const buildings = mysqlTable(
  "buildings",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    portfolioId: int("portfolioId").notNull(),
    propertyId: int("propertyId"),
    name: varchar("name", { length: 180 }).notNull(),
    address: varchar("address", { length: 255 }),
    totalUnits: int("totalUnits").default(0).notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("buildings_company_portfolio_idx").on(table.companyId, table.portfolioId), index("buildings_property_idx").on(table.propertyId)]
);

export const units = mysqlTable(
  "units",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    buildingId: int("buildingId").notNull(),
    label: varchar("label", { length: 80 }).notNull(),
    floor: varchar("floor", { length: 40 }),
    bedrooms: int("bedrooms").default(0).notNull(),
    areaSqm: int("areaSqm"),
    status: mysqlEnum("status", ["vacant", "occupied", "reserved", "maintenance"]).default("vacant").notNull(),
    askingRentIls: int("askingRentIls").default(0).notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("units_company_building_idx").on(table.companyId, table.buildingId), uniqueIndex("units_building_label_unique").on(table.buildingId, table.label)]
);

export const buildingFloors = mysqlTable(
  "building_floors",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    buildingId: int("buildingId").notNull(),
    label: varchar("label", { length: 80 }).notNull(),
    floorNumber: int("floorNumber"),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("building_floors_company_building_idx").on(table.companyId, table.buildingId, table.floorNumber),
    uniqueIndex("building_floors_building_label_unique").on(table.buildingId, table.label),
  ]
);

export const buildingRooms = mysqlTable(
  "building_rooms",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    buildingId: int("buildingId").notNull(),
    floorId: int("floorId"),
    label: varchar("label", { length: 120 }).notNull(),
    roomType: mysqlEnum("roomType", ["common", "storage", "parking", "amenity", "office", "retail", "other"]).default("common").notNull(),
    areaSqm: int("areaSqm"),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("building_rooms_company_building_idx").on(table.companyId, table.buildingId, table.createdAt),
    index("building_rooms_floor_idx").on(table.floorId),
    uniqueIndex("building_rooms_building_label_unique").on(table.buildingId, table.label),
  ]
);

export const buildingAmenities = mysqlTable(
  "building_amenities",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    buildingId: int("buildingId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    category: mysqlEnum("category", ["security", "utilities", "recreation", "accessibility", "services", "other"]).default("other").notNull(),
    status: mysqlEnum("status", ["active", "maintenance", "inactive"]).default("active").notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("building_amenities_company_building_idx").on(table.companyId, table.buildingId, table.status),
    uniqueIndex("building_amenities_building_name_unique").on(table.buildingId, table.name),
  ]
);

export const leases = mysqlTable(
  "leases",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    unitId: int("unitId").notNull(),
    tenantId: int("tenantId").notNull(),
    reference: varchar("reference", { length: 80 }).notNull(),
    startAt: timestamp("startAt").notNull(),
    endAt: timestamp("endAt").notNull(),
    monthlyRentIls: int("monthlyRentIls").notNull(),
    securityDepositIls: int("securityDepositIls").default(0).notNull(),
    paymentDueDay: int("paymentDueDay").default(1).notNull(),
    status: mysqlEnum("status", ["draft", "active", "notice", "ended", "terminated"]).default("draft").notNull(),
    renewalNoticeAt: timestamp("renewalNoticeAt"),
    renewalDecision: mysqlEnum("renewalDecision", ["not_requested", "offered", "accepted", "declined"]).default("not_requested").notNull(),
    renewedFromLeaseId: int("renewedFromLeaseId"),
    moveInStatus: mysqlEnum("moveInStatus", ["pending", "ready", "completed"]).default("pending").notNull(),
    moveOutStatus: mysqlEnum("moveOutStatus", ["not_started", "scheduled", "completed"]).default("not_started").notNull(),
    moveOutAt: timestamp("moveOutAt"),
    depositReturnedIls: int("depositReturnedIls").default(0).notNull(),
    handoverNotes: text("handoverNotes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("leases_company_status_idx").on(table.companyId, table.status),
    index("leases_unit_idx").on(table.unitId),
    index("leases_tenant_idx").on(table.tenantId),
    uniqueIndex("leases_company_reference_unique").on(table.companyId, table.reference),
  ]
);

export const recurringCharges = mysqlTable(
  "recurring_charges",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    unitId: int("unitId"),
    tenantId: int("tenantId"),
    description: varchar("description", { length: 255 }).notNull(),
    amountIls: int("amountIls").notNull(),
    dueDay: int("dueDay").default(1).notNull(),
    status: mysqlEnum("status", ["active", "paused", "ended"]).default("active").notNull(),
    nextDueAt: timestamp("nextDueAt"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("recurring_charges_company_idx").on(table.companyId, table.status), index("recurring_charges_unit_idx").on(table.unitId)]
);

export const leaseCollections = mysqlTable(
  "lease_collections",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    leaseId: int("leaseId").notNull(),
    unitId: int("unitId").notNull(),
    tenantId: int("tenantId").notNull(),
    periodLabel: varchar("periodLabel", { length: 80 }).notNull(),
    dueAt: timestamp("dueAt").notNull(),
    amountDueIls: int("amountDueIls").notNull(),
    amountReceivedIls: int("amountReceivedIls").default(0).notNull(),
    status: mysqlEnum("status", ["scheduled", "due", "partial", "paid", "overdue", "waived"]).default("scheduled").notNull(),
    paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank", "card", "transfer", "other"]),
    receivedAt: timestamp("receivedAt"),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("lease_collections_company_status_idx").on(table.companyId, table.status, table.dueAt),
    index("lease_collections_lease_idx").on(table.leaseId, table.dueAt),
    index("lease_collections_unit_idx").on(table.unitId),
    uniqueIndex("lease_collections_lease_period_unique").on(table.leaseId, table.periodLabel),
  ]
);

export const collectionPaymentEvents = mysqlTable(
  "collection_payment_events",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    collectionId: int("collectionId").notNull(),
    leaseId: int("leaseId").notNull(),
    unitId: int("unitId").notNull(),
    tenantId: int("tenantId").notNull(),
    eventType: mysqlEnum("eventType", ["payment", "reversal", "waiver", "adjustment"]).default("payment").notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull().unique(),
    amountIls: int("amountIls").notNull(),
    paymentMethod: mysqlEnum("paymentMethod", ["cash", "bank", "card", "transfer", "other"]),
    reversedPaymentEventId: int("reversedPaymentEventId"),
    effectiveAt: timestamp("effectiveAt").notNull(),
    recordedByUserId: int("recordedByUserId").notNull(),
    requestId: varchar("requestId", { length: 64 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("collection_payment_events_company_idx").on(table.companyId, table.createdAt),
    index("collection_payment_events_collection_idx").on(table.collectionId, table.createdAt),
    index("collection_payment_events_lease_idx").on(table.leaseId, table.effectiveAt),
    uniqueIndex("collection_payment_events_reversal_unique").on(table.reversedPaymentEventId),
  ]
);

export const documents = mysqlTable(
  "documents",
  {
    id: int("id").autoincrement().primaryKey(), companyId: int("companyId").notNull(), propertyId: int("propertyId"), unitId: int("unitId"), title: varchar("title", { length: 255 }).notNull(), category: varchar("category", { length: 100 }).notNull(), fileKey: varchar("fileKey", { length: 500 }).notNull(), fileUrl: varchar("fileUrl", { length: 700 }).notNull(), mimeType: varchar("mimeType", { length: 120 }).notNull(), versionNumber: int("versionNumber").default(1).notNull(), expiresAt: timestamp("expiresAt"), uploadedByUserId: int("uploadedByUserId").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }, table => [index("documents_company_idx").on(table.companyId, table.category), index("documents_expiry_idx").on(table.expiresAt)]
);

export const vendors = mysqlTable(
  "vendors",
  {
    id: int("id").autoincrement().primaryKey(), companyId: int("companyId").notNull(), name: varchar("name", { length: 180 }).notNull(), phone: varchar("phone", { length: 40 }), email: varchar("email", { length: 255 }), specialty: varchar("specialty", { length: 120 }), status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(), createdByUserId: int("createdByUserId").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }, table => [index("vendors_company_idx").on(table.companyId, table.status)]
);

export const workOrders = mysqlTable(
  "work_orders",
  {
    id: int("id").autoincrement().primaryKey(), companyId: int("companyId").notNull(), buildingId: int("buildingId"), unitId: int("unitId"), tenantId: int("tenantId"), vendorId: int("vendorId"), title: varchar("title", { length: 255 }).notNull(), priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(), status: mysqlEnum("status", ["open", "assigned", "in_progress", "resolved", "closed"]).default("open").notNull(), slaHours: int("slaHours").default(48).notNull(), dueAt: timestamp("dueAt"), estimatedCostIls: int("estimatedCostIls"), actualCostIls: int("actualCostIls"), resolvedAt: timestamp("resolvedAt"), createdByUserId: int("createdByUserId").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }, table => [index("work_orders_company_status_idx").on(table.companyId, table.status), index("work_orders_vendor_idx").on(table.vendorId), index("work_orders_tenant_idx").on(table.tenantId)]
);

export const expenses = mysqlTable(
  "expenses",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    buildingId: int("buildingId"),
    category: varchar("category", { length: 100 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    amountIls: int("amountIls").notNull(),
    expenseDate: timestamp("expenseDate").notNull(),
    status: mysqlEnum("status", ["planned", "approved", "paid"]).default("planned").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("expenses_company_date_idx").on(table.companyId, table.expenseDate), index("expenses_building_idx").on(table.buildingId)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type CompanyMember = typeof companyMembers.$inferSelect;
export type CompanyInvitation = typeof companyInvitations.$inferSelect;
export type CompanyActivityLog = typeof companyActivityLogs.$inferSelect;
export type CompanyNotificationRead = typeof companyNotificationReads.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type LicenseKey = typeof licenseKeys.$inferSelect;
export type ManualPaymentRequest = typeof manualPaymentRequests.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type PaymentLedgerEntry = typeof paymentLedger.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AuditFilterPreference = typeof auditFilterPreferences.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type CrmClientProperty = typeof crmClientProperties.$inferSelect;
export type CrmActivity = typeof crmActivities.$inferSelect;
export type CrmStageHistory = typeof crmStageHistory.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Maintenance = typeof maintenance.$inferSelect;
export type OperationalPayment = typeof operationalPayments.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type Building = typeof buildings.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type RecurringCharge = typeof recurringCharges.$inferSelect;
export type LeaseCollection = typeof leaseCollections.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;

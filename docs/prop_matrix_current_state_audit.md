# DAR.EST Current-State Audit for PropMatrix OS V2

**Audit date:** 18 August 2026  
**Scope:** the existing DAR.EST repository, current managed database metadata and aggregate counts, runtime configuration contracts, migrations, dependencies, tests, build output, and deployed-project posture.  
**Directive compliance:** This is an **audit-only** delivery. No business schema, API, workflow, customer data, or target PropMatrix module was changed.

> **Preservation decision:** DAR.EST is a working multi-company property operations product. PropMatrix OS V2 must evolve from this modular monolith through additive migrations and stable contracts; it must not be rebuilt as a disconnected greenfield application.

## 1. Executive current-state conclusion

DAR.EST has a credible operational base: a React/Tailwind web client, Express/tRPC backend, Drizzle/MySQL-TiDB data layer, managed OAuth, company-level roles, manual subscription administration, lease-linked collections, operations, documents, tenant portal, and owner administration. It is **not yet an enterprise-grade PropFintech, LegalTech, CRM, AI, IoT, or spatial platform**. The immediate barriers are dependency vulnerabilities, a large central UI/data/router surface, application-enforced relationship integrity, no isolated real integration database, limited background-work infrastructure, and incomplete financial immutability.

The platform is operationally safe to preserve and incrementally improve. The right architecture remains a **modular monolith first**, with bounded domains and an outbox/worker abstraction introduced before any high-risk external or financial side effect. [1] [2]

## 2. Current architecture

| Area | Verified state | Assessment |
|---|---|---|
| Frontend | React 19, Vite 7, Tailwind 4, Wouter, TanStack Query through tRPC, Radix UI, React Hook Form, Recharts, Hebrew-default 5-language RTL/LTR UI | Mature product shell. `Workspace.tsx` is 141 KB and needs domain decomposition before more operating modules are added. |
| Backend | Node ESM, Express 4, tRPC 11, SuperJSON, Zod, Drizzle ORM | A viable modular-monolith base. `server/routers.ts` is 50 KB and `server/db.ts` is 102 KB, increasing regression risk. |
| Database | MySQL/TiDB via `mysql2` and Drizzle; 27 SQL migrations (`0000`–`0026`) | Additive migration discipline exists. Relationships are predominantly represented by IDs and application checks rather than database foreign keys. |
| API | Typed tRPC router domains: portfolio, portal, documents, operations, finance, auth, account, company, resources, legacy, owner, payments | Strong internal client/server contract. It is not a public versioned REST/OpenAPI integration surface. |
| Authentication | Managed Manus OAuth, signed session/JWT cookies, backend context resolution | Appropriate managed-login base; MFA, SAML/OIDC enterprise SSO, SCIM and service-account policies are not implemented. |
| Authorization | Platform roles plus company owner/admin/manager/member/viewer; granular domain permissions now protect finance, collections, portfolio, leasing, operations and documents | Stronger than generic role-only checks; ABAC conditions, delegation, approval matrices and policy administration are future work. |
| Multi-tenancy | `companyId` scoped operational data plus membership checks and company permission guards | Sound application-layer tenancy. No database row-level security or FK layer independently enforces company consistency. |
| Storage | S3-compatible storage helpers and document metadata (`fileKey`, `fileUrl`) | Metadata works. Tenant-key policy, malware scanning, legal holds, retention, DLP, and download audit controls are incomplete. |
| Background work | A framework heartbeat file exists, but no business scheduler/queue/outbox was verified as active | Scheduled collections, reminders, webhook recovery and external synchronization are not production capabilities yet. |
| Deployment | Manus managed autoscale deployment; checkpoint publishing; no custom Dockerfile required by the current runtime | Suitable for present web workload. Long jobs, workers, MQTT, persistent connections, and high-volume processing require separate capacity planning. |

## 3. Repository, dependencies and routes

The current package defines these production dependency groups: AWS S3 client/presigner; React/Radix/Tailwind interaction libraries; tRPC/TanStack Query/SuperJSON; Express/Jose/Cookie/Dotenv; Drizzle/MySQL; Zod/React Hook Form; Recharts/JSPDF; Wouter; and UI/animation helpers. Development uses Vite, TypeScript, Vitest, Drizzle Kit, esbuild and Manus runtime support. The package manifest also contains a Wouter patch and a Tailwind/nanoid override; PNPM currently warns that the `pnpm` object in `package.json` is no longer read, so this override mechanism must be migrated deliberately rather than assumed effective. [3]

| Client route | Purpose | Production assessment |
|---|---|---|
| `/` | Marketing and subscription entry | Operational marketing page; not a substitute for payment confirmation. |
| `/account` | Subscription and company access context | Existing. |
| `/workspace` | Core management command center | Main operational product surface; requires modularization as scope expands. |
| `/tenant-portal` | Tenant email-scoped contracts, payments and documents | Existing, with limited portal scope. |
| `/owner` | Owner administration, keys, subscriptions and audit | Existing; high-sensitivity surface. |
| `/checkout`, `/payment-confirmation` | Manual payment selection/proof workflow | Existing; confirmation is deliberately not automatic settlement. |
| `/invite/:token` | Company invitation acceptance | Existing. |

## 4. Feature matrix

| Feature | Exists | Complete | Real data | Production-ready today | Problems / audit note |
|---|---:|---:|---:|---:|---|
| User identity and login | Yes | Mostly | Yes | Conditional | Managed OAuth works; enterprise SSO/MFA/SCIM not present. |
| Company tenancy and membership | Yes | Mostly | Yes | Conditional | Application-level isolation; no database RLS/FK enforcement. |
| Company role permissions | Yes | Mostly | Yes | Conditional | Domain permissions added; no ABAC/policy UI/approval matrix. |
| Subscription/licensing | Yes | Mostly | Yes | Conditional | Unique keys, invoices and manual review exist; no automated payment reconciliation. |
| Manual payment proof | Yes | Mostly | Yes | Conditional | Upload/review flow exists; external payment opening is not proof of payment. |
| Legacy properties/clients/tasks/contracts | Yes | Partial | Yes | No | Coexists with newer operating graph; explicit migration/deprecation decision missing. |
| Portfolio/building/unit | Yes | Mostly | Yes | Conditional | Real hierarchy exists; no floors/rooms/amenities/ownership-share model. |
| Tenant and lease lifecycle | Yes | Mostly | Yes | Conditional | Lease activation and lifecycle exist; legal versioning/e-signing absent. |
| Collection schedule and payment events | Yes | Mostly | Yes | Conditional | Lease context, atomic payment projection and idempotency exist; reversals, approvals, double entry and reconciliation are incomplete. |
| Finance center | Yes | Partial | Yes | No | Charges, expenses and arrears exist; AP/AR, owner accounting, multi-currency and statutory reports are absent. |
| Vendors/work orders | Yes | Mostly | Yes | Conditional | Contextual work order and SLA exist; preventive planning/field app/purchase orders absent. |
| Documents | Yes | Partial | Yes | No | Metadata/version/expiry only; governance, scanning, signing and retention incomplete. |
| Tenant portal | Yes | Partial | Yes | Conditional | Read-oriented lease/payment/document access; not a full service/communication portal. |
| Owner administration/audit | Yes | Mostly | Yes | Conditional | Visual audit/admin is real; immutable regulated audit controls and SIEM export absent. |
| KPI charts/exports | Yes | Partial | Yes | Conditional | Operational KPI and CSV/PDF export exist; report definition, scheduling and financial close controls absent. |
| CRM / leads / pipeline | No | No | No | No | No verified lead/contact/opportunity/activity domain. |
| AI copilot/RAG/negotiation | No product workflow | No | No | No | Core helper/component and a ComponentShowcase demo are not a governed customer AI module. |
| IoT/digital twin/predictive maintenance | No | No | No | No | No device identity, telemetry, MQTT, or time-series domain. |
| Spatial/satellite/valuation/sentiment | No | No | No | No | No licensed provider, geospatial model, provenance, or valuation engine. |

## 5. Database inventory and quality

### 5.1 Tables by domain

| Domain | Tables |
|---|---|
| Identity and tenancy | `users`, `companies`, `company_members`, `company_invitations`, `company_activity_logs` |
| Subscription and commercial control | `subscriptions`, `manual_payment_requests`, `invoices`, `license_keys`, `activation_keys`, `payment_ledger`, `fulfillment_events` |
| Audit and preferences | `audit_logs`, `audit_filter_preferences` |
| Legacy management model | `properties`, `clients`, `tasks`, `tenants`, `contracts`, `maintenance`, `operational_payments`, `attendance` |
| Current property operating graph | `portfolios`, `buildings`, `units`, `leases`, `recurring_charges`, `lease_collections`, `collection_payment_events` |
| Operations and documents | `documents`, `vendors`, `work_orders`, `expenses` |

The schema defines useful uniqueness and lookup controls, including unique company slugs and membership pairs, unique key/invoice/token values, company-scoped property indexes, lease reference uniqueness, unique unit labels inside a building, one collection period label per lease, and globally unique payment-event idempotency keys. Key operational indexes cover company/status/date, lease/unit/tenant linkage, expiry, vendors and work orders. [1]

### 5.2 Relationship model and gaps

The primary graph is `company → portfolio → building → unit → lease → collection`, with tenant, vendor, work-order, document and expense context. The older `properties → tenants/contracts/maintenance` structure overlaps that graph. The database schema does not declare relational foreign keys for these logical references. Server helpers validate links and company ownership, but bulk SQL, faulty migration code, or a future bypass could still create orphaned/mismatched references.

### 5.3 Migrations

The repository has 27 Drizzle SQL migrations, beginning at `0000_clumsy_nemesis.sql` and ending at `0026_chubby_mister_fear.sql`. The recent sequence includes the lease collection table, audit-request reference, and collection payment-event ledger. Migrations observed are additive in the latest changes. There is no verified documented backup/restore or rollback runbook for each historical migration. [4]

### 5.4 Current data quality and readiness

An aggregate-only read showed **3 companies**, **3 company-memberships**, **3 subscriptions**, and **1 legacy property**. Core current operational tables sampled — portfolios, buildings, units, tenants, leases, collections, payment events, charges, expenses, vendors, work orders and documents — were empty. This means the database currently validates structural readiness but does **not** provide a populated production-like data set for end-to-end portfolio-to-collection verification. No customer values were read during this audit.

The data issue is not fake production records. Source scanning found simulated content only in `ComponentShowcase.tsx` and ordinary test mocks/fixtures. The Component Showcase should remain unreachable to customers or be clearly labeled as an internal development-only route; it must never be represented as a real AI interaction. [5]

## 6. Security audit

| Control | Current finding | Rating | Required stabilization |
|---|---|---|---|
| Authentication | Managed OAuth, signed session flow and protected tRPC procedures | Medium | Define session lifetime, step-up auth for owner/financial actions, MFA/SSO roadmap. |
| Authorization | Company membership plus domain permissions | Medium | Add ABAC conditions, approval policy and periodic authorization tests. |
| Tenant isolation | Company-scoped helpers and permissions tested | Medium | Introduce DB constraints incrementally; test every new query for cross-company access. |
| Input validation | Zod used at procedure inputs | Low | Centralize reusable domain schemas and response localization. |
| Error safety | Request IDs and safe error metadata added | Low | Centralize error taxonomy, structured server logs and alert routing. |
| Audit logging | Owner audit log and request references exist | Medium | Make regulated finance/legal actions immutable and include before/after policy where lawful. |
| Secrets | Environment contract exposes names, not values | Low | Add startup schema validation, rotation/runbook and environment separation. |
| API abuse controls | No verified route-level rate limit, idempotency outside collections, or webhook policy | High | Add calibrated rate limiting, CSRF/CORS review and idempotency for every money-changing command. |
| File upload security | S3 references and proof uploads exist | High | Enforce MIME/size allowlists, tenant prefixes, scan contract, signed access/expiry and retention policy. |
| Dependencies | Production audit: 1 critical, 21 high, 49 moderate, 10 low vulnerabilities | Critical | Update/remediate in a compatibility-tested security change; do not suppress advisories. |

## 7. Performance, operations and technical debt

| Finding | Severity | Evidence and impact |
|---|---|---|
| Unresolved production dependency vulnerabilities | **Critical** | `pnpm audit --prod` reports 81 issues, including one critical. |
| No isolated real-database test environment | **High** | One real payment-flow test is skipped without `TEST_DATABASE_URL`; safe full payment E2E is blocked. |
| Application-only relational integrity | **High** | No FK declarations observed across the core graph; company and resource consistency rely on code. |
| No verified queue/outbox/scheduler | **High** | Notifications, recurring collections, retrying integrations and future IoT cannot be made durable safely. |
| Financial model not full accounting | **High** | Current event/schedule projection is valuable; lacks reversal, approval, journal, AP/AR and owner payout accounting. |
| Large central modules | **Medium** | Workspace 141 KB, data layer 102 KB, router 50 KB, owner page 46 KB; increases cognitive load and regression risk. |
| Legacy/current domain overlap | **Medium** | `properties/clients/contracts` coexist with `portfolios/buildings/units/leases`; migration ownership unclear. |
| Main frontend bundle | **Medium** | Main JS output is 1.89 MB (522 KB gzip), above Vite’s 500 KB warning; should be code-split by route/domain. |
| Manual commercial settlement | **Medium** | Correctly avoids auto-activation on link click, but review workload and reconciliation remain manual. |
| No legal/document governance | **Medium** | Version metadata only; signing, retention, legal holds, sensitive download audit absent. |
| Demo showcase in source | **Low** | Simulated AI content is confined to the Component Showcase, but needs route governance. |
| Package manager config warning | **Low** | Current PNPM ignores configured package patch/override location, creating reproducibility risk. |

## 8. Test, build and deployment verification

The audit reran validation without modifying business logic. TypeScript completed successfully. Vitest completed with **73 passing tests** across 21 files, with **one skipped** isolated real-database payment test. The production build completed successfully. The build issued two important non-failing warnings: a runtime-resolved Manus storage asset reference and a 1.89 MB main JS bundle. [3] [6]

This is good contract-level coverage for the current modular monolith, but it is not an end-to-end guarantee. There is no populated, isolated staging database and no verified real settlement, file scanning, third-party webhook, e-signing, AI, IoT, or spatial integration journey.

## 9. PropMatrix OS V2 migration plan

### Phase A — stabilization before target modules

1. Remediate critical/high dependency advisories in a compatibility branch with the existing test/build suite plus browser smoke tests.
2. Provision an isolated `TEST_DATABASE_URL`, migration fixtures and data-reset strategy. Run tenancy, collection, manual proof and owner approval flows end to end there.
3. Establish an application event/outbox abstraction, job runner contract, request metrics, alerting policy and per-domain idempotency strategy.
4. Create an explicit canonical-property migration decision: retain, map, archive, or retire each legacy table only after a field-level data inventory and backup.
5. Split `Workspace`, `db.ts` and `routers.ts` into domain modules without changing public tRPC names; preserve adapters during each slice.

### Phase B — core PropMatrix operating modules

1. **Enterprise tenancy/RBAC/ABAC:** extend the existing company and permission model; do not reimplement identity.
2. **Canonical property graph:** add floors, rooms, amenities, asset status, ownership shares and controlled reference constraints to the current portfolio/building/unit hierarchy.
3. **Leasing and legal:** versioned agreements, amendments, approval workflow, secure signing-provider adapter and legally governed document retention.
4. **CRM:** introduce separate leads, contacts, opportunities, activities, communication consent and pipeline tables; do not overload tenants or legacy clients.
5. **Financial operations:** evolve `collection_payment_events` into a reconciled event ledger with reversal/waiver/adjustment events, then journal postings, owner statements, AP/AR and payouts. Multi-currency is introduced only with integer minor units and effective exchange-rate provenance.

### Phase C — workflow, reporting and intelligence

1. Preventive maintenance, inspection, procurement/BOQ and vendor portal workflows build on the existing work-order module.
2. Reporting gains parameterized definitions, as-of timestamps, permissions and scheduled delivery only after the worker/outbox foundation.
3. AI becomes a governed gateway with input classification, document permission filtering, prompt/audit records, spend budgets, response provenance and human approval. Component demonstrations are removed from customer paths before this stage.
4. RAG begins with approved document corpus and tenant-scoped retrieval; Legal AI requires jurisdiction/legal review and cannot be marketed as legal advice.

### Phase D — connected and spatial property intelligence

1. Add device registry, encrypted credentials, telemetry ingest, time-series storage, alerting and digital-twin projections only when a real device/provider is selected.
2. Add geospatial, satellite, neighborhood and valuation providers only after licensing, provenance, update cadence and confidence-model contracts are agreed.
3. Extract a module into a separate service only when independent scale, compliance isolation, deployment cadence or availability requirements justify it. Until then, retain the modular monolith.

## 10. Release gate for each future phase

Every PropMatrix increment must follow: **audit → plan → additive schema migration → contract tests → isolated database integration tests → authenticated browser verification → documentation → checkpoint publication**. A feature is not complete merely because a card renders. It must demonstrate correct company isolation, permission enforcement, error behavior, auditability and a real data path.

## References

[1]: ../drizzle/schema.ts "DAR.EST Drizzle schema and typed database contracts"
[2]: ../server/routers.ts "DAR.EST tRPC router domains and procedure boundaries"
[3]: ../package.json "DAR.EST dependency manifest and build/test scripts"
[4]: ../drizzle/ "DAR.EST SQL migration history, 0000 through 0026"
[5]: ../client/src/pages/ComponentShowcase.tsx "Internal component demonstration content"
[6]: ./../prop_matrix_audit_validation.txt "Audit validation output: dependency scan, TypeScript, Vitest and production build"

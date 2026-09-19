# DAR.EST — Enterprise Platform Audit

**Scope:** repository, architecture, data model, API contracts, authorization, runtime configuration, frontend structure, test posture, and production dependencies.  
**Audit date:** 18 August 2026.  
**Audit stance:** preserve the operating platform and its customer data; migrate incrementally through additive, reversible changes.

## 1. Executive assessment

DAR.EST is a functioning **multi-company property-operations modular monolith**, not an empty marketing shell. It already connects portfolio, building, unit, tenant, lease, collection, finance, maintenance, vendor, document, subscription, owner administration, and tenant-portal workflows. Company-level isolation, server-side input validation, five-language UI support, subscription gating, and commercial subscription administration are present.

The product is not yet an enterprise PropFintech/LegalTech/AI/IoT operating system. Its most important constraints are a single large frontend workspace, a similarly centralized data layer, dual legacy and operational domain models, missing database-enforced foreign-key strategy, no event/outbox/idempotency infrastructure, limited runtime security middleware, no isolated integration database, and an unresolved production-dependency audit.

## 2. Current architecture

| Layer | Verified implementation | Assessment |
|---|---|---|
| Application | React 19 + Vite client, Express 4 server, tRPC 11 procedures | Suitable modular-monolith base; API router and core data module need progressive domain splitting. |
| Data access | Drizzle ORM over MySQL/TiDB; migrations through `drizzle/` | Operationally viable; relationship integrity and financial immutability require strengthening. |
| Identity | Manus OAuth, signed JWT cookie, bearer fallback for restricted browser contexts | Strong managed-login base; no MFA, service identities, SCIM, or enterprise SSO policy layer. |
| Tenant isolation | `companyId` on operational records; membership lookup and `requireCompanyPermission` at tRPC boundary; company-scoped DB helper guards | Good foundation, but enforcement relies on application discipline rather than database row-level security. |
| Authorization | Company roles: owner/admin/manager/member/viewer; platform roles: admin/manager/support/analyst | Two clear authorization planes exist; permissions remain broad for finance, legal, export, and destructive actions. |
| Files | S3/Forge key-based storage and document metadata | File metadata exists; tenant-prefixed key convention, content scanning, retention, legal holds, and signed-download governance are absent. |
| UI | Hybrid Glass dark RTL/LTR design, Hebrew default, Arabic/English/Russian/Ukrainian support, commercial Workspace | Strong visual foundation; `Workspace.tsx` is 139 KB and should be decomposed by bounded context. |

## 3. Verified domain coverage

| Available now | Notes |
|---|---|
| Portfolio → building → unit hierarchy | Occupancy status, rent targets, and company-scoped hierarchy. |
| Leasing lifecycle | Lease activation, renewal decision, move-in/move-out readiness, deposit tracking. |
| Collection ledger | Lease-linked periods, payment recording, partial/paid/overdue handling, finance arrears aggregation. |
| Operations | Vendors, contextual work orders, priority, SLA, estimated/actual resolution cost. |
| Finance | Recurring charges, expenses, operational payments, collection-derived arrears indicator. |
| Documents | Metadata, version, expiry indicators, S3 references. |
| Collaboration | Company members, invitations, company activity log, visual owner audit control center. |
| Commercial control | Subscription plans, activation keys, invoices, manual payment verification, owner controls. |
| Tenant access | Email-scoped tenant portal for contracts, payments, and documents. |

## 4. Highest-priority findings

### P0 — address before advertising enterprise-grade security

1. **Dependency posture is not production-ready.** `pnpm audit --prod` reports **81 vulnerabilities**: 1 critical, 21 high, 49 moderate, and 10 low. The dependency graph must be upgraded and regression-tested in a dedicated hardening change; it must not be ignored because the UI currently works.
2. **Runtime perimeter is minimal.** The Express server currently registers large JSON and URL-encoded parsers (50 MB) and tRPC routes, but no explicit security-header policy, per-route body limits, rate limiting, request correlation ID, centralized error envelope, or abuse-control layer.
3. **Financial records are mutable aggregates.** Collection and payment state updates are useful operationally, but enterprise finance needs append-only payment events, reversals/refunds, idempotency keys, approval states, immutable journal references, and reconciliation controls rather than only mutable received totals.
4. **Data integrity is application-enforced.** The schema uses indexes and unique constraints effectively but no database foreign-key declarations for the core operational graph. Cross-company linkage is guarded in server helpers, which is good, but the database cannot independently reject orphaned or mismatched references.

### P1 — required for an operating-system baseline

1. **Split the central modules.** `client/src/pages/Workspace.tsx` (139 KB), `server/db.ts` (approximately 100 KB), and `server/routers.ts` (approximately 50 KB) combine multiple bounded contexts. The application should be split into portfolio, leasing, collections, finance, operations, documents, and company modules behind the existing tRPC boundary.
2. **Resolve overlapping models.** The legacy `properties`, `clients`, `tasks`, `contracts`, `maintenance`, and `operational_payments` tables coexist with the newer portfolio/lease/work-order/collection model. Each must be explicitly classified as retained, migrated, or deprecated before new modules depend on it.
3. **Strengthen authorization vocabulary.** Current permissions group finance, document, operational, and deletion actions under broad `workspace.write`. Add narrowly scoped permissions such as `collections.record`, `finance.approve`, `documents.export`, `leases.terminate`, and `members.invite` before delegating sensitive work.
4. **Build durable operations infrastructure.** The current platform has no verified event bus, transactional outbox, queue worker, idempotency middleware, scheduled collection generation, notification preference model, or webhook verification model.
5. **Build test tiers.** The repository has meaningful contract coverage (including collection contracts), but only one skipped real-database integration test because `TEST_DATABASE_URL` is absent. Enterprise acceptance needs isolated database integration tests and authenticated end-to-end workflows.

### P2 — high-value strategic expansion, deliberately deferred

Dynamic rent pricing, cash sweeping, AI negotiation, legal redlining/RAG, renovation/BOQ generation, IoT digital twins, MQTT, satellite data, neighborhood sentiment, valuation, spatial intelligence, and external data pipelines are not present. They require new data governance, explicit user approval, external-provider contracts, background execution, model-cost controls, and human-approval checkpoints. They must not be simulated as product functionality before those controls exist.

## 5. Security and governance assessment

| Area | Current state | Required enterprise direction |
|---|---|---|
| Input validation | Strong Zod schemas on many tRPC mutations | Standardize schemas by domain and return localized safe errors. |
| Auth | Managed OAuth + signed sessions | Add policy for session lifetime, reauthentication on sensitive actions, MFA/SSO roadmap, service accounts only when needed. |
| Tenant isolation | Company-scoped functions and membership permissions | Add shared authorization service and database relationship constraints; test cross-company access systematically. |
| Auditability | Platform audit log and company activity log | Make financial/legal audit entries immutable and searchable with actor/request/correlation metadata. |
| File protection | Stored S3 references | Use tenant-scoped object prefixes, MIME and size allowlists, malware scanning contract, expiry and legal retention policy. |
| Secrets/configuration | Environment facade exists | Add startup schema validation, environment separation, and secret-rotation runbook. |
| Abuse resistance | No verified explicit rate limit or idempotency layer | Add safe API throttling, idempotency keys for money-changing commands, and request-size limits by endpoint. |

## 6. Data and financial assessment

All currently modeled amounts are ILS integer values, which is appropriate for the initial commercial target and avoids floating-point display errors in the existing UX. A multi-currency engine must not be bolted on as display formatting; it requires currency code, integer minor units, exchange-rate source/effective date, immutable accounting entries, and reporting semantics.

The collection ledger is a correct first operational step: it is contextual to a lease, unit, and tenant; prevents duplicate periods per lease; supports due/partial/paid/overdue/waived status; and feeds real arrears to the finance center. The next finance milestone is not another summary card. It is a **payment event and reconciliation domain** that creates an immutable trail and projects the convenient ledger read model from it.

## 7. Frontend and user-experience assessment

The Workspace is visually coherent in Hebrew RTL and responsive at the verified desktop and mobile viewports. It is an operational command center rather than a disconnected CRUD page. However, the file’s size and conditional surface area raise regression risk. The UI should be decomposed into independent, testable panels that preserve the same contexts: `Portfolio`, `Leasing`, `Collections`, `Finance`, `Operations`, `Documents`, and `Decisions`.

The browser log also contains repeated Recharts warnings about zero-width/zero-height rendering. This does not prevent use today, but it should be repaired with stable chart-container sizing before it becomes a production-console noise source.

## 8. Recommended target architecture

Do **not** replace the operating monolith with microservices. Evolve it into a domain-oriented modular monolith first:

1. **Core platform:** identity, company tenancy, permissions, subscriptions, audit, configuration, feature flags.
2. **Property operations:** portfolio, building, unit, leasing, tenant, owner, maintenance, vendors.
3. **Financial operations:** charge schedule, collection events, payment reconciliation, expenses, payable/receivable reporting.
4. **Collaboration:** documents, notifications, workflow approvals, tenant and vendor portals.
5. **Intelligence (later):** search, reporting, governed AI assistants, then IoT/spatial integrations behind explicit provider adapters.

Keep one deployable server and one primary database during this stage. Add a transactional outbox and worker abstraction before any external side effect becomes critical. Introduce Redis, a vector store, time-series storage, or separate services only after a concrete, measured need.

## 9. Audit conclusion

The correct next implementation is **enterprise foundation hardening plus an immutable collection-event foundation**, not artificial AI/IoT screens. It directly increases commercial value, improves the customer’s financial trust, and creates the technical path for reconciliation, notifications, reports, owner statements, and later pricing intelligence. It also preserves every existing customer workflow and company boundary.

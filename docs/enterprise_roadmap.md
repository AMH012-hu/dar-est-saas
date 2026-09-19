# DAR.EST — Enterprise Operating System Roadmap

**Principle:** evolve the current multi-company property platform; do not replace it with a disconnected project or imitate unbuilt integrations. Each increment is additive, migration-led, permissioned, auditable, and covered by contract tests.

## Delivery sequence

| Increment | Business outcome | Technical scope | Status |
|---|---|---|---|
| E0 — audit | A factual modernization baseline | Architecture map, dependency finding, security and data-risk inventory | Complete |
| E1 — operating foundation | Safer, traceable actions across every company workflow | Request context/correlation, safe error policy, authorization vocabulary, immutable audit-event foundation, dependency remediation plan | Next |
| E2 — financial truth | A defensible income and arrears record | Immutable collection payment events, reversals, idempotency, reconciliation states, owner/finance reporting projections | First connected module |
| E3 — property graph | A richer physical and ownership model | Floors, rooms, amenities, ownership shares, asset status, property document association, stricter relationship constraints | Planned |
| E4 — leasing and legal control | Governed contract lifecycle | Versioned lease documents, amendments, approval/signing adapters, expiry automation, deposits and escalations | Planned |
| E5 — CRM and engagement | Revenue and relationship workflow | Leads, contacts, activities, pipeline, communications adapters, consent and retention rules | Planned |
| E6 — workflow and portals | Faster operational execution | Approvals, notifications, vendor and owner portal experiences, document requests, service SLAs | Planned |
| E7 — intelligence platform | Explainable decision support | Permission-aware search, retrieval over approved documents, AI activity audit, human approvals, cost limits | Planned after data governance |
| E8 — connected property | Measured asset conditions | Provider adapters, device registry, telemetry model, alerting, digital-twin read models | Planned after worker/event infrastructure |
| E9 — spatial and market intelligence | Location-aware valuation and planning | Geospatial provider adapter, comparables, scenario models, provenance and confidence display | Planned after trusted data sources |

## Architecture boundary map

| Module | Owns | External contracts it may consume | Extraction trigger |
|---|---|---|---|
| Core platform | Company, membership, permission, subscription, feature access, audit context | OAuth, email, notification | Separate only with independently scaling IAM needs |
| Property operations | Portfolio, building, unit, tenancy, owner ownership records | Maps/geocoding later | High volume geospatial writes or independently deployed field apps |
| Leasing | Lease lifecycle, signed versions, deposits, renewal policy | E-signing provider later | Regulatory signing workload or regional legal services |
| Financial operations | Charges, collection events, reconciliation, expenses, payouts | Bank/payment data only through verified adapters | Regulated ledger workload and isolation requirement |
| Operations | Work orders, vendors, inspections, preventive work | Calendar, contractor systems later | High-volume work-order scheduling |
| Documents | Metadata, versioning, access policy, retention | S3 and malware-scanning provider later | Dedicated content governance or legal hold requirements |
| Engagement | CRM, activities, consent, communications | WhatsApp/email/SMS via approved adapters | High-volume campaign automation |
| Intelligence | Query routing, prompt policy, AI activity log, approved retrieval | LLM/vector/search providers later | Cost, latency, or regulatory isolation needs |

## Non-negotiable engineering rules

1. Every stored business record remains company-scoped. Every query, mutation, cache key, object-storage key, event, and external call carries a company context.
2. Money-changing actions must be idempotent and append-only at the event layer. Summaries are projections, not the source of truth.
3. Sensitive actions create an audit entry with actor, company, action, resource, request/correlation context, and safe before/after metadata where permitted.
4. New data structures are additive first. Destructive migrations require an explicit data-backfill plan, a rollback plan, and a verified backup.
5. AI, finance integrations, signing, IoT, and market-data features are gated behind real provider contracts, permissions, cost controls, and human approval. No synthetic claim of automation is exposed to customers.
6. The existing tRPC contracts remain stable where practical. New modules use explicit versioned procedures and migration adapters rather than silent behavior changes.

## E1 — Foundation hardening backlog

| Work item | Acceptance condition | Preserves |
|---|---|---|
| Request context | A unique request ID reaches tRPC errors and sensitive audit events without exposing internals to clients | Existing OAuth/session behavior |
| Safe error contract | Zod, permission, and unknown errors return localized, non-secret user messages and server-log correlation IDs | Existing procedure names and inputs |
| Authorization vocabulary | Finance, collection, document, membership, and destructive actions have explicit permission names | Existing roles through compatible permission mapping |
| Audit-event baseline | A typed append-only event schema is available for new sensitive modules | Current visual activity and owner logs |
| Runtime perimeter plan | Endpoint body-size, security headers, rate limits, CORS, and CSRF posture are documented before changing managed platform defaults | Manus deployment integration |
| Dependency remediation | Critical and high production advisories are updated in a compatibility-tested change, not bypassed | Locked production build behavior |

## E2 — Financial truth backlog

The existing `lease_collections` table remains the operational schedule/read model. E2 introduces an immutable `collection_payment_events` ledger that records payment, reversal, waiver, or adjustment events against a collection period. A projection calculates `amountReceivedIls`, current state, and arrears. This creates a migration path without deleting existing periods or confusing managers who rely on the current Workspace.

| Capability | Required controls |
|---|---|
| Record payment event | Company-scoped lease/tenant/unit validation, positive ILS integer, idempotency key, actor, method, effective time, reference, notes. |
| Reverse / correct payment | Permission gate, immutable compensating event, reason, link to original event, audit event. |
| Waive / adjust amount | Finance approval permission, reason, provenance, audited state change. |
| Reconcile | Separate pending/confirmed/failed/reversed status; no automatic approval based only on a clicked external link. |
| Statements and reports | Derived owner, unit, lease, and tenant views, with clear as-of time and source-of-truth labeling. |

## Strategic scope mapping

| Requested capability family | Earliest safe increment | Reason it is not simulated now |
|---|---|---|
| Multi-currency, AR/AP, owners and payouts | E2 then E3 | Needs immutable ledger, exchange-rate policy, and ownership model. |
| Lease templates, amendments, signing, legal analysis | E4 | Needs versioned files, legal retention, signing-provider and jurisdiction policy. |
| CRM, calls, WhatsApp, email, lead scoring | E5 | Needs consent, channel integrations, workflow queue, and retention controls. |
| RAG, AI copilot, demand/rent prediction, negotiation | E7 | Needs approved corpus, prompt injection controls, model cost controls, quality evaluation, and human decisions. |
| IoT, digital twin, MQTT, predictive maintenance | E8 | Needs device identity, queue/worker infrastructure, telemetry storage, and security model. |
| GIS, satellite, neighborhood data, valuation | E9 | Needs trusted licensed data sources, geospatial storage, provenance, and scenario validation. |

## First implementation decision

The first feature increment is **E1 foundation + the E2 payment-event spine**. It produces direct commercial value: a property manager can trust that payment actions are attributable, idempotent, reversible by a compensating action, and connected to the lease collection view. It is also the prerequisite for reliable owner reports, reconciliation, pricing intelligence, notifications, and regulated integrations.

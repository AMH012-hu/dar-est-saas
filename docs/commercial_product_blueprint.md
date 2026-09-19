# DAR.EST Commercial Product Blueprint

## Product promise

DAR.EST is not a spreadsheet replacement. It is an operating system for property owners and management teams: it converts lease obligations, rent collection, maintenance, vendor work, documents, and portfolio performance into connected workflows with visible accountability.

## Value centers

| Center | Customer outcome | Initial workflows |
|---|---|---|
| Portfolio | Know what is owned, occupied, vacant, and at risk | properties, buildings, units, occupancy, owner records |
| Operations | Resolve work with ownership and deadlines | work orders, vendors, inspections, recurring tasks, approvals |
| Finance | Know what is due, collected, spent, and profitable | recurring charges, invoices, receipts, expenses, arrears, cash summary |
| Relationships | Give tenants, owners, and vendors a useful self-service experience | requests, messages, documents, status tracking, invitations |
| Insights | Make decisions from portfolio-level truth | occupancy, collection rate, delinquency, maintenance SLA, revenue and cost trends |
| Governance | Keep every action controlled and auditable | roles, permission matrix, audit events, exports, retention, backups |

## Commercially important entities

The next data model should treat a property as a hierarchy: portfolio -> property/building -> unit -> lease -> tenant. Financial records should reference a lease or unit whenever possible. Maintenance should reference a unit, requester, vendor, priority, SLA timestamps, status history, and cost. Documents should reference an entity, owner, version, and expiry date. All records must include company ownership and audit context.

## Definition of a sellable release

A release is sellable only when a pilot customer can onboard a company, import or create a portfolio, configure units and leases, collect or record a charge, open and resolve a maintenance request, upload a document, invite a team member, review a portfolio report, and export their records without administrator intervention. Each workflow must include permissions, validation, error handling, loading states, audit history, and an evidence-backed test.

## Delivery sequence

First build the data and workflow center for finance, leases, maintenance, and documents. Then add tenant/owner/vendor portals and automation. Finally add advanced analytics, integrations, billing, backup/recovery, and launch controls. Existing modules should be upgraded into these connected workflows instead of being discarded.

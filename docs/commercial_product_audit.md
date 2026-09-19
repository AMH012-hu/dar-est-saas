# DAR.EST Commercial Product Audit

## Current baseline

The product already includes a working SaaS foundation with company-level isolation, role-aware access, subscription records, activation keys, multilingual UI, and operational CRUD modules for properties, clients, tasks, tenants, maintenance, contracts, payments, and attendance. The Workspace and Owner surfaces have a strong visual baseline.

## Immediate technical issue

The development log contains a historical Vite parser error in `client/src/pages/Workspace.tsx` caused by escaped quotes such as `id: \\"task-\\"`. The server was restarted afterward and TypeScript reported no errors, but this file must be rechecked before adding major features so the active preview is not masking a stale client parse failure.

## Commercial value gaps

The current operational model is closer to a structured property register than a complete property operations system. The highest-value gaps are: a unified work-order lifecycle, tenant and owner portals, rent collection and arrears management, recurring invoices and expense categorization, lease lifecycle automation, document storage and versioning, inspection workflows, vendor management, portfolio-level reporting, configurable approvals, and actionable automation.

## Product architecture target

The next version should be organized around five centers: Portfolio, Operations, Finance, Relationships, and Insights. Each center must have real workflows, persistent state, company isolation, role permissions, audit history, loading and empty states, and a measurable outcome for the paying customer.

## Quality gate

No claim of full commercial readiness should be made until the main workflows are tested with an isolated database, the payment/manual-approval path is documented, backups and recovery are verified, and a pilot user can complete a realistic property-management cycle from onboarding through reporting.

# DAR.EST — Commercial Readiness Review

## Delivered in the current expansion

DAR.EST now contains a company-isolated portfolio hierarchy (portfolio, building, and unit), a finance center for recurring charges, expenses, collection exposure, and arrears indicators, an operations center for vendors and work orders with priority and SLA fields, a document center with S3 metadata references, versions, and expiry indicators, and a tenant portal scoped by the signed-in email.

The Workspace already provides in-app notifications for overdue tasks, open maintenance, and recent activity, with filtering and read-state controls. Sensitive owner and company actions are protected by role and company permissions, and audit records are available through the owner controls with export support.

## Verification status

| Area | Result | Evidence |
|---|---|---|
| TypeScript | Passed | `pnpm check` |
| Automated contracts | Passed | 61 tests passed |
| Real database integration | Not executed in this sandbox run | The isolated `TEST_DATABASE_URL` is not configured; the real integration test is skipped rather than replaced with fake data. |
| Production build | Passed | `pnpm build` |
| Visual review | Passed for Workspace and tenant portal | Desktop preview captured successfully. |
| Company isolation | Covered by contract tests and server-side company checks | Cross-company access is rejected or returns no data. |

## Operational limitations before external sale

The current product does not claim payment success from opening PayPal or bit links. Manual payment confirmation remains an explicit review flow. A production operator should configure the real isolated integration database test environment, review S3 permissions and retention, configure a production backup policy, and complete a live payment-reconciliation test with real credentials before selling access.

Scheduled notifications must use the platform Heartbeat callback contract under `/api/scheduled/*`; the application must be deployed before creating any schedule. No in-process timers are used. This avoids presenting a sandbox timer as a production automation guarantee.

## Recommended release gate

A release candidate is suitable for controlled pilot use after the owner completes the external-credential checks above. It should not be described as having completed a 100% real-world integration test until the isolated database and payment-provider checks have run successfully.

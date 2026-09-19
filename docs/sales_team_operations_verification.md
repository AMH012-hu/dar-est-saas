# Sales Team Operations Verification — 2026-08-18

The sales-operations extension provides a company-scoped team model for **managers, supervisors, and representatives**. A signed-in employee joins through an email-bound, expiring invitation rather than a free-text company claim; this prevents a sales account from selecting or viewing another company.

| Area | Implemented behaviour |
|---|---|
| Team access | `sales_team_members` scopes a sales role and active status to one company. Company owners/admins/managers and sales managers/supervisors receive management access; active representatives see only their own tasks, assignments, and attendance. |
| Onboarding | `sales_team_invitations` stores only a SHA-256 token hash. Acceptance verifies the current account email, pending status, and expiry before creating the membership. |
| Daily operations | Managers and supervisors can create daily target-based tasks, assign a sales property or client, review company-day attendance, and update team roles/status. Representatives update only their own assigned work and attendance. |
| Messaging | Company-scoped team messages and direct messages validate an active recipient in the same sales team. Conversation history is loaded only through the protected company context. |
| User experience | `/sales` is a five-language, RTL-aware responsive workspace. `/sales/invite/:token` is the protected invitation acceptance page. |

| Verification | Result |
|---|---|
| Database migration | Migration `0029_amused_mattie_franklin.sql` was generated, reviewed as additive, and applied. |
| TypeScript | `pnpm exec tsc --noEmit` passed. |
| Tests | Vitest passed **82 tests**; the only skipped test remains the pre-existing isolated real-database test, which requires `TEST_DATABASE_URL`. `salesTeamContracts.test.ts` verifies the schema, server contracts, workspace, invitation page, and routes. |
| Production build | `pnpm build` passed. The existing large client-bundle advisory is not a build failure. |
| Desktop visual review | `/sales` rendered the full Hebrew/RTL manager workspace with attendance, daily tasks, messages, assignments, team invitations, and management cards. `/sales/invite/invalid-preview-token` rendered the invitation acceptance shell correctly. |
| Mobile visual review | `/sales` rendered as a readable single-column workspace at 375×812 with no visible overlap or clipped controls. |
| Real operational data | No customer, representative, task, or sale data was fabricated. A full live transaction test requires an authorized company to create a real invitation and import operational sales data. |

The **AI property assistant with voice interaction** is intentionally excluded from this checkpoint and remains the next separate feature, as requested after the sales-operations core.

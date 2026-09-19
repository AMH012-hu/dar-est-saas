# Sales Access Fix Verification — 2026-08-18

## Problem observed

The authenticated `/workspace` shell previously contained the Sales Center panel lower in the page, while `/sales` separately contained team operations. This split the sales workflow across two locations and exposed preserved import columns as raw JSON during record editing.

## Fix applied

The Workspace sidebar and overview actions now direct users to one localized sales route in every supported language:

| Entry | Destination | Purpose |
|---|---|---|
| Sales Center | `/sales` | Opens the unified, company-scoped sales workspace: source batches, property and client records, contracts, discounts, deposits, installments, and payment-plan calculations. |
| Sales team | `/sales` | Opens the same sales workspace at its team operations: roster access, assignments, daily tasks, attendance, messages, and the property assistant, subject to existing role checks. |

The old `#sales` Workspace anchor and its embedded panel mount were removed. The Sales Center is now the first operational section of `/sales`, before team tools. Original spreadsheet columns that are not normalized into standard record fields are shown as readable key/value details instead of a raw JSON text area; normalized sales fields remain individually editable.

## Desktop review

The `/workspace` navigation preserves visible localized entry points, and `/sales` is the single dedicated sales workspace. The unauthenticated preview may show the existing access/loading boundary; authenticated data entry remains dependent on an authorized company user and a genuine import file. The route wiring preserves `/sales/invite/:token` before `/sales`, so invitation acceptance remains a distinct flow.

TypeScript, the focused sales-center contract test, the complete Vitest suite, and the production build were run after the change. The existing isolated real-database test remains skipped when `TEST_DATABASE_URL` is unavailable; no customer, sales, or spreadsheet data was fabricated for verification.

The unified page is designed with the existing responsive layouts. Publication follows the final task checkpoint.

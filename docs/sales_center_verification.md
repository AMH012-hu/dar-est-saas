# Sales Center Verification — 2026-08-18

The Sales Center is available through the dedicated authenticated `/sales` route, where it is rendered before sales-team operations. Workspace entry points now navigate to `/sales`; the former embedded Sales Center mount and `#sales` anchor were removed. The route retains company-scoped spreadsheet imports for property and client batches, guarded full-batch deletion, editable normalized property and client fields, contract calculations, and payment schedules from one to five years.

Imported spreadsheets retain every original column. Standard fields such as property name, address, type, status, area, price, client name, email, phone, and identity number are normalized into editable record fields. Other source columns are rendered as readable key/value details rather than a raw JSON editing area. After each import, the application presents a localized summary of source headers, mapped headers, retained headers, and readiness warnings for client contact details and contract prices.

| Verification | Result | Evidence |
|---|---|---|
| TypeScript | Passed | `pnpm exec tsc --noEmit` completed without errors. |
| Unit and contract tests | Passed | Vitest reported **84 passed** tests and **1 skipped** isolated real-database test. `salesCenterContracts.test.ts` covers route wiring, removal of the old Workspace mount, structured imported fields, import summaries, and representative Hebrew/Arabic/English spreadsheet headers. |
| Production build | Passed | `pnpm build` completed and created the production server bundle. |
| Dedicated sales route and responsive layout | Passed | `/sales` and its Workspace entry controls were captured at desktop and mobile breakpoints after the unified-route correction. |
| Isolated live sales interaction | Pending authorized operational data | The captured environment contains no real import batch. Uploading a genuine `.xlsx`, `.xls`, or `.csv` file and creating a contract still requires an authorized user to supply operational data; no customer, property, or contract data was fabricated for verification. |

The current published release includes the dedicated `/sales` route, structured imported-column details, and the protected import summary. A future live-data check can be performed with an authorized company and a genuine source spreadsheet.

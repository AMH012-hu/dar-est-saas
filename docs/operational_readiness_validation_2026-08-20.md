# Operational readiness validation — 2026-08-20

## Scope

This validation closes the focused operational-readiness work for the portfolio, Sales Center, shared accessible interface contracts, and the currently supported company-settings experience. It does not change the manual WhatsApp payment and activation-key approval flow.

| Validation area | Evidence | Result |
| --- | --- | --- |
| Portfolio data failure | The shared portfolio boundary uses localized error copy in five languages and a retry action when a required portfolio query fails. | Passed by source contract and production build. |
| Sales data failure | Sales Hub, properties, clients, contracts, and import batches use the shared localized sales failure boundary and retry action rather than treating a failed query as empty data. | Passed by source contract and production build. |
| Successful empty state | Portfolio/building/unit lists and Sales Center property/client/contract pages preserve intentional empty-state branches separate from loading and failure states. | Passed by operational-readiness contract. |
| Shared interface guarantees | Visible keyboard focus, reduced-motion handling, responsive constraints, localized alert copy, dashboard metrics, form fields, record lists, and detail surfaces are protected by focused source contracts. | Passed by operational-readiness contract. |
| Company experience | Account retains company creation, membership and invitation controls, role visibility, activity visibility, subscription status, and renewal/upgrade request controls. Advanced settings outside these controls remain explicitly scoped in `operational_scope_and_ui_contracts.md`. | Passed by operational-readiness contract and visual review. |

## Automated checks

`pnpm test -- --run` completed with **44 passing test files, 152 passing tests, and 3 intentional skips**. The skips remain isolated integration checks: the real manual-payment database test requires an isolated `TEST_DATABASE_URL`, and the Ollama Cloud checks are optional external-provider validation.

`pnpm build` completed successfully. The current route-level bundles preserve deferred loading for the operational areas, including separate Sales Center and Workspace Module bundles.

## Responsive visual review

The following authenticated preview routes were reviewed on both a 1280 × 720 desktop viewport and a 375 × 812 mobile viewport: `/sales/properties`, `/workspace/portfolio`, and `/account`; `/sales` was additionally reviewed on desktop. The verified views retained visible empty states, reachable actions, responsive hierarchy, and no apparent clipped primary content. The empty portfolio and sales states remained visually distinct from normal populated layouts.

## Release boundary

The current revision history remains limited to units, leases, and documents. It deliberately does not introduce automatic restoration or extend revision records to every operational resource. The complete supported/excluded scope is maintained in `docs/operational_scope_and_ui_contracts.md`.

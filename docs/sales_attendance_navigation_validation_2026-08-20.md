# Sales attendance and navigation validation — 2026-08-20

The current desktop preview was reviewed after the sales navigation and representative-permission changes. The Sales Team workspace presents a single **Back to sales center** action that targets `/sales`, rather than a link to the general workspace. Its attendance card renders a distinct check-in action, prevents check-out until an active check-in exists, and remains visible alongside the assignment and assistant areas for the signed-in manager.

The workspace dashboard review retained the established midnight-glass shell, readable sidebar groups, and operational surfaces at desktop width. The earlier responsive sales checks covered the Sales Center and its subpages at a 390 px viewport; this current review additionally confirms that the desktop Sales Team header preserves its internal return action without overlapping the language or appearance controls.

The attendance regression is protected by `server/salesCenterContracts.test.ts`: the router exposes the protected attendance procedure and the data helper explicitly permits `canManage` users with no independent sales-team member row, while continuing to reject non-team, non-manager users. Full type, test, and production-build verification is recorded with the checkpoint created after this validation.

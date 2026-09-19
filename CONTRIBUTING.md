# Contributing to DAR.EST SaaS

Thank you for helping improve DAR.EST SaaS. Please keep contributions focused, reviewable, and safe for a public repository.

## Before opening a pull request

1. Create a feature branch from `main`.
2. Do not commit `.env`, API keys, database dumps, customer data, payment proofs, or generated files.
3. Keep database changes in Drizzle migrations and review the generated SQL before committing it.
4. Update the relevant documentation when a command, environment variable, or user-facing workflow changes.
5. Run the complete local quality checks:

```bash
pnpm check
pnpm test
pnpm build
```

## Pull request guidance

Describe the problem, the implementation, the database impact, the environment variables involved, and the validation commands you ran. Screenshots are useful for user-interface changes.

Avoid including secrets or real customer information in issues, pull requests, logs, screenshots, or test fixtures.

## Commit style

Use short, descriptive commit messages, for example:

```text
feat: add lease renewal workflow
fix: prevent duplicate collection reversal
chore: improve local setup documentation
```

## Security reports

Do not publish credentials or sensitive vulnerabilities in a public issue. Contact the repository owner privately and include only the minimum information required to reproduce the problem.

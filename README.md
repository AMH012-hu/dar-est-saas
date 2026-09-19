# DAR.EST SaaS

**DAR.EST** is a property-operations SaaS workspace for companies that manage portfolios, units, leases, collections, sales, documents, teams, subscriptions, and operational reporting.

This repository is prepared as a **public portfolio and development project**. It includes a local development setup with React, Express, TypeScript, Drizzle ORM, MySQL, Docker Compose, local authentication, and an optional Ollama Cloud property advisor.

> **Project status:** Ready for local development. External integrations such as file storage, voice transcription, image generation, maps, and Ollama Cloud require their own environment variables.

## Highlights

- Property portfolio and unit management.
- Lease, collection, payment, and subscription workflows.
- Sales workspace and team permissions.
- Documents, operational reports, notifications, and audit logs.
- Local Login/Register with password hashing using `scrypt`.
- Server-side Owner protection using the configured `OWNER_EMAIL`.
- Optional multilingual property advisor powered by Ollama Cloud.
- MySQL development database through Docker Compose.
- TypeScript checks, Vitest tests, and production build scripts.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS, Radix UI |
| Backend | Node.js, Express, tRPC |
| Database | MySQL 8.4, Drizzle ORM, Drizzle Kit |
| Authentication | Local email/password authentication and optional OAuth integration |
| AI advisor | Ollama Cloud API, optional |
| Development | pnpm, Docker Compose, Vitest |

## Requirements

Install the following before running the project:

- Node.js 22 or newer.
- pnpm 10 or newer.
- Docker Desktop with Docker Compose, or an existing MySQL 8 server.
- Git, if cloning or contributing through GitHub.

Verify the tools:

```bash
node --version
pnpm --version
docker --version
docker compose version
```

## Quick start with Docker

Clone the repository and enter the project directory:

```bash
git clone git@github.com:AMH012-hu/dar-est-saas.git
cd dar-est-saas
```

Create the local environment file. Never commit this file:

```bash
cp .env.example .env
```

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Start MySQL on the project development port (`3307`):

```bash
docker compose up -d mysql
```

Apply the Drizzle migrations and start the development server:

```bash
pnpm db:push
pnpm dev
```

Open the application at:

```text
http://localhost:3000
```

The first local account can be created at:

```text
http://localhost:3000/register
```

Then sign in at:

```text
http://localhost:3000/login
```

## One-command local start

On Linux or macOS:

```bash
chmod +x start-local.sh
START_MYSQL=1 ./start-local.sh
```

On Windows, double-click `start-local.bat`, or run it from Command Prompt:

```bat
start-local.bat
```

The scripts install dependencies when needed, optionally start MySQL, apply migrations, and launch the development server.

## Environment variables

Start from `.env.example`. At minimum, configure:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://darest:darest_local_password@127.0.0.1:3307/darest
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
VITE_APP_ID=local-dar-est
OAUTH_SERVER_URL=https://oauth.manus.im
OWNER_EMAIL=ammarhalawa760@gmail.com
```

### Owner access

Owner operations are protected on the server, not only hidden in the frontend. The configured email is:

```env
OWNER_EMAIL=ammarhalawa760@gmail.com
```

Only an authenticated user whose email matches `OWNER_EMAIL` can access the Owner procedures. Other users, including administrators and managers, receive `FORBIDDEN` from the backend.

For a local development database, create your account through `/register`. The application assigns the Owner role through the configured account and server-side authorization flow. Do not give production database credentials or server secrets to untrusted users.

> A local copy is inherently modifiable by the person who owns the machine. The Owner restriction protects users of a deployed application; it cannot protect a distributed source tree from someone who can edit and run the source code.

### Optional integrations

The following integrations are disabled when their variables are empty:

```env
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
OLLAMA_CLOUD_API_KEY=
DAR_EST_INTEGRATION_API_KEY=
DAR_EST_INTEGRATION_ALLOWED_ORIGINS=http://localhost:3000
```

Do not put real keys, customer data, database dumps, or production credentials in GitHub.

## Ollama Cloud property advisor

The property advisor is optional and uses Ollama Cloud through the OpenAI-compatible chat-completions API.

1. Create an API key at [Ollama Cloud API keys](https://ollama.com/settings/keys).
2. Add it to `.env`:

```env
OLLAMA_CLOUD_API_KEY=your-key-here
```

3. Restart the development server:

```bash
pnpm dev
```

Example advisor prompts:

```text
رشح لي عقارات متاحة حتى 1000000 جنيه
دول بنفس رينج المساحة؟
اعرضهم مرة أخرى
```

The advisor is designed to use the authorized property summary supplied by the application. Conversation and property text are sanitized before optional cloud processing. If the key is not configured, the rest of the application remains available and the advisor feature reports that it is unavailable.

Run the optional integration test only when the key and internet access are available:

```bash
RUN_OLLAMA_CLOUD_INTEGRATION=true pnpm test -- server/ollamaCloud.integration.test.ts
```

## Database commands

Start the database:

```bash
docker compose up -d mysql
```

Apply or generate the current Drizzle migrations:

```bash
pnpm db:push
```

Stop the database container without deleting its data:

```bash
docker compose down
```

To remove the local database volume as well, use this destructive command carefully:

```bash
docker compose down -v
```

If port `3307` is already in use, select another host port:

```bash
MYSQL_HOST_PORT=3308 docker compose up -d mysql
sed -i 's/127.0.0.1:3307/127.0.0.1:3308/' .env
pnpm db:push
```

On Windows, edit the port in `.env` manually instead of using `sed`.

## Quality checks

Run the standard checks before opening a pull request:

```bash
pnpm check
pnpm test
pnpm build
```

The Ollama Cloud integration tests are skipped by default because they require an external API key. The real database integration test is also skipped unless `TEST_DATABASE_URL` points to an isolated test database.

## Production build

Build the frontend and backend bundle:

```bash
pnpm build
```

Start the built server:

```bash
NODE_ENV=production pnpm start
```

Production deployments should use a managed MySQL instance, HTTPS, a strong randomly generated `JWT_SECRET`, private server-side integration keys, backups, monitoring, and a deployment-specific `OWNER_EMAIL`.

## GitHub workflow with SSH

The repository uses SSH in the examples below. Confirm that GitHub authentication works:

```bash
ssh -T git@github.com
```

Expected response:

```text
Hi AMH012-hu! You've successfully authenticated, but GitHub does not provide shell access.
```

Create a new **Public** repository on GitHub named `dar-est-saas`, without generating an extra README, `.gitignore`, or license. Then from this project directory:

```bash
git init
git branch -M main
git add .
git commit -m "Initial DAR.EST SaaS public release"
git remote add origin git@github.com:AMH012-hu/dar-est-saas.git
git push -u origin main
```

If `origin` already exists, update it instead of adding it again:

```bash
git remote set-url origin git@github.com:AMH012-hu/dar-est-saas.git
git push -u origin main
```

Check the repository state:

```bash
git remote -v
git status
```

## Public repository safety

The repository intentionally excludes local secrets and generated runtime data through `.gitignore`. Before every public push, verify:

```bash
git status --short
git ls-files | grep -E '(^|/)\.env$|node_modules|\.db$|\.sqlite$' || true
```

Never commit:

- `.env` or any file containing real secrets.
- Ollama, Forge, OAuth, storage, or integration API keys.
- MySQL passwords used outside local development.
- Customer records, identity documents, payment proofs, or database dumps.
- `node_modules`, build output, logs, or private internal notes.

## Contributing

Please read `CONTRIBUTING.md` before opening a pull request. Keep changes focused, run `pnpm check`, `pnpm test`, and `pnpm build`, and do not include secrets or customer data.

## License

This project is distributed under the MIT License. See `LICENSE` if present, or add the license file before publishing if a different license is intended.

## Project documentation

For the Arabic local-development guide, see [`README_LOCAL_AR.md`](README_LOCAL_AR.md).

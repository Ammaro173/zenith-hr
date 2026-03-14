# AGENTS.md

> Zenith HR is a manpower request and HR management system.

## Stack
- **Runtime**: Bun (Package Manager & Test Runner)
- **DB**: PostgreSQL + Drizzle ORM
- **API**: Elysia + oRPC
- **Frontend**: Next.js (App Router)

## Documentation Maps

| Topic | Resource |
| ----- | -------- |
| **Domain & Workflow** | [docs/DOMAIN.md](./docs/DOMAIN.md) |
| **Architecture** | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| **Conventions** | [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) |
| **Best Practices** | [docs/BEST_PRACTICES.md](./docs/BEST_PRACTICES.md) |

## Agent Skills
Execute these skills for complex tasks:

| Skill | Purpose |
| ----- | ------- |
| `create-module` | Scaffold backend API module |
| `create-feature` | Scaffold frontend feature |
| `check-consistency` | Audit architectural violations |
| `run-tests` | Run correct test suites |
| `database-best-practices` | DB patterns & mocking |

## Cursor Cloud specific instructions

### Services

| Service | Port | Start command |
| ------- | ---- | ------------- |
| Elysia API server | 3000 | `bun run dev:server` |
| Next.js frontend | 3001 | `bun run dev:web` |
| Both together | 3000 + 3001 | `bun run dev` |

PostgreSQL must be running on localhost:5432 before starting services. The DB driver in `packages/db/src/index.ts` auto-selects `pg` (node-postgres) for localhost URLs.

### Environment

- All env vars live in a single root `.env` file (see `.env.example`).
- Required: `DATABASE_URL` (local PostgreSQL) and `BETTER_AUTH_SECRET` (min 32 chars).
- AWS S3, Google AI, Upstash Redis, and VAPID keys are all optional.

### Database

- Push schema: `bun run db:push`
- Seed data: `cd packages/db && bun --env-file=../../.env src/seed.ts`
- Seed credentials: any seeded user with password `Test123!` (e.g. `admin@q-auto.com`).

### Linting & Testing

- Lint: `bun run check` (Biome)
- Type-check: `bun run check-types`
- API tests: `cd packages/api && bun --env-file=../../.env test`
- Server tests: `cd apps/server && bun --env-file=../../.env test`

### Gotchas

- The `turbo dev` command uses `"persistent": true` — it blocks the terminal. Use `&` or run in background.
- The Next.js web app reads `WEB_PORT` from `.env` to set its port (default 3001).
- Pre-commit hook runs `ultracite fix` via lint-staged; this may modify staged files on commit.

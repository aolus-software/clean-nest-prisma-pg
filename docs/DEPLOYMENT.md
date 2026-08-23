# Deployment

The service is deployed with **PM2** from a checkout. There is no Dockerfile — `docker-compose.yml`
exists to run PostgreSQL and Redis for local development, not to build the app.

## The PM2 model

`ecosystem.config.js` declares **three apps**, one per environment:

| App | Mode | `NODE_ENV` | Memory restart |
| --- | ---- | ---------- | -------------- |
| `clean-nest-prisma-pg-dev` | fork, 1 instance | `dev` | 2G |
| `clean-nest-prisma-pg-staging` | fork, 1 instance | `staging` | 2G |
| `clean-nest-prisma-pg-production` | cluster, `max` | `production` | 4G |

Configuration comes from `env_file: ".env"`; only `NODE_ENV` is set in the ecosystem file.

Two things must stay in sync or the process exits at boot:

- The app names must match `PM2_APP_PREFIX` in the `Makefile` (`clean-nest-prisma-pg`).
- Every `NODE_ENV` value must appear in the envalid `choices` list in
  `libs/config/src/env/index.ts`.

**Production runs in cluster mode with `instances: "max"`.** Two consequences: in-memory state is not
shared between workers, so anything cross-request must go through Redis; and side-effectful module
loads — BullMQ workers, scheduled jobs — happen once *per worker*.

## Deploying

```sh
make deploy-dev
make deploy-staging
make deploy-production
```

Each target runs the same preparation and then either **reloads** the app if PM2 already knows it
(zero-downtime under cluster mode) or starts it from the ecosystem file if not.

The preparation sequence:

1. `bun install`
2. `prisma migrate deploy` — applies pending migrations
3. `prisma generate` — regenerates the typed client
4. `bun run build`

`pm2` must be on `PATH`. Override the binary if it is not:

```sh
make deploy-dev PM2='bunx pm2'
```

A `check-pm2` guard fails with a readable message rather than a cryptic one when `pm2` is missing.

## Operating

```sh
make pm2-status              # pm2 list
make pm2-logs-dev            # also -staging / -production
make pm2-stop-dev            # also -staging / -production
```

## Database migrations

Migrations are **not** applied automatically on boot — they run as part of the deploy sequence above,
or by hand:

```sh
make db-migrate      # prisma migrate deploy
```

Schema lives in `prisma/schema.prisma`, migration history in `prisma/migrations/`. Never hand-edit a migration that
has already been applied; add a new one.

**The pre-commit hook also applies migrations**, against whatever `DATABASE_URL` your local `.env`
names. That is a deliberate workflow choice, but it means committing with `.env` pointed at a shared
database will migrate it. See `.claude/rules/commit.md`.

## Health checks

Point your load balancer or orchestrator at:

- `GET /health` — a composite check covering database connectivity and heap usage (150 MB ceiling).
  Returns 503 when a check fails.
- `GET /health/live` — a bare liveness probe with no dependencies.

Both are public. Under cluster mode the primary process does not bind the port; only workers do, so
health checks reach a worker.

## Before the first deploy

- Copy `.env.example` to `.env` and fill in every **required** variable — see
  [CONFIGURATION.md](./CONFIGURATION.md). Leaving one empty (`VAR=`) fails validation just as surely
  as omitting it.
- Decide `API_DOCS_ENABLED`. It defaults to `false`; leaving it unset is the safe choice for
  production.
- Set real `ALLOWED_ORIGINS`. The default is `*`.
- Seed the RBAC catalogue once with `make db-seed`. It is re-runnable — every insert is
  conflict-guarded and existing users are skipped rather than rewritten.

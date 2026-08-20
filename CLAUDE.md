# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`clean-nest-prisma-pg` — a Clean Architecture NestJS boilerplate on the **Fastify** adapter, **Prisma ORM** + **PostgreSQL**, Redis cache, BullMQ queues, and JWT (Passport) auth. Runtime is **Bun** (Node also works). Ships an auth flow and a settings domain (users, roles, permissions) with RBAC.

## Commands

Use **Bun** as the package manager and runner. The `Makefile` is the canonical entry point.

```bash
# Development
make dev                 # bun run start:dev (watch)
bun run start:debug      # debugger
make build               # bun run build (nest build / webpack bundle)
bun run start:prod       # node dist/main

# Quality
make lint                # eslint --fix on {src,apps,libs}/**/*.ts
make format              # prettier --write

# Tests
make test                # jest (unit, *.spec.ts)
make test-watch
bun run test:cov
bun run test:e2e         # jest --config ./test/jest-e2e.json
bun run test -- <path/to/file.spec.ts>   # single file (the repo ships no specs yet)

# Database (Prisma)
make db-migrate-dev      # prisma migrate dev + prisma generate
make db-migrate          # prisma migrate deploy (prod)
make db-generate         # prisma generate (regenerate client)
make db-seed             # bun run seed
make db-studio           # prisma studio (GUI)
make db-reset            # prisma migrate reset --force + seed
bunx --bun prisma migrate dev --name <name>   # create a migration from schema changes

# Deployment (PM2)
make deploy-dev          # install + migrate + generate + build, then start/reload pm2 app
make deploy-staging
make deploy-production
make pm2-status          # pm2 list
make pm2-logs-dev        # also pm2-logs-staging / pm2-logs-production
make pm2-stop-dev        # also pm2-stop-staging / pm2-stop-production
```

Deploys are driven by `ecosystem.config.js`, which defines one PM2 app per environment named `clean-nest-prisma-pg-<env>` (`PM2_APP_PREFIX` in the `Makefile` must match). Each `deploy-<env>` target runs the full prep sequence, then **reloads** the app if it already exists (zero-downtime under cluster mode) or starts it from the ecosystem file if not. `pm2` must be on `PATH`; override with `make deploy-dev PM2='bunx pm2'`. Production runs `instances: "max"` in cluster mode, dev and staging run a single fork.

`NODE_ENV` is set per app to `dev` / `staging` / `production` — all three are in the envalid `choices` list. Adding an environment means adding it to **both** `ecosystem.config.js` and `getEnv()`, or the process exits at boot. The `/docs` UI is gated by `API_DOCS_ENABLED`, not by `NODE_ENV`.

After editing `prisma/schema.prisma`, run `make db-migrate-dev` to create/apply the migration and regenerate the client. Run `make db-generate` alone if you only need to refresh the typed client.

## Architecture

NestJS monorepo: feature modules in `src/`, four path-aliased shared libraries in `libs/` (declared as Nest library projects in `nest-cli.json`).

| Alias | Path | Purpose |
|---|---|---|
| `@common` | `libs/common/src` | Guards, pipes, decorators, interceptors, Passport strategy, mail, cache, throttler, `ResponseHandler`, shared types (`DatatableType`, `PaginationResponse`, `SortDirection`) |
| `@repositories` | `libs/repositories/src` | The `prisma` client singleton, `PrismaService`, and repository factory functions |
| `@utils` | `libs/utils/src` | Pure stateless helpers: `HashUtils`, `JWTUtils`, `DateUtils`, `StrUtils`, `NumberUtils`, `EncryptionUtils`, `LoggerUtils`, and constants (`defaultSort`, `paginationLength`, token lifetimes, upload limits) |
| `@config` | `libs/config/src` | `getEnv()` validated env, plus `CorsConfig` / `HelmetConfig` / `swaggerConfig` applied in `main.ts` |

`@generated/*` maps to `generated/*` (Prisma output, when present). Every public export of a lib is re-exported from its `src/index.ts` — add new exports there or the alias import will not resolve.

### Request flow

`Controller` (HTTP only) → `Service` (business logic, transactions) → `Repository` (Prisma queries). Controllers never touch the DB; repositories never open transactions.

### The non-obvious bits

- **`prisma` is a module-level singleton, not DI.** It is constructed in `libs/repositories/src/index.ts` from `getEnv().DATABASE_URL` (via the `@prisma/adapter-pg` adapter) and exported. Repositories and services import `prisma` directly — so a feature module does **not** need to import `RepositoriesModule` to query the DB. A `PrismaService` provider also exists (with `onModuleInit`/`onModuleDestroy` lifecycle), but the repository layer uses the exported `prisma` singleton. Import only what you actually inject (e.g. `MailModule` for `MailService`).
- **Repositories are factory functions, not classes.** `export function UserRepository(tx?: Prisma.TransactionClient) { const db = tx || prisma; return { ...methods }; }`. Call as `UserRepository().findByMail(email)` — never `new`, never inject. To run inside a service-owned transaction, pass the transaction client to the **factory**: `UserRepository(tx).findOne(id)`. Repositories also expose the raw delegate (e.g. `user: db.user`) for ad-hoc queries.
- **Transactions live in the service.** Wrap multi-write logic in `await prisma.$transaction(async (tx) => { ... })`, use `tx.<model>.<op>(...)` for direct writes, and pass `tx` into repository factories (`UserRepository(tx)`) so they join the same transaction.
- **Responses go through `ResponseHandler`.** Controllers send `res.status(status).send(ResponseHandler.success(status, message, data))` on the happy path and call `ResponseHandler.handleError(res, error)` inside `catch`. Never `return ResponseHandler.success(...)` directly — always send it through the Fastify reply. `handleError` special-cases `UnprocessableEntityException` to surface its `{ message, error: { field: [...] } }` payload as a 422 — this is the convention for field-level validation errors. Unknown errors are logged via `LoggerUtils` and returned as a generic 500.
- **Auth/RBAC is decorator-driven.** Apply `@UseGuards(AuthGuard, PermissionGuard, RoleGuard)` at the controller class, then gate each method with `@PermissionAuth("user:create")` or `@RoleAuth("superuser")`. `@CurrentUser()` injects the resolved `UserInformation` (roles + flattened permissions), cached in Redis.
- **Env access is centralized.** Never read `process.env` directly — call `getEnv()` from `@config` (envalid-validated, cached on first call). Swagger/Scalar docs at `/docs` are mounted only when `API_DOCS_ENABLED` is true — a single switch, independent of `NODE_ENV`, defaulting to `false` so an unset environment cannot expose the schema. Add a new var to the `IEnvConfig` interface, the `cleanEnv` schema, and the returned object in `libs/config/src/env/index.ts`, then to `.env.example` and the README.
- **Every user-facing string is translated.** `nestjs-i18n` catalogs live at `libs/common/src/i18n/lang/{en,id}/{message,validation,email}.json`. Services and controllers inject `I18nService`; DTOs use `i18nValidationMessage("validation.<CONSTRAINT>")`; guards, pipes, the response handler, and repositories use `I18nContext.current()?.t(...) ?? "fallback"` because they sit outside request DI. `disableMiddleware: true` is deliberate — under Fastify the middleware's async context does not reach the handler, so the global `I18nLanguageInterceptor` resolves the language instead. Never re-enable it, and never hardcode an English literal. See `.claude/rules/i18n.md`.
- **Rate limiting is global and always on.** `ThrottlerGuard` is registered as an `APP_GUARD`, so every route is throttled at `THROTTLER_LIMIT`/`THROTTLER_TTL` (default 60 per 60s) and any route can return 429. Never re-register the guard per module; override a single route with `@Throttle`/`@SkipThrottle`. See `.claude/rules/rate-limiting.md`.
- **Routes are flat.** No `setGlobalPrefix`, no versioning — a controller's path is its resource name, and access is enforced by guards and `@PermissionAuth`/`@RoleAuth`, never by the path prefix. The live route map lives in `.claude/rules/routes.md` and is updated in the same change as the route.
- **Mail is queued.** `MailService.sendMail(...)` enqueues a BullMQ job processed by `mail.processor.ts`; it auto-injects `appName`/`frontendUrl` into the Handlebars template context. Use `sendEmailSync` only when you must send inline.
- **Soft deletes.** User rows carry `deletedAt`; every read query filters `deletedAt: null` and "delete" sets the timestamp (`DateUtils.now().toDate()`) instead of issuing a `DELETE`.

## Conventions

Detailed, path-scoped rules live in `.claude/rules/` and are the source of truth for writing code — consult the relevant one before adding a controller, service, repository, DTO, or module.

Two of them apply to **every** change regardless of path: `contradiction-halt.md` (a request that contradicts a rule, the architecture, or a security invariant is reported and halted, never silently implemented or silently worked around) and `documentation.md` (a doc your change makes wrong is fixed in the same change). Read those two before starting, not after.

Highlights:

- **Style:** tabs, double quotes, semicolons (Prettier). No `any` except `catch (err: unknown)`. Explicit return types and parameter types everywhere. One block comment above each function — never line-by-line comments. No emojis/icons. No `console.*` — use `LoggerUtils`.
- **Shared code** (guards, pipes, decorators, utils, types) belongs in `libs/`, never in `src/`.
- **One domain entity per module** (one controller + one service). See `.claude/rules/module.md`.
- **Permission strings** are `entity:action` with the entity singular: `user:create`, `user:list`, `user:view`, `user:update`, `user:delete`.
- **Use `PATCH` (not `PUT`)** for updates.
- **No hardcoded user-facing strings** — every response message, exception message, and validation message resolves through i18n, with the key added to both `en` and `id` before the code that uses it.
- **Uniqueness and business-rule failures are 422**, not 409, and the field map is keyed `error` (singular): `{ message, error: { field: [...] } }`. See `.claude/rules/response-codes.md`.

## Skills, rules, and commands

- `.claude/rules/` — path-scoped coding standards for this codebase.
- `.claude/commands/` — `/commit` (conventional commit workflow), `/update-todo`, and `/audit-flow` (read-only whole-codebase sweep that writes explained findings to `docs/audit-findings.md` and never fixes anything; its writing contract is `.claude/rules/audit-findings.md`).
- `.claude/skills/` — engineering skills you maintain yourself (see the directory's README for the intended set).

# Shared Libraries

This is a NestJS monorepo: feature modules live in `src/`, and everything reusable lives in one of
four path-aliased libraries under `libs/`, declared as Nest library projects in `nest-cli.json`.

**Anything used by more than one module belongs here, never in `src/`.** Every public export must be
re-exported from that library's `src/index.ts` or the alias import will not resolve.

| Alias | Path | Holds |
| ----- | ---- | ----- |
| `@common` | `libs/common/src` | NestJS-aware building blocks — guards, pipes, decorators, interceptors, the Passport strategy, cache, mail, throttler, `ResponseHandler`, shared types |
| `@config` | `libs/config/src` | `getEnv()` and the app configs applied in `main.ts` |
| `@repositories` | `libs/repositories/src` | The Prisma data layer — client, schema, repositories, seeds |
| `@utils` | `libs/utils/src` | Pure, stateless helpers with **no NestJS dependency** |

## `@common`

| Category | What is there |
| -------- | ------------- |
| Guards | `AuthGuard`, `PermissionGuard`, `RoleGuard` — all three registered globally as `APP_GUARD`; see [SECURITY.md](./SECURITY.md) |
| Strategy | `AuthStrategy` — Passport JWT, resolves and caches the caller's identity |
| Decorators | `@Public()`, `@PermissionAuth()`, `@RoleAuth()`, `@CurrentUser()`, `@ApiStandardResponses()`, `@ApiSuccessResponse()`, `@DefaultApiNotFoundResponse()`, `@ApiDatatableQueries()` |
| Pipes | `CustomValidationPipe` (global; whitelists and translates), `FilterValidationPipe` |
| Response | `ResponseHandler`, `successResponse` |
| Cache | `CacheService` over Redis via Keyv, and the `UserCache(id)` key builder |
| Mail | `MailService` (enqueues), `MailProcessor` (consumes), Handlebars templates per locale |
| Datatable | `parseDateRangeFilter` — the validating date-range parser every list repository uses |
| i18n | `I18nModule` and the `en` / `id` catalogues |
| Types | `DatatableType`, `PaginationResponse`, `SortDirection` |

**Guards, pipes, and repositories cannot inject `I18nService`** — they sit outside request DI, so they
use `I18nContext.current()?.t(...) ?? "fallback"`, and that fallback is mandatory because the context
is `undefined` outside a request.

## `@config`

`getEnv()` validates the environment once with envalid and caches the result. Also exports
`CorsConfig`, `HelmetConfig`, and `swaggerConfig`, all applied in `src/main.ts`.

**Never read `process.env` outside this library.** Adding a variable means editing three places in
`libs/config/src/env/index.ts` — the interface, the `cleanEnv` schema, and the returned object.

## `@repositories`

`prisma` is a module-level singleton built from `DATABASE_URL` via `@prisma/adapter-pg` and exported from `libs/repositories/src/index.ts`. A `PrismaService` provider also exists for lifecycle hooks, but the repository layer uses the singleton.

Repositories are **factory functions**, not injectable classes:

- Call them as `UserRepository().findByEmail(email)` — never `new`, never inject.
- Wrap multi-write logic in `await prisma.$transaction(async (tx) => { ... })` and pass `tx` to the repository **factory** — `UserRepository(tx)` — not to each method.
- **Repositories never open a transaction.** They only accept one. Transactions belong to the service.
- Every list repository exports its allow-lists — `<entity>SortableFields` and
  `<entity>FilterableFields` — which the controller passes to `@ApiDatatableQueries` so `/docs` shows
  exactly what is enforced. Pass the constants; never restate the list.
- Reads on soft-deletable tables filter out deleted rows. Missing that filter in one place is enough
  to undo soft delete everywhere.

Seeds live in `prisma/seed/` and are run with
`make db-seed`. They are the ground truth for the permission catalogue — see
[SECURITY.md](./SECURITY.md).

## `@utils`

Pure helpers, no framework dependency: `HashUtils` (bcrypt), `JWTUtils`, `DateUtils` (dayjs),
`StrUtils`, `NumberUtils`, `LoggerUtils`, and the constants in `default/` — `defaultSort`,
`paginationLength`, upload limits, and the token-lifetime **functions**.

Two notes:

- **Token lifetimes are functions, not constants.** Evaluating `now() + 1 hour` at module load freezes
  every token's expiry at process start. Call them when the row is written.
- `EncryptionUtils` exists but has **no call sites**, and its `crypto-js` passphrase mode derives keys
  with MD5 and provides no authentication. Do not reach for it without reading §P3 in
  [audit-findings.md](./audit-findings.md) first.

## Layering

```
Controller (HTTP only) -> Service (business logic, transactions) -> Repository (Prisma)
```

Never skip a layer: controllers do not touch the database, and repositories do not decide business
rules. The health controller's direct database ping is the one deliberate exception, and it is a
liveness probe rather than a query.

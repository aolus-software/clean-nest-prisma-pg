---
name: audit-flow
description: "Read-only whole-codebase audit of the backend for auth/token flow contradictions, RBAC gaps, soft-delete and tenant-data correctness, secrets at rest, i18n parity, dead code/validation, shared-code duplication, response-contract drift, and doc drift. Writes explained findings (what it is · why · what it costs · what to do) to docs/audit-findings.md. Never modifies application code."
risk: safe
source: local
---

# Audit Flow

Run a structured, **read-only** audit of this backend and record the results in
`docs/audit-findings.md`. This command **never changes application code, DTOs, services,
repositories, schema, migrations, or seeds** — its only output is the findings document.

`$ARGUMENTS` (optional) narrows scope to specific categories or paths (e.g. `audit-flow auth rbac`,
`audit-flow src/settings/users`). **With no arguments, sweep the entire codebase** as defined under
"What a full sweep covers" — not a sample, not the modules that changed recently.

## How to run it

1. **Read the ground truth first**: `CLAUDE.md`, every `.claude/rules/*.md`, and
   `.claude/rules/audit-findings.md` in particular — that is the writing contract, and it is read
   before a single finding is written. These define the intended behaviour that findings are measured
   against: a finding is always "code vs stated intent", never "code vs the auditor's taste". Where
   no rule states an intent, say so in the finding rather than inventing one.
2. **Build the inventory before dispatching anything.** Enumerate what exists so coverage is a fact
   rather than a hope: every module under `src/`, every lib under `libs/`, every model in
   `prisma/schema.prisma`, every permission produced by `prisma/seed/permission.seed.ts`, and every
   route in `.claude/rules/routes.md`. Keep this list — it is what the report's Coverage section is
   written from.
3. **Dispatch parallel read-only `Explore` subagents** — one per category below, each given its slice
   of the inventory so every file has an owner. Do not read serially in the main thread. If a
   category is too large for one agent, split it by module and say so in Coverage.
4. **Each subagent returns evidence, not prose**: `file:line` for every claim, the intended behaviour
   per the rules, what the code actually does, the gap, and whether it traced the path end to end
   (**CONFIRMED**) or is guessing (**SUSPECT**, plus what would settle it).
5. **Write the findings up yourself, in the main thread.** A subagent's terse notes are raw material.
   Every finding in `docs/audit-findings.md` gets the five blocks required by
   `.claude/rules/audit-findings.md`:

   > **Where** (`file:line`) · **What this is** · **Why this can happen** · **What it costs** ·
   > **What we should do**

   written so someone who has never opened that file understands the problem without reading code. A
   bare code citation with a one-line verdict is **not** an acceptable finding — expand it. Tag each
   🔴 bug · 🟠 inconsistency · 🟡 hygiene · 📄 doc, by consequence, never by effort.
6. **Write the Coverage section** — what was reached, and what was deliberately not. A category with
   no findings says so and names what was checked; "clean" without evidence is indistinguishable from
   "not audited".
7. **Write "Top priorities" last**, ordered security → data integrity → correctness → hygiene/doc, in
   the plainest language in the document. This is the part the owner actually reads.
8. **Report a short summary to the user. Do not fix anything** — fixes are a separate, explicitly
   requested step.

## What a full sweep covers

Everything below is in scope for an unscoped run. Nothing here is skipped for being boilerplate —
`main.ts` and `app.module.ts` are where the global pipe, the throttler guard, Helmet, CORS, and
Swagger gating are wired, so they carry security invariants.

| Area | Includes |
|---|---|
| `src/auth/**` | login, register, email verification, forgot/reset password, profile, and their seven DTOs |
| `src/settings/users/**` | the user CRUD surface plus status and password sub-actions |
| `src/settings/roles/**`, `src/settings/permissions/**` | the RBAC catalog itself — the thing every other guard depends on |
| `src/health/**`, `src/app.controller.ts` | the unauthenticated surface; what it discloses |
| `src/app.module.ts`, `src/main.ts` | global pipe (`CustomValidationPipe`), module wiring, Fastify config, CORS/Helmet, Swagger gating on `NODE_ENV` |
| `libs/common/**` | guards (`auth`/`permission`/`role`), `auth.strategy.ts`, decorators, pipes, the file-upload interceptor, i18n, mail (module/service/processor/templates), cache, throttler, `ResponseHandler` |
| `libs/repositories/**` | the `prisma` singleton, `PrismaService`, and the three repository factories |
| `libs/utils/**` | `HashUtils`, `JWTUtils`, `EncryptionUtils`, `DateUtils`, `LoggerUtils`, and the `default/` constants |
| `libs/config/**` | `getEnv()` validation, CORS/Helmet/Swagger config |
| `prisma/**` | `schema.prisma`, the six migrations, and every seed file — **seeded permissions are ground truth for guards** |
| `test/**`, `*.spec.ts` | coverage gaps on the invariants above — an unguarded invariant with no test is a finding |
| repo root | `Makefile`, `.env.example`, `nest-cli.json`, `package.json` scripts, `.husky/`, `.github/workflows/` |

**Deliberately out of scope** (state this in Coverage): `node_modules/`, `dist/`, `generated/`,
lockfiles, and `.agents/skills/` (a vendored bundle, not this project's code).

Coverage is not optional. If time or context forces a partial sweep, **say which areas were not
reached** rather than letting silence imply they were clean.

## Categories to cover

1. **Auth & token flows** — the order and idempotency of register → verify-email → login;
   forgot-password → validate-token → reset-password; whether a consumed or expired
   `EmailVerification` / `ResetPassword` row is invalidated rather than left reusable; whether
   issuing a second token revokes the first; token lifetimes from `@utils` constants rather than
   inline numbers; refresh-token handling; what `GET /auth/profile` returns.
2. **Access control — guards & permissions** — every route in `.claude/rules/routes.md` against its
   controller: a method behind `AuthGuard` with no `@PermissionAuth`/`@RoleAuth`, a
   `@PermissionAuth` string absent from the seeded catalog
   (`{user,role,permission}:{list,create,view,update,delete,restore}`), a seeded permission no route
   uses, `@RoleAuth` declared but not enforced because `RoleGuard` is missing from `@UseGuards`,
   guard ordering, role-vs-permission confusion, and any authenticated route that can act on a user
   id other than the caller's without a check.
3. **Ownership & self-service boundaries** — `PATCH /users/:id/password`, `PATCH /users/:id/status`,
   and `POST /users/:id/resend-verify-email` all take an arbitrary id. Confirm each either requires
   an elevated permission or asserts the target is the caller. A privilege-escalation path (a user
   granting themselves a role, or resetting a superuser's password) is 🔴 and sorts first.
4. **Soft delete & data integrity** — every read path on `User` filtering `deletedAt: null`, no hard
   `DELETE` on a soft-deletable model, unique constraints the code assumes (email) actually declared,
   cascade behaviour on `UserRole` / `RolePermission`, and transaction boundaries owned by the
   service (never the repository) per `service.md` and `repository.md`.
5. **Secrets & sensitive data at rest** — password hashes, JWT secrets, reset/verification tokens,
   and `APP_SECRET` absent from logs, responses, DTOs, Swagger examples, error messages, and
   repository `select` shapes; `HashUtils` used for passwords rather than a hand-rolled hash;
   `EncryptionUtils` used where reversible storage is intended; env read via `getEnv()` and never
   `process.env`.
6. **i18n coverage & catalog parity** — any user-facing literal that bypassed i18n; `en` and `id`
   catalogs holding the same keys with the same `{placeholders}`; a `validation.*` key referenced by
   a DTO but missing from `validation.json`; a class-validator decorator with no `message`; guards,
   pipes, repositories, and `ResponseHandler` using `I18nContext.current()?.t(...) ?? "fallback"`
   with the fallback actually present. See `.claude/rules/i18n.md`.
7. **Response-contract completeness** — endpoints whose `@ApiStandardResponses` /
   `@ApiSuccessResponse` disagree with what the service, guards, and pipes can actually throw;
   `forbidden: false` on a permission-gated route; `badRequest: false` on a `findAll`; a
   `NotFoundException` with no `@DefaultApiNotFoundResponse`; a status mismatch between
   `@ApiSuccessResponse(code)`, `res.status(code)`, and `@HttpCode(code)`; a controller with no
   `@ApiTags` or missing `@ApiBearerAuth("Bearer")`; and the 422 field map keyed `error` vs `errors`.
   See `.claude/rules/response-codes.md`.
8. **Dead code, unused fields & validation** — DTO fields never read by the service, dead enum
   members, missing or wrong class-validator decorators, enum-cast filters with no membership check,
   repository `select` shapes vs what the service actually reads, and sort/filter allow-lists that
   drifted from the schema (`FilterValidationPipe`, `defaultSort`, `paginationLength`).
9. **Shared-code placement & duplication** — logic copy-pasted across services that belongs in
   `@common` / `@utils` / `@repositories`; magic values that should be constants in
   `libs/utils/src/default/`; three ways to do one thing; and **a lib export missing from its
   `src/index.ts`**, which silently breaks the path alias. See `.claude/rules/shared-code.md`.
10. **Rate limiting, caching & queues** — routes that need a tighter `@Throttle` (unauthenticated
    credential endpoints) or a `@SkipThrottle` (machine callers); cache keys that can collide across
    users; a cached `UserInformation` that is not invalidated when roles or permissions change —
    a stale permission cache is a security finding, not a performance one; TTL units; and mail jobs
    that can fail the primary request instead of being fire-and-forget.
11. **Data model & migrations** — `schema.prisma` vs the six applied migrations, a schema change with
    no migration, an edited already-applied migration, indexes missing on columns the repositories
    filter or sort by, and seed data that disagrees with the schema.
12. **Documentation drift** — `CLAUDE.md` and `.claude/rules/*` claims vs code: env var names, the
    route map in `routes.md`, module names, permission strings, path aliases, and `Makefile` targets.
    A shipped pattern with no rule is itself a 📄 finding
    (`.claude/rules/documentation.md`). **Known today: `CLAUDE.md` documents running
    `bun run test -- src/settings/users/users.service.spec.ts`, but the repo contains zero
    `*.spec.ts` files** — confirm and record rather than assuming it was already reported.

## Rules for this command

- **Read-only.** If the audit surfaces a bug or rule contradiction, **report it — do not act on it**
  (`.claude/rules/contradiction-halt.md`). The findings document is the one file this command writes.
- **Writing format is governed by `.claude/rules/audit-findings.md`** — the five blocks, plain
  language, severity by consequence, CONFIRMED-vs-SUSPECT honesty, document layout, permanent finding
  numbers, and how a resolved finding is marked. Read it before writing the report.
- **Prefer updating the existing `docs/audit-findings.md`** over creating a new file — one living
  record. Never renumber an existing finding; append new ones.
- **Cite `file:line` for every finding.** No finding without a location.
- **Explain, don't just point.** A finding a reader must open the code to understand has not been
  written yet.
- **Invariants already on record** in `.claude/rules/contradiction-halt.md` (the absent tests) are
  still swept and still written up — a rule noting an invariant is not a substitute for the report
  carrying a breach of it with evidence.

# Audit Findings — clean-nest-prisma-pg

**Sweep date:** 2026-08-20
**Scope:** focused sweep of the **controller response contract** and the **repository / data layer**,
plus verification of the issues already recorded in `.claude/rules/contradiction-halt.md`.
**Ground truth:** `CLAUDE.md`, `.claude/rules/*.md` (in particular `response-codes.md`,
`repository.md`, `routes.md`, `service-crud.md`), and `.claude/rules/audit-findings.md` for the
writing contract.

**Severity legend:** 🔴 bug · 🟠 inconsistency / latent risk · 🟡 hygiene · 📄 doc
**Evidence:** CONFIRMED (traced end to end) · SUSPECT (something unverified, named below)

> **Status: the owner approved all findings and they have been fixed.** The sweep itself wrote no
> code — fixes were a separate, explicitly requested step, per
> `.claude/rules/audit-findings.md` → "Audits do not fix things".

> **Resolved 2026-08-20.** Fixed in the same session as this sweep. What changed:
> `CustomValidationPipe` now emits the 422 field map under `error`; `resend-verify-email` carries
> `@PermissionAuth("user:update")`; token lifetimes are functions evaluated per token; the five bare
> user endpoints have `@ApiSuccessResponse` + `@DefaultApiNotFoundResponse`; `AuthController`'s eight
> hand-rolled `@ApiResponse` blocks are now `@ApiSuccessResponse` (response-shape `properties`
> preserved); `AuthController` and `AppController` are tagged; the throttler no longer re-exports
> itself. Original findings are kept below unedited — the next auditor needs to see the pattern that
> was wrong, not just that it went away.
> Prisma-specific: `@ApiStandardResponses` gained the `tooManyRequests` (429) flag it was missing;
> `role.repostory.ts` is renamed `role.repository.ts` and exported from the repositories barrel (it
> was missing, which is why `@repositories` could not resolve it); sort/filter allow-lists are
> exported and passed to `@ApiDatatableQueries`.


---

## Coverage

**This was a scoped sweep, not the full 12-category run** defined in
`.claude/commands/audit-flow.md`. Read the two lists below before treating any category as clean.

**Reached and checked:**

| Area | What was actually verified |
|---|---|
| Controller response contract (§7) | Every method in all 6 controllers: verb, path, guards, `@ApiStandardResponses`, success-response decorator, `res.status(n)` vs `ResponseHandler.success(n)` code agreement |
| Repository / data layer (§4, §8) | All 3 repository factories; every user read path checked for the soft-delete filter; sort and filter allow-lists; `select` shapes checked for password exposure; transaction ownership |
| Access control (§2) | Every route in `.claude/rules/routes.md` against its controller decorators |
| Rate limiting config (§10) | `throttler.module.ts` wiring and env plumbing only |
| Constants (§1 partial) | `libs/utils/src/default/` — sort, pagination, token lifetimes |
| Build / CI (§12) | The typecheck failure on `main` and the workflow's verification steps |
| Docs drift (§12) | `CLAUDE.md` / `README.md` / `Makefile` claims against the tree |

**Deliberately NOT reached — do not read silence here as "clean":**

- **§1 Auth & token flows end to end.** Token *constants* were checked (§1.1), but the
  register → verify → login and forgot → validate → reset sequences were **not** traced for
  reuse-after-consumption, second-token-revokes-first, or expiry enforcement.
- **§3 Ownership & self-service boundaries** beyond the one route in §2.1.
- **§5 Secrets at rest** — only repository `select` shapes were checked; logs, Swagger examples, and
  error payloads were not swept.
- **§6 i18n catalog parity** — not diffed key-by-key or placeholder-by-placeholder between `en`/`id`.
- **§9 Shared-code duplication**, **§10 cache invalidation / queues**, **§11 schema vs migrations**.
- `node_modules/`, `dist/`, `generated/`, lockfiles, and `.agents/skills/`.

**Verified correct — checked and found sound:**

- **Soft-delete coverage.** All five user read paths filter `deletedAt: null`. `userInformation`
  (`user.repository.ts:310`) additionally requires `emailVerifiedAt: { not: null }` and
  `status: ACTIVE`, so a deactivated or unverified account cannot resolve to a permission set. **No
  gap found.**
- **Password handling.** Only `findByMail` selects `password`, it is the auth path, and it filters
  `deletedAt: null`. No list or detail selection exposes the hash.
- **Transaction ownership.** No repository opens a transaction — `repository.md` holds.
- **Sort and filter validation.** `user.repository.ts:69-80` rejects an unknown sort field or sort
  direction with `BadRequestException` and a translated message. This is the behaviour
  `response-codes.md` documents. `defaultSort = "createdAt"` is present in `allowedSort`, so the
  documented default ordering actually takes effect. (At sweep time the Drizzle sibling silently
  coerced instead; it was aligned to this behaviour in the same session.)
- **Status-code agreement.** Every `res.status(n)` matches the `ResponseHandler.success(n)` it wraps
  across all controllers. 201 on create, 200 elsewhere. No mismatches.

---

## Top priorities

1. **§2.1** — any logged-in user can send a verification email to any account. Access control. 🔴
2. **§7.1** — field-level validation errors reach clients under a key the documented contract does
   not mention, so forms cannot show per-field messages. 🔴
3. **§1.1** — email-verification and password-reset tokens all share one expiry frozen at process
   start. 🟠
4. **§7.2** — five of the eight user endpoints document no success body in Swagger. 🟠
5. **§7.3 / §12.1 / §12.2** — decorator inconsistency, Swagger tagging, and doc claims that
   contradict the tree. 📄

---

## §1 Auth & token constants

### §1.1 Every verification and reset token shares one expiry, frozen at process start — 🟠 latent risk — CONFIRMED — ✅ RESOLVED 2026-08-20

**Where:** `libs/utils/src/default/token-lifetime.ts:3-11`

**What this is.** When someone registers, the app emails them a verification link backed by a row
with an expiry timestamp; the same shape backs password reset. The intended lifetime is "two hours
from when this token was issued". Both lifetimes are exported from `@utils` as named constants and
used wherever a token row is created.

**Why this can happen.** The constants are not functions — they are the *result* of calling
`DateUtils.addHours(DateUtils.now(), 2).toDate()` at module load. `DateUtils.now()` runs exactly once,
when the module is first imported during boot. Every token issued afterwards is stamped with that
same absolute timestamp, computed from process start time rather than from issue time.

**What it costs.** The window shrinks as the process ages. A user registering four hours after the
last deploy gets a token that expired two hours ago and cannot verify their email at all; a user
registering one minute after boot gets very nearly the full two hours. Under PM2 with `autorestart` —
and in production, where `ecosystem.config.js` runs `instances: "max"` in cluster mode — each worker
boots at a slightly different moment, so two users registering at the same second can receive
different expiries depending on which worker served them. Local development hides it completely,
because `make dev` restarts on every file save.

**What we should do.** Convert both to functions — `emailVerificationLifetime()` and
`resetPasswordLifetime()` — and call them at the point each token row is written. Update every call
site (they are few; grep `Lifetime`). Roughly an hour including a test that issues two tokens a
simulated hour apart and asserts different expiries. The same defect exists in
`clean-nest-drizzle-pg` — fix both or neither, since they are meant to stay in sync.

---

## §2 Access control

### §2.1 Any authenticated user can trigger a verification email for any account — 🔴 bug — CONFIRMED — ✅ RESOLVED 2026-08-20

**Where:** `src/settings/users/users.controller.ts:82-83`
(`@Post(":id/resend-verify-email")`), compare siblings at `:54`, `:111`, `:170`, `:193`, `:265`

**What this is.** `UsersController` sits behind `@UseGuards(AuthGuard, PermissionGuard, RoleGuard)`,
which establishes *who* the caller is. Restricting *what* they may do is the job of a per-method
`@PermissionAuth("entity:action")` or `@RoleAuth(...)` decorator. Every other method on the
controller carries one: create is `user:create`, list is `user:list`, update is `user:update`, and so
on.

**Why this can happen.** `POST /users/:id/resend-verify-email` carries `@ApiStandardResponses()` and
`@ApiOkResponse(...)` but **no** `@PermissionAuth` and no `@RoleAuth`. `PermissionGuard` has nothing
to check, so the route is gated by authentication alone. Any user with a valid token — including the
lowest-privilege account in the system — can call it with an arbitrary `:id`.

**What it costs.** Two things. First, it is an authenticated email trigger with no authorization: a
logged-in attacker can drive repeated verification mail to any user id they can guess or enumerate,
which is a spam and deliverability problem (your sending domain takes the reputation hit, not
theirs). Second, the response distinguishes a real id from an unknown one, which turns the endpoint
into a user-id oracle for anyone with any account. The global throttler caps this at 60 requests per
minute per client, which limits volume but does not fix the authorization gap.

**What we should do.** Add `@PermissionAuth("user:update")` to match its siblings, or — if the
intent is genuinely self-service — assert the `:id` equals `@CurrentUser().id` and let any
authenticated caller through only for their own account. Fifteen minutes plus a test asserting a 403
for a non-permitted caller. Decide which of the two semantics is wanted before writing it; they are
meaningfully different features. The seeded catalog
(`{user,role,permission}:{list,create,view,update,delete,restore}`) already contains `user:update`,
so no seed change is needed. Already recorded in `.claude/rules/routes.md` → "Known gaps".

---

## §7 Response contract

### §7.1 Field-level validation messages reach the client under an undocumented key — 🔴 bug — CONFIRMED — ✅ RESOLVED 2026-08-20

**Where:** `libs/common/src/pipes/custom-validation/custom-validation.pipe.ts:38`
(`errors: formattedErrors`), `libs/common/src/response/response.ts` (`handleError`, the
`UnprocessableEntityException` branch),
`libs/common/src/decorators/api-response/api-response.decorator.ts` (the 422 example)

**What this is.** When a request body fails its DTO rules, `CustomValidationPipe` collects the
failures into a map of `{ fieldName: ["message", …] }`, translates each message through i18n, and
throws it as a 422. `ResponseHandler.handleError` catches that and spreads the thrown payload onto
the standard error envelope **verbatim**, so whichever key the pipe chose is exactly the key the
client receives. A front-end reads that map to render each message underneath the input that caused
it.

**Why this can happen.** The pipe throws the map under `errors` (plural). Every other part of the
contract says `error` (singular): `@ApiStandardResponses` documents the 422 body with
`error: { field1: [...] }`, and every hand-thrown 422 in `src/` — the uniqueness checks in
`users.service.ts`, `roles.service.ts`, and `auth.service.ts` — uses `error`. Because `handleError`
does not normalise the key, a DTO-level failure and a service-level failure return *different
shapes* from the same status code on the same endpoint.

**What it costs.** A client written against the documented contract looks for `error`, finds nothing
on any DTO validation failure, and cannot attach a message to a field. Every `@IsEmail`,
`@IsStrongPassword`, and `@IsNotEmpty` message degrades to a generic form-level banner or is dropped
— on `POST /users` and `POST /auth/register`, the two endpoints where per-field feedback matters
most. The i18n work that translates those messages into `id` is wasted, because the client never
finds them.

**What we should do.** Rename the key to `error` in the pipe's `exceptionFactory` so both producers
of a 422 agree, then delete the note from `.claude/rules/response-codes.md`. About an hour including
a controller-level test asserting the 422 body shape. Check first whether any existing consumer has
already compensated by reading `errors` — if so, the rename is a breaking change for it and needs
coordinating. The same defect exists in `clean-nest-drizzle-pg`.

### §7.2 Five of the eight user endpoints document no success response — 🟠 inconsistency — CONFIRMED — ✅ RESOLVED 2026-08-20

**Where:** `src/settings/users/users.controller.ts` — `GET /users/:id` (`:169`),
`PATCH /users/:id` (`:192`), `PATCH /users/:id/status` (`:216`),
`PATCH /users/:id/password` (`:240`), `DELETE /users/:id` (`:264`)

**What this is.** `/docs` is generated from decorators. `@ApiStandardResponses(...)` declares the
*error* responses an endpoint can produce; a separate decorator — `@ApiSuccessResponse(status, …)`,
or a raw `@ApiOkResponse` / `@ApiCreatedResponse` — declares the success body. `response-codes.md`
treats an endpoint that works but is undocumented in `/docs` as an incomplete change.

**Why this can happen.** Those five methods carry `@ApiStandardResponses({})` (and in three cases an
empty options object, which is just the all-defaults call written the long way) and no success
decorator of any kind. The other three methods on the controller do have one:
`POST /users` uses `@ApiCreatedResponse`, `POST /users/:id/resend-verify-email` uses
`@ApiOkResponse`, and `GET /users` uses the project's own `@ApiSuccessResponse`.

**What it costs.** In the published reference those five endpoints show 400/401/403/422/500/503 and
no 200 at all. Someone integrating against `/docs` — the audience the Scalar UI exists for — cannot
see the response shape of *reading a user*, *updating a user*, or *deleting a user*, and has to call
the API and observe it. It also means the generated OpenAPI document cannot produce a usable typed
client for those operations.

**What we should do.** Add `@ApiSuccessResponse(200, "<what happened>", <example>)` to each of the
five, matching the existing `GET /users` usage. Under an hour for all five. Fold in §7.3 while you
are in the file. Identical in `clean-nest-drizzle-pg`.

### §7.3 Three different decorators are used for the same job — 🟡 hygiene — CONFIRMED — ✅ RESOLVED 2026-08-20

**Where:** `src/auth/auth.controller.ts` (raw `@ApiResponse({...})` on all 8 methods),
`src/settings/users/users.controller.ts:56` (`@ApiCreatedResponse`), `:84` (`@ApiOkResponse`),
`:116` (`@ApiSuccessResponse`); compare `src/settings/roles/roles.controller.ts` and
`permissions.controller.ts`, which use `@ApiSuccessResponse` throughout

**What this is.** The project ships `@ApiSuccessResponse(status, description, example, schema?)` in
`@common` specifically so success bodies are declared one way and rendered in the standard envelope
shape (`{ code, success, message, data }`).

**Why this can happen.** `AuthController` predates or ignores the helper and hand-rolls
`@ApiResponse({ status, description, schema: { example: {...} } })` on every method.
`UsersController` uses three different mechanisms across three adjacent methods. Roles and
Permissions use the helper consistently.

**What it costs.** No runtime impact — this is documentation shape only. The cost is drift: the
envelope is spelled out by hand in eight places in `AuthController`, so a change to the standard
response shape has to be applied eight times and will be missed somewhere. It also makes §7.2 easy to
introduce, because there is no single decorator whose absence is obvious.

**What we should do.** Migrate `AuthController` and the two odd methods in `UsersController` to
`@ApiSuccessResponse`. Mechanical, roughly two hours. Worth doing in the same pass as §7.2. If the
helper cannot express something `AuthController` needs (the login response embeds tokens), extend
the helper rather than keeping the exception — and write that down in `response-codes.md`.

### §7.4 429 is reachable on every route but cannot be documented through the decorator — 🟡 hygiene — CONFIRMED — ✅ RESOLVED 2026-08-20

**Where:** `libs/common/src/decorators/api-response/api-response.decorator.ts`
(`ApiStandardResponsesOptions`), `libs/common/src/throttler/throttler.module.ts`

**What this is.** `ThrottlerGuard` is registered as an `APP_GUARD`, so **every** route in the
application is rate-limited and can throw a 429.

**Why this can happen.** `ApiStandardResponsesOptions` here declares six flags — `badRequest`,
`unauthorized`, `forbidden`, `validation`, `internalServerError`, `serviceUnavailable` — and no 429
flag at all. Passing one is silently ignored, because excess properties on an options object are not
an error at these call sites.

**What it costs.** A status every endpoint can return is absent from the published reference, so a
client integrating from `/docs` has no reason to implement backoff and will treat the first 429 as
an unexpected error. Note the Drizzle sibling *does* ship a 429 flag (misspelled `toManyRequests`),
so the two templates document different response sets from otherwise identical throttler wiring.

**What we should do.** Add a `tooManyRequests` flag defaulting to `true`, mirroring the other six.
About half an hour. Spell it correctly here and fix the Drizzle sibling's spelling in the same pass,
so the two agree. Until then, add a raw `@ApiResponse({ status: 429 })` on any endpoint where it
matters. Documented in `.claude/rules/response-codes.md` and `rate-limiting.md`.

---

## §12 Build, CI, and documentation drift

### §12.1 `AuthController` and `AppController` are untagged in Swagger — 📄 doc — CONFIRMED — ✅ RESOLVED 2026-08-20

**Where:** `src/auth/auth.controller.ts` (`@Controller("auth")` with no `@ApiTags`),
`src/app.controller.ts`; compare `health.controller.ts`, `users.controller.ts:45`,
`roles.controller.ts`, `permissions.controller.ts`

**What this is.** `@ApiTags("...")` groups a controller's routes under a heading in the API
reference. `swaggerConfig` declares no explicit `.addTag(...)` calls, so tags exist only where a
controller declares one, and untagged controllers fall into an unnamed default bucket.

**Why this can happen.** Four controllers are tagged (`Health`, `Settings/Users`, `Settings/Roles`,
`Settings/Permissions`). `AuthController` and `AppController` are not.

**What it costs.** The eight authentication routes — login, register, verify, forgot/reset password,
profile — are the first thing a new integrator looks for, and they are the ones scattered into an
untitled group while the CRUD screens are neatly organised. It reads as an oversight in a reference
that is otherwise carefully structured.

**What we should do.** Add `@ApiTags("Auth")` to `AuthController`. `AppController` is a single
unauthenticated welcome route, so it matters less, but tag it too for consistency. Ten minutes.
Recorded in `.claude/rules/routes.md` → "Known gaps".

### §12.2 `CLAUDE.md` documents a test file that does not exist — 📄 doc — CONFIRMED — ✅ RESOLVED 2026-08-20

**Where:** `CLAUDE.md` (Commands → `bun run test -- src/settings/users/users.service.spec.ts`)

**What this is.** `CLAUDE.md` is the first document a contributor or coding agent reads, and its
Commands section is meant to be copy-pasteable.

**Why this can happen.** It shows how to run a single spec file and names
`src/settings/users/users.service.spec.ts`. The repository contains **zero** `*.spec.ts` files, so
`bun run test` matches nothing and the quoted command fails.

**What it costs.** It fails at the moment a new contributor first tries it. More broadly, it implies
a test suite that does not exist, which makes every "is this covered?" question in this report harder
to answer — none of the invariants in §1, §2, or §7 has a regression test.

**What we should do.** Either correct the example to a path that exists, or add the spec it names —
`users.service.spec.ts` would be a reasonable first test given §2.1 and §7.1 both live on that
surface. Minutes for the doc fix. Per `.claude/rules/documentation.md` this should not have survived
a change to the code it describes.

### §12.3 CI passed steps that could not fail, and typecheck was broken on `main` — 📄 doc / 🟠 — CONFIRMED, ✅ RESOLVED 2026-08-20

> **Resolved on `main` in `5b8d8cd`.** `fastify` is pinned to `5.11.3` so a single copy is installed
> and `@fastify/multipart`'s module augmentation applies to the instance Nest registers against;
> `format:check` and `lint:check` scripts were added and the workflow now calls those instead of the
> auto-fixing variants. `main` is green again. Original finding follows.

**Where:** `.github/workflows/build.yaml` ("Check formatting", "Run linter", "Type check"),
`package.json` (`format`, `lint`, `lint:fix` scripts), `src/main.ts:42`

**What this is.** CI is the only automated gate on this repository — there are no tests — so the
value of every merge check rests on those steps actually being able to fail.

**Why this can happen.** Two independent problems. (1) "Check formatting" ran `bun run format`,
which is `prettier --write`: it rewrites files in a throwaway checkout and exits 0 regardless, so it
never checked anything. "Run linter" ran `bun run lint:fix` (`eslint --fix`), same shape. (2) The
`bun update` in `c1c9a40` moved root `fastify` to 5.12.1 while `@nestjs/platform-fastify` hard-pins
`fastify` 5.11.3, so bun installed a nested duplicate. `@fastify/multipart` augments the *root*
copy's `FastifyInstance` with `multipartErrors`, but `app.register()` is typed against the *nested*
copy, so registering `fastifyHelmet` stopped compiling.

**What it costs.** `main` was red for two commits, and the one step that did work (Type check) was
reporting a dependency-resolution problem in language that pointed at Helmet, which is misleading.
Meanwhile a real formatting or lint regression would have sailed through green.

**What we should do.** Done — see the resolution note above. Remaining related work: there is still
no test step, because there are no tests (§12.2).

---

## Recorded elsewhere, still open

Confirmed during this sweep and already written into `.claude/rules/contradiction-halt.md`. Listed
here so the report is self-contained; not re-numbered.

- **`ThrottlerModule` re-exports itself** (`exports: [ThrottlerModule]`) — inert, since the guard is
  global via `APP_GUARD`, but it exports nothing usable. 🟡

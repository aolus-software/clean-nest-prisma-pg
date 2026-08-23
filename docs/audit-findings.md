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

---

# Sweep 2 — full code-level read (2026-08-23)

**Sweep date:** 2026-08-23
**Scope:** the first pass of the end-to-end code read requested as item 4 in the workspace handoff —
`libs/common` (guards, strategy, decorators, cache, mail), `libs/config` (env validation),
`libs/repositories` (user / role / permission repositories, seeds), `src/auth` (service), and the
guard wiring on all three `src/settings` controllers. Item 7 (BullMQ wiring, CI, dependency
currency) is folded in.
**Ground truth:** `CLAUDE.md`, `.claude/rules/*.md`, and the running code. Cross-checks against the
sibling `clean-nest-drizzle-pg` are stated where they apply.

**Severity legend:** 🔴 bug · 🟠 inconsistency / latent risk · 🟡 hygiene · 📄 doc
**Evidence:** CONFIRMED (traced end to end) · SUSPECT (something unverified, named below)

> **Read-only. Nothing below has been fixed.** Per `.claude/rules/audit-findings.md` → "Audits do not
> fix things", and per the handoff's instruction that item 4 stays read-only until findings are agreed.

**Section numbers use an `R` prefix** (`§R1`–`§R6`) so they never collide with the `§1`–`§12` sweep
above. Numbering is kept aligned with the sibling repo's sweep so the two reports can be read
side by side; gaps are deliberate and mean "not present in this repo".

> ## ✅ All 14 findings above were approved and fixed on 2026-08-23
>
> The sweep itself wrote no code. Fixes were a separate, explicitly approved step, per
> `.claude/rules/audit-findings.md` → "Audits do not fix things". Original finding text is kept
> unedited below.
>
> **Everything was verified against a running instance**, not by re-reading — the stack was brought
> up, migrated and seeded, and each finding reproduced before the fix and re-checked after. That is
> how a defect not in this report at all was found: see §R2.6, appended below.
>
> **Decisions taken with the owner**, since three findings were trade-offs rather than plain bugs:
> the enumeration leak is closed everywhere (§R1.3, §R1.4) at the cost of the more helpful login
> message; `@PermissionAuth` is conjunctive (§R2.2); and all three guards were promoted to
> `APP_GUARD` with a new `@Public()` decorator (§R2.1, §R2.4), which required making `AuthGuard`
> global too — a naive promotion returns 403 instead of 401 for unauthenticated requests, because
> global guards run before controller-scoped ones.
>
> **Sequencing that mattered:** §R3.1 was fixed *with* §R2.3, never before it. Correcting the cache
> TTL alone would have widened the stale-authorization window from ~3.6 seconds to a full hour.
>
> §R4.5 was resolved by making `name`, `email` and `group` case-insensitive substring matches
> (`contains` + `mode: "insensitive"`), which is now consistent across all three repositories here
> and with the sibling.



## Coverage

**Reached and read:** all three guards; `auth.strategy.ts` and the auth decorators; the cache service,
module, and every call site; the mail service, processor, and module; the envalid schema; the
`findAll` filter/sort/soft-delete paths of all three repositories; `permission.seed.ts` against every
guard string in `src/`; `src/auth/auth.service.ts` end to end; the guard wiring on all three settings
controllers; `bun outdated`.

**Not reached in this pass — do not read these as clean:** the settings controllers' method bodies and
Swagger decorators; `src/settings/**/*.service.ts`; all DTOs; the pipes, interceptors, and
`api-response` decorators; `libs/utils/src/{date,string,number,encryption,logger}`;
`prisma/schema.prisma` and the migrations; `src/health`; `src/app.controller.ts`; the i18n catalogues.

## Top priorities

1. **Any authenticated user can create, edit, and delete permissions** — the superuser gate on that
   controller is silently inert (§R2.1).
2. **A revoked role or permission stays in force, and nothing invalidates it** — currently masked by a
   second bug (§R2.3, §R3.1).
3. **An out-of-range `filter[status]` reaches Prisma unchecked** (§R4.3).
4. **A date-range filter silently excludes its final day, and an unparseable date is not rejected**
   (§R4.7).
5. **The verification email is enqueued inside the transaction that creates its token** (§R5.1).

---

## §R1 Authentication

### §R1.3 Login reveals whether an address is registered, and its account state, before checking the password — 🟠 latent risk — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `src/auth/auth.service.ts:26-65`

**What this is.** `login` looks the user up by email and runs three checks — email verified, status
active, password correct — throwing a distinct message for each.

**Why this can happen.** The verification and status checks sit above the password comparison, so
they are reachable with any password. An unknown address returns `invalid_credentials`; a
known-but-unverified one returns `verify_email_required`; a suspended one returns `account_inactive`.

**What it costs.** An unauthenticated caller can enumerate which addresses hold accounts, and learn
each one's verification and activation state, one junk-password request at a time. That turns a
mailing list into a target list for credential stuffing and for phishing that cites the victim's real
account state.

**What we should do.** Move the password comparison above the other two checks, so a wrong password
fails identically whatever the account state. This is a genuine product trade-off — "verify your
email" is more helpful to a real user — so it wants a decision rather than a silent change. The same
ordering exists in `clean-nest-drizzle-pg`; decide once for both.

### §R1.4 The "silent" endpoints are only silent for addresses that do not exist — 🟠 latent risk — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `src/auth/auth.service.ts:157-172` (`resendVerificationEmail`), `:234-249`
(`forgotPassword`)

**What this is.** Both return early with no error when the address is unknown — the standard defence
against account enumeration.

**Why this can happen.** The silence stops one line later: `resendVerificationEmail` throws when the
address exists and *is* verified, `forgotPassword` throws when it exists and is *not*. Between them a
caller learns both existence and verification state.

**What it costs.** The enumeration defence does not hold on the two endpoints written to provide it.
A 200 with an empty body means "no such account"; a 422 means "account exists", and which 422 tells
you its state.

**What we should do.** Return silently in both branches. If the "already verified" feedback is wanted
for UX, put it behind an authenticated endpoint. Decide together with §R1.3.

> **Not present in this repo:** the inverted token predicate that breaks email verification and
> password reset in `clean-nest-drizzle-pg` (its §R1.1 and §R1.2). This repo queries the token by
> value alone and checks `usedAt` in code — `auth.service.ts:184-198`, `:272-291`, `:295-320` — which
> is the correct shape and the reference the sibling should be fixed against.

---

## §R2 Access control

### §R2.1 Any authenticated user can create, edit, and delete permissions — 🔴 bug — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `src/settings/permissions/permissions.controller.ts:40-41`,
`libs/common/src/guards/role/role.guard.ts:16-24`,
`libs/common/src/decorators/role-auth/role-auth.decorator.ts`

**What this is.** RBAC is decorator-driven: `@UseGuards(AuthGuard, RoleGuard)` attaches the guards and
`@RoleAuth("superuser")` declares the required role, which `RoleGuard` reads back through NestJS's
`Reflector`. `PermissionsController` is gated this way and only this way — unlike the users and roles
controllers, none of its five methods carries a per-method permission.

**Why this can happen.** `@RoleAuth("superuser")` is applied at **class** level, but the guard only
inspects the handler:

```ts
const requiredRoles = this.reflector.get<string[]>("roles", context.getHandler());
if (!requiredRoles) {
    return true;                                  // every method takes this branch
}
```

`SetMetadata` on a class stores metadata on the class; `reflector.get(key, context.getHandler())`
never consults it. So `requiredRoles` is `undefined` on all five handlers and the guard returns
`true` before checking anything. The decorator is present, the guard is registered, `/docs` shows the
lock — and nothing is enforced.

**What it costs.** Every `/settings/permissions` route is protected by authentication alone. A
self-registered user can **delete the permission catalogue**, which revokes authorization for every
non-superuser in the system; or **rename a permission**, which is the escalation path — a caller
holding any permission through a role can rename that row to a more powerful name, and because the
role link is by row id, `PermissionGuard` then honours the new name for them.

**What we should do.** Read both targets, the standard NestJS idiom:

```ts
const requiredRoles = this.reflector.getAllAndOverride<string[]>("roles", [
    context.getHandler(),
    context.getClass(),
]);
```

Apply the same to `PermissionGuard`, which has the identical read and would fail identically the
moment `@PermissionAuth` is used on a class. **The identical defect is in `clean-nest-drizzle-pg`**,
same files, same lines — fix both together. Under an hour, but verify with a request against a
running server, not a re-read: the whole point is that it looks correct on the page.

### §R2.2 A route requiring two permissions is satisfied by holding either one — 🟠 latent risk — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `libs/common/src/guards/permission/permission.guard.ts:39-41`

**What this is.** `@PermissionAuth(...)` is variadic, so a route can name several permissions; the
natural reading of two is that both are required.

**Why this can happen.** The guard uses `.some(...)` — OR, not AND. Every route today names exactly
one permission, so nothing is currently mis-gated. It becomes live the first time someone writes
`@PermissionAuth("user:update", "role:update")` expecting a conjunction.

**What it costs.** Nothing today. Thereafter, such a route is gated at its *least* restrictive
permission, with no error and no log.

**What we should do.** Decide the semantics and make code and decorator agree. Both Elysia siblings
use `.every(...)` and say so in `rbac.md`, so AND is the house reading and switching breaks nothing.
Record the decision in `.claude/rules/` — no rule currently states it. `RoleGuard` has the same
`.some(...)`, where OR is arguably right for roles; if the two differ, write that down.

### §R2.3 A revoked role or permission stays in force — nothing invalidates the cached user — 🔴 bug — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `libs/common/src/strategies/auth.strategy.ts:26-38`, `src/auth/auth.service.ts:68`,
`:80-84`, `libs/common/src/cache/const.ts`

**What this is.** On every authenticated request `AuthStrategy.validate` resolves the caller's roles
and flattened permissions, and both guards decide from that object. It is cached in Redis under
`user:<id>`, read first and rebuilt from the database only on a miss.

**Why this can happen.** `user:<id>` is written in two places and deleted in one, all three inside
`login`. Grepping the tree for `UserCache(` returns four call sites and none is in `src/settings/`.
So changing a user's roles through the users controller, or a role's permissions through the roles
controller, leaves the cached authorization data untouched.

**What it costs.** Revoking access does not revoke access. A user whose role is removed keeps every
permission it carried until the cache entry expires — and logging out does not clear it either. For
an operator responding to a compromised or departing account, "I removed their role" is not true when
they believe it is.

**The window is currently small, and only by accident.** §R3.1 means entries expire after roughly 3.6
seconds rather than the intended hour. **Fixing §R3.1 alone widens this from seconds to an hour.**

**What we should do.** Delete the entry wherever authorization data changes — the user update and
delete paths, and the role update path for every user holding that role. `CacheService.del` and
`UserCache(userId)` already exist; the role case needs the affected user ids from `UserRepository`.
Half a day including the fan-out. Fix **before or with** §R3.1, never after. Same gap in
`clean-nest-drizzle-pg`.

### §R2.4 `RoleGuard` is not registered on the roles controller — 🟠 latent risk — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `src/settings/roles/roles.controller.ts:37`

**What this is.** A guard runs only if listed in `@UseGuards`. `UsersController` registers all three,
which is why its method-level `@RoleAuth("superuser")` at `:261` works.

**Why this can happen.** `RolesController` registers only `AuthGuard, PermissionGuard`. Adding
`@RoleAuth` to a method there would compile, read correctly, pass review — and do nothing.

**What it costs.** Nothing today. It is a loaded footgun of the same family as §R2.1: an auth
decorator that is present and inert.

**What we should do.** Register all three guards on every settings controller, or promote both to
`APP_GUARD` alongside `ThrottlerGuard` — they already no-op when their metadata is absent, so global
registration is safe and removes the class of mistake. The latter is the more durable fix; consider
it together with §R2.1.

---

## §R3 Cache

### §R3.1 Cached entries expire after 3.6 seconds instead of an hour — 🟠 latent risk — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `libs/common/src/cache/cache.service.ts:10-12`, `libs/common/src/cache/cache.module.ts:18`,
`libs/config/src/env/index.ts` (`REDIS_TTL`)

**What this is.** `REDIS_TTL` is an envalid-validated number defaulting to `3600`; its name and
default both say seconds. The module registers a store-wide default TTL; `CacheService.set` passes a
per-key TTL on each write.

**Why this can happen.** The two disagree about units. The module multiplies —
`ttl: env.REDIS_TTL * 1000` — and the service does not:

```ts
const ttlValue = ttl ? ttl : getEnv().REDIS_TTL;
await this._cacheManager.set(key, value, ttlValue);
```

`cache-manager` v7, which `@nestjs/cache-manager` v3 wraps, takes milliseconds — the module's own
`* 1000` is the evidence. Since `AuthStrategy` always passes `null`, every cached user gets 3.6
seconds. A smaller edge in the same line: `ttl ? ttl : ...` treats an explicit `0` as "not supplied".

**What it costs.** The user cache does almost nothing — past the first seconds of a session,
practically every authenticated request rebuilds the user's roles and permissions from Postgres, a
multi-table join on the hot path of every request.

**The interaction is the important part.** This is what limits §R2.3's stale-permission window to a
few seconds. Correcting the units in isolation — a one-token change that looks purely like a
performance fix — silently converts a 3.6-second authorization staleness window into a one-hour one.

**What we should do.** Multiply in the service to match the module, and use `??` so `0` means what it
says. **Do not ship without §R2.3's invalidation**, and say so in the commit message. Minutes for the
change; the sequencing is the real content. Identical mismatch in `clean-nest-drizzle-pg`.

---

## §R4 List queries — filtering and sorting

### §R4.3 An out-of-range status filter reaches Prisma unchecked — 🔴 bug — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `libs/repositories/src/repositories/user.repository.ts:116-121`

**What this is.** `status` is a Prisma enum (`UserStatus`), and `filter[status]` is allow-listed by
**key** — the repository confirms `status` is filterable before building the `where`.

**Why this can happen.** The key is checked; the **value** is not. It is cast straight through:

```ts
status: queryParam.filter["status"] as UserStatus,
```

`as` is a compile-time assertion with no runtime effect, so any string reaches Prisma as an enum
value. Prisma rejects it with a `PrismaClientValidationError`.

**What it costs.** `GET /settings/users?filter[status]=BOGUS` produces a 500 rather than the 400 the
allow-list machinery exists to produce. A client typo looks like a server fault, it is noise in error
monitoring, and it is a cheap way for any authenticated caller to generate 500s. Same defect Tier 8
found in both Elysia repos.

**What we should do.** Validate the value against `Object.values(UserStatus)` before building the
`where` and throw the same translated `BadRequestException` the key check throws, naming the allowed
set. Read the members from the generated Prisma enum rather than restating them. Under an hour. The
same unchecked cast is in `clean-nest-drizzle-pg`.

### §R4.5 `filter[name]` means different things on different endpoints — 🟠 inconsistency — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `user.repository.ts:143-149`, `role.repository.ts:83-88`, `permission.repository.ts`

**What this is.** All three list endpoints advertise a `name` filter through the same
`@ApiDatatableQueries` machinery, and `/docs` presents them identically.

**Why this can happen.** Each repository implements it as exact equality —
`name: queryParam.filter["name"].toString()` — with no `contains` mode. The sibling
`clean-nest-drizzle-pg` implements the user one as a substring match (`ilike '%x%'`), so the same
documented parameter behaves differently across the two templates as well as being unstated here.

**What it costs.** A client that expects `filter[name]=jane` to find "Jane Doe" gets an empty page.
Nothing in the response or the docs indicates that exact match was required, and the search box a UI
would naturally wire to this parameter appears broken.

**What we should do.** Pick one semantics — substring is the usual expectation for a name filter —
apply it consistently across the three repositories here **and** across the two Nest templates, and
record it in `.claude/rules/repository.md`, which currently says what may be filtered but not how.
Half a day including the rule.

### §R4.7 A date-range filter excludes its last day, and an unparseable date is never rejected — 🔴 bug — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `libs/repositories/src/repositories/user.repository.ts:164-178`,
`role.repository.ts:90-115`, and the equivalent `updatedAt` blocks in each

**What this is.** The list endpoints accept `filter[createdAt]` and `filter[updatedAt]` as a
comma-separated range — `filter[createdAt]=2024-01-01,2024-12-31` — split into a `gte` / `lte` pair.

**Why this can happen.** Three problems in one block:

```ts
const [startDate, endDate] = queryParam.filter["createdAt"].split(",");
filterCondition = {
    ...filterCondition,
    createdAt: {
        gte: DateUtils.parse(startDate).toDate(),
        ...(endDate && { lte: DateUtils.parse(endDate).toDate() }),
    },
};
```

1. **The end of the range is midnight.** `createdAt` is a timestamp, and `DateUtils.parse("2024-12-31")`
   yields `2024-12-31T00:00:00`. `lte` against that excludes everything recorded during 31 December
   except the first instant. An inclusive-looking range silently drops its final day.
2. **Nothing validates the dates.** `DateUtils.parse("banana")` produces an invalid date, `.toDate()`
   yields `Invalid Date`, and that reaches Prisma. A reversed range (`end,start`) is accepted and
   quietly matches nothing. More than two comma-separated parts are silently truncated to the first
   two.
3. **The timezone is the host's**, not the application's. A bare `YYYY-MM-DD` is read as wall-clock
   time wherever the process runs, so on a non-UTC host the window lands on the wrong calendar day.

**What it costs.** A report filtered to a month is missing the last day of it, with a 200 and no
indication anything was dropped — the kind of error that is found by someone reconciling totals, long
after the fact. A malformed date produces a 500 rather than a 400. And the same query returns
different rows depending on the server's timezone.

**What we should do.** Parse the range through one shared helper that validates both ends, rejects a
reversed or over-long range with a translated `BadRequestException`, snaps the end to end-of-day, and
resolves bare dates in the application timezone rather than the host's. Tier 9 built exactly this for
the Elysia repos (`DatatableToolkit.filterDateRange`) after finding the identical three problems —
that implementation is the reference. Roughly a day including a shared helper and the call sites.
`clean-nest-drizzle-pg` has **no** date filters at all, so this is specific to this repo.

### §R4.8 The status filter is applied twice — 🟡 hygiene — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `libs/repositories/src/repositories/user.repository.ts:116-121` and `:157-162`

**What this is.** The `findAll` filter block builds a Prisma `where` object by spreading each
condition onto an accumulator.

**Why this can happen.** The `if (queryParam.filter["status"])` block appears twice in the same
function, forty lines apart, with identical bodies. The second spread overwrites the first with the
same value.

**What it costs.** Nothing behavioural — the result is identical. It is listed because it is a
copy-paste artefact sitting in the middle of the block where §R4.3's unchecked cast lives, so anyone
fixing that has to notice there are two sites, not one. The same duplication was found and removed in
`clean-elysia-prisma` in Tier 8.

**What we should do.** Delete the second block. Minutes. Do it as part of the §R4.3 fix so the
validation is not added in one place and missed in the other.

---

## §R5 Queue and mail

### §R5.1 The verification email is enqueued inside the transaction that creates its token — 🔴 bug — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `src/auth/auth.service.ts:116-142` (`register`), `libs/common/src/mail/mail.service.ts`

**What this is.** Registration writes the user row and a verification-token row in one Prisma
transaction, then sends the mail. Mail is asynchronous: `MailService.sendMail` pushes a job onto the
`mail-queue` BullMQ queue in Redis, and a separate processor sends it.

**Why this can happen.** The enqueue sits **inside** the `prisma.$transaction` callback, after the
`emailVerification.create`. Redis and Postgres share no transaction, so the job is visible to the
worker the instant it is added — before the transaction commits. Two failure modes follow:

1. **The race.** The worker sends the mail and the user clicks the link before the commit lands.
   `verifyEmail` finds no such token and reports an invalid one, for a link issued seconds earlier.
2. **The rollback.** If anything after the enqueue fails, Postgres rolls back and the user row never
   exists — but the job is already in Redis and the mail goes out, carrying a verification link for
   an account that was never created.

**What it costs.** Intermittent, unreproducible "invalid token" reports on freshly issued links, and
verification mail for non-existent accounts. Both look like user error and are near-impossible to
diagnose from a support ticket. The window widens exactly when the database is slow — when it matters
most.

**This repo's own rules already forbid it**, which makes the fix uncontroversial:
`.claude/rules/queue.md` rule 11 says "Do not enqueue inside a Prisma transaction. If the transaction
rolls back the job stays in Redis." `register` is the one place that does. Note `forgotPassword`
(`:249-265`) correctly enqueues **outside** its write, so the correct shape is already in the file.

**What we should do.** Move the enqueue after the transaction — return the token from the callback
and send once it has committed, matching `forgotPassword`. Under an hour. The same pattern is in
`clean-nest-drizzle-pg`, where it affects **both** `register` and `forgotPassword`, and where the
rule file teaches the bug rather than forbidding it.

### §R5.2 A transient mail failure loses the message permanently and logs nothing — 🟠 latent risk — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `libs/common/src/mail/mail.module.ts` (queue registration),
`libs/common/src/mail/mail.processor.ts`

**What this is.** `BullModule.registerQueue` configures the queue; the processor sends each job
through nodemailer and logs a line naming the recipients.

**Why this can happen.** The queue is registered with a `connection` and nothing else — no
`defaultJobOptions`, so no `attempts` and no `backoff`, and BullMQ's default is a single attempt. And
there is no `@OnWorkerEvent("failed")` handler, so a failed job moves to the failed set silently.

**What it costs.** An SMTP hiccup, a provider rate limit, or a brief network fault permanently drops a
verification or password-reset email, with no retry and nothing in the logs. The user sees a
registration that appears to succeed and mail that never arrives; the operator has nothing to
correlate.

**What we should do.** Add `defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay:
2000 } }` and an `@OnWorkerEvent("failed")` handler logging through `LoggerUtils.error` with the job
id and recipient — which is what this repo's own `.claude/rules/queue.md` rules 5, 6, and 10 already
require, and what neither the module nor the processor currently does. Under an hour. Same gap in
`clean-nest-drizzle-pg`, which has no queue rule at all.

---

## §R6 Configuration and hygiene

### §R6.3 The service rule contradicts the i18n rule on exception messages — 📄 doc — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `.claude/rules/service-crud.md`, `.claude/rules/service.md`, `.claude/rules/i18n.md`

**What this is.** Two rule files describe how a service reports a missing entity, and they disagree.

**Why this can happen.** `i18n.md` shows the compliant form and states the principle — "Never
hardcode an English literal in a controller, service, DTO, or repository" — while `service-crud.md`
and `service.md` both present a bare English template literal as the canonical shape, and
`service.md` specifies the format as a requirement in its exception table.

**What it costs.** Someone following `service-crud.md`, the file named for exactly this task, writes
untranslated exceptions and is compliant with the rule they read. The contradiction is invisible
unless both files are open. This is the class of defect the workspace's item 8b exists to find,
caught here incidentally.

**What we should do.** Rewrite the examples in both files to use `this.i18n.t(...)` and link to
`i18n.md` as the authority on message strings. Then check the settings services against it — those
were not read in this pass, so whether the code follows the wrong rule is currently unknown. Under an
hour for the rules; the code check belongs to the next pass. The identical contradiction is in
`clean-nest-drizzle-pg`'s rule set.

> **Not present in this repo:** the dead `|| "default-secret"` JWT fallbacks (the sibling's §R6.1) —
> this repo reads `getEnv().JWT_SECRET` directly in both `jwt.utils.ts` and `auth.strategy.ts`, which
> is correct and is the reference for fixing the sibling. Nor the hardcoded English message in
> `forgotPassword` (§R6.2): this repo uses `message.auth.verify_email_required` there.

---

## Verified correct — checked, nothing found

Recorded so the next sweep can tell "clean" from "not looked at".

- **Token single use is enforced correctly.** `verifyEmail`, `isResetPasswordTokenValid`, and
  `resetPassword` each query by token value and reject a row whose `usedAt` is set, then stamp it in
  the same transaction as the write it authorises. The sibling repo has this inverted; this repo is
  the reference.
- **Soft delete on users is complete.** All four read paths in `user.repository.ts` filter
  `deletedAt: null`, including `userInformation`, which `AuthStrategy` resolves the caller
  through — so a deleted user cannot authenticate.
- **Every guard string exists in the seed.** All ten `@PermissionAuth` values in `src/` are produced
  by `permission.seed.ts`'s cross product of `["user","role","permission"]` and
  `["list","create","view","update","delete","restore"]`. No guard fails closed.
- **Filter conditions compose correctly.** Each block spreads onto the accumulator
  (`{ ...filterCondition, x }`), so two filters combine. The sibling `clean-nest-drizzle-pg` has a
  real bug here; this repo does not.
- **An unrecognised sort field, sort direction, or filter key is rejected** with a translated
  `BadRequestException` rather than coerced, and the allow-lists are exported and passed to
  `@ApiDatatableQueries`, so `/docs` shows what is enforced.
- **`/docs` is fail-closed** — `API_DOCS_ENABLED` defaults to `false` with no `NODE_ENV` term.
- **Rate limiting is genuinely global** — `ThrottlerGuard` registered as an `APP_GUARD`.
- **Mail templates exist for both locales**, and the locale is captured at enqueue time, which is
  correct — the worker runs outside the request context.
- **Dependencies show nothing alarming.** A few majors behind; no advisory-driven upgrade indicated.

---

## §R2.6 The Redis cache was never used — every process held its own in-memory copy — 🔴 bug — CONFIRMED — ✅ RESOLVED 2026-08-23

> **Found while verifying the §R2.3 fix, not during the sweep** — by checking Redis for the key the
> fix was supposed to be deleting and finding that no such key had ever existed.

**Where:** `libs/common/src/cache/cache.module.ts`, `package.json`
(`cache-manager@^7`, `@nestjs/cache-manager@^3`, `cache-manager-ioredis-yet@^2`)

**What this is.** `CacheModule` configures the store behind `CacheService`, which is what
`AuthStrategy` uses to avoid rebuilding every caller's roles and permissions from Postgres on each
request. It was written to use Redis, and `cache-manager-ioredis-yet` is a declared dependency.

**Why this can happen.** The configuration used the cache-manager v4/v5 shape — `store: redisStore`
with `host` / `port` alongside it. cache-manager v7 is Keyv-based and takes a `stores` array; those
keys are not rejected, they are silently ignored, so the module fell through to the default
in-process memory store. Nothing was ever written to Redis and nothing was raised at boot.

**What it costs.** Two things, the second being the serious one:

- The declared Redis dependency did nothing, and the cache did not survive a restart.
- **Under PM2 the cache was per-worker.** `ecosystem.config.js` runs `instances: "max"` in cluster
  mode, so each worker held an independent copy of every user's roles and permissions. That makes the
  §R2.3 invalidation fix incomplete in exactly the environment where it matters: dropping the cached
  identity clears it on the worker that served the request, while the others keep serving the revoked
  role until their own copy expires.

This went unnoticed because Redis *is* up and busy — BullMQ uses it — so "Redis is connected" was
true and misleading.

**Verified by running it.** Before: `redis-cli --scan` returned only `bull:*` keys. After:
`user:<id>` is present with a TTL of `3600`, and revoking a role's permissions still takes effect on
the very next request.

**What we should do — done.** `CacheModule` now builds a `Keyv` instance over `@keyv/redis` and
passes it in `stores`, with `useKeyPrefix: false` so the key is the plain `user:<id>` that
`UserCache()` produces. `@keyv/redis` was added as a dependency. Two follow-ups deliberately **not**
taken: `cache-manager-ioredis-yet` is now unused and could be removed (a separate change, with its
own lockfile churn), and nothing yet proves the cross-worker behaviour under an actual multi-instance
PM2 run — this was verified against a single process.

> **Both follow-ups are now closed.**
>
> `cache-manager-ioredis-yet` was removed once nothing imported it.
>
> **The cross-worker behaviour was proven against a real PM2 cluster on 2026-08-23** — not simulated.
> `ecosystem.config.js`'s production app was started with `instances: "max"`, giving **10 workers** in
> cluster mode behind one port. Sequence: 40 warm-up requests as `admin` (all 200, spreading the
> cached identity across workers); **one** revoke of the `admin` role's permissions, which by
> definition is served by exactly one worker; then 60 immediate requests round-robined across all ten
> — **all 60 returned 403**, with no sleep. Restoring the permissions returned all 30 follow-up
> requests to 200. Redis held **one `user:<id>` key per user, not one per worker**, which is the
> mechanism: the invalidation deletes a key every worker reads, rather than a copy only one of them
> holds. Before the fix this test would have left nine workers serving the revoked role until their
> own in-process copies expired.

> **Not present in this repo:** the `permissionIds` / `permission_ids` mismatch that made role
> permission assignment silently non-functional in `clean-nest-drizzle-pg` (its §R2.5). This repo
> builds the join rows in the service from `createRoleDto.permissionIds` directly, so the field never
> crosses a boundary that could rename it.

---

# Sweep 3 — code read, pass 2 (2026-08-23)

**Scope:** the surfaces the Coverage block of sweep 2 listed as *not reached* — the settings
services, all DTOs, the validation pipes, `libs/utils`, the i18n catalogues, and the seeders'
relationship to the permission vocabulary.
**Ground truth:** `CLAUDE.md`, `.claude/rules/*.md`, and the running code.

**Severity legend:** 🔴 bug · 🟠 inconsistency / latent risk · 🟡 hygiene · 📄 doc
**Evidence:** CONFIRMED (traced end to end) · SUSPECT (something unverified, named below)

> **Read-only. Nothing below has been fixed.** Findings use a `§P` prefix so they never collide with
> the `§R` sweep above. Numbering is aligned with the sibling `clean-nest-drizzle-pg` sweep; gaps
> mean "not present in this repo".

**Still not reached, after two passes:** the settings controllers' Swagger decorator blocks beyond a
spot-check, `libs/utils/src/{date,string,number,logger}` (~750 lines of helpers), `prisma/schema.prisma`
and the migrations, and the `api-response` / `api-datatable-queries` decorators.

## §P1 A permission created through the API can never satisfy a guard — 🔴 bug — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `src/settings/permissions/permissions.service.ts:17`,
`prisma/seed/permission.seed.ts:9` (the convention)

**What this is.** A permission's `name` is the string `@PermissionAuth(...)` matches against. The
seeder builds the whole catalogue as `` `${group}:${action}` `` — `user:list`, `role:create` — and
every guard in `src/` is written in that vocabulary. `POST /settings/permissions` exists so an
operator can extend the catalogue without editing the seeder.

**Why this can happen.** The create path composes the two halves in the **opposite order**:

```ts
// seeder — the convention every guard uses
const permissionName = `${group}:${action}`;      // -> "user:list"

// service create — reversed
name: `${action}:${createPermissionDto.group}`,   // -> "list:user"
```

**What it costs.** Every permission created through the API is unusable. An operator adding a
`report:export` permission posts `{ names: ["export"], group: "report" }` and gets a row named
`export:report`; a route guarded `@PermissionAuth("report:export")` will never match it, and that
route then fails **closed** for everyone except `superuser`, with nothing logged.

**Verified by running it.** `POST /settings/permissions {names:["export"], group:"report"}` stored
`export:report`. The seeded convention would be `report:export`.

**What we should do.** Compose `` `${group}:${action}` ``, matching the seeder, and rename the DTO
field so it says what it holds — `names` are *actions*, not full permission names, which is the
ambiguity that allowed the inversion. Under an hour; decide whether to migrate any API-created rows
first. **The sibling `clean-nest-drizzle-pg` has the identical inversion**, in two places.

## §P2 One `sendMail` is still enqueued inside its transaction — 🟠 latent risk — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `src/settings/users/users.service.ts:57` (inside the `prisma.$transaction` opened at `:41`)

**What this is.** §R5.1 established that enqueuing a BullMQ job inside a database transaction lets
the worker send a verification link whose token row is not committed yet, or send one at all for a
write that rolled back — which this repo's own `queue.md` rule 11 already forbids.

**Why this can happen.** The §R5.1 fix corrected `src/auth/auth.service.ts` and **missed this one** —
an administrator creating a user through `POST /settings/users` follows the same
write-token-then-mail shape in a different file. A sweep of every `sendMail` call site against its
enclosing block finds exactly one remaining, here.

**What it costs.** The same race and rollback window as §R5.1, on the admin-driven user creation path
rather than self-registration. Narrower exposure, identical mechanism.

**What we should do.** Return the token from the transaction callback and enqueue after it commits,
exactly as `auth.service.ts` now does. Minutes. This is a gap in the earlier fix, not a new class of
defect.

## §P3 `EncryptionUtils` is unused, and would be a poor choice if it were used — 🟠 latent risk — CONFIRMED

**Where:** `libs/utils/src/encryption/encryption.utils.ts`

**What this is.** A four-method AES wrapper over `crypto-js`, keyed on `APP_SECRET`, exported from
`@utils` alongside `HashUtils` and `JWTUtils`.

**Why this can happen.** It has **zero call sites** in `src/` or `libs/` — it ships as part of the
template rather than in response to a need. Two properties make it a trap for the first person who
reaches for it: `CryptoJS.AES.encrypt(text, passphraseString)` derives its key with OpenSSL's
`EVP_BytesToKey` (MD5, one iteration, no configurable work factor), and the default mode is CBC with
no authentication tag, so ciphertext is malleable and tampering is undetectable. `crypto-js` itself
was archived by its maintainer in favour of the platform `crypto` API.

**What it costs.** Nothing today. The cost is that it looks like the house-approved way to encrypt
something and sits behind the same `@utils` import as the correctly-built `HashUtils`.

**What we should do.** Either delete it — it is dead — or replace the internals with `node:crypto`
AES-256-GCM and a proper KDF. Deleting is the honest default for a template. Half an hour either way.

## §P4 Services reach past the repository into the database — 🟠 inconsistency — CONFIRMED

**Where:** `src/settings/permissions/permissions.service.ts` (`update`, `remove`),
`src/settings/roles/roles.service.ts` (the `prisma.role.findFirst` existence checks)

**What this is.** `.claude/rules/nestjs.md` and `repository.md` both state the layering: services
call repositories, repositories own the queries.

**Why this can happen.** Several methods build `prisma.<model>.findFirst(...)` inline instead. It
reads naturally because `prisma` is an exported singleton rather than an injected provider, so there
is no friction to reaching for it.

**What it costs.** No wrong behaviour today. The cost is that the soft-delete filter, the column
selection, and the "what does a miss return" convention are decided in two places.

**What we should do.** Add the missing lookups to their repositories and call those. Under an hour.
Worth doing when §P1 is fixed, since it touches the same permissions service.

## §P5 A DTO imports the schema by relative path, bypassing the alias — 🟡 hygiene — ❌ REFUTED 2026-08-23

> **Refuted.** This was filed against both repos on the strength of the sibling's code, without
> checking this one. `src/settings/users/dto/create-user.dto.ts` here imports
> `UserStatus` from `@prisma/client` — a package import, not a relative climb — and there is no
> `../../../../libs/...` path anywhere in the DTO folder. The finding is real in
> `clean-nest-drizzle-pg` and was fixed there; it never applied here.
>
> Recorded rather than deleted, per `.claude/rules/audit-findings.md`: a finding that turns out to be
> wrong is marked refuted so the next reader knows it was checked, not missed. The lesson is the
> obvious one — a defect confirmed in one sibling is a *hypothesis* about the other, never a finding.

**Where:** `src/settings/users/dto/create-user.dto.ts` (the enum import)

**What was claimed.** That the DTO reached across into `libs/` by relative path, against
`imports-and-naming.md` and `shared-code.md`.

## §P10 Suspending an account produces a misleading error, and the check is implicit — 🟠 latent risk — CONFIRMED

> **This finding was rewritten after running it.** Read alone, the code looks like a security hole —
> `login` never checks `user.status`, and the catalogue carries an unused
> `message.auth.account_inactive`. Running it showed the login *is* refused. The finding below is what
> is actually true, and the original guess is recorded here because it is exactly the kind of
> conclusion that reading produces and execution corrects.

**Where:** `src/auth/auth.service.ts` (`login`), `libs/repositories/src/repositories/user.repository.ts:321-325`
(`userInformation`), `libs/common/src/i18n/lang/en/message.json:33`

**What this is.** `User.status` can be `ACTIVE`, `INACTIVE`, `SUSPENDED` or `BLOCKED`. Suspending an
account is expected to stop that user logging in and to tell them why.

**Why this can happen.** `login` verifies the password and the email-verification state, then calls
`UserRepository().userInformation(user.id)` to build the caller's roles and permissions. That query
filters `status: UserStatus.ACTIVE`, so for a suspended user it returns nothing and login fails on
the generic branch — `"User information could not be retrieved"`. The status is therefore enforced,
but as a side effect of a read filter rather than as a check, and the message describes an internal
failure rather than the real reason. `findByMail` already selects and returns `status`, and
`message.auth.account_inactive` ("Your account is not active") exists in both catalogues and is
referenced nowhere.

**Verified by running it.** With `status` set to `SUSPENDED`, then `BLOCKED`, login returned **422
"User information could not be retrieved"** both times — refused, but for the wrong stated reason.

**What it costs.** No unauthorised access. Two smaller costs: a suspended user is told something that
reads like a server fault, so they contact support instead of their administrator; and the
enforcement is one edit away from disappearing — relaxing the `status` filter in `userInformation`,
which is a read-shaping concern, would silently remove the login restriction with nothing else
catching it. The sibling `clean-nest-drizzle-pg` has the same filter **and** an explicit
`user.status !== "active"` check in `login`, which is why it returns the correct message.

**What we should do.** Add the explicit check in `login` after the password comparison, throwing
`message.auth.account_inactive` — matching the sibling. Keep the repository filter as defence in
depth. Minutes.

---

## Verified correct — checked, nothing found

- **The i18n catalogues are in exact parity.** `message.json` 60/60, `validation.json` 7/7,
  `email.json` 2/2 between `en` and `id`. A reverse check — every `t("...")` and
  `i18nValidationMessage("...")` in `src/` and `libs/` resolved against the catalogue — found **no
  missing key**, so no raw key string can reach a client. Ten catalogue entries are unused; one of
  them (`account_inactive`) is what led to §P10.
- **`CustomValidationPipe` is solid.** `whitelist` and `forbidNonWhitelisted` are both on, so unknown
  properties are stripped and rejected; `transform` with implicit conversion is enabled; the
  `key|{args}` encoding from `i18nValidationMessage` is decoded and translated with the field name
  injected as both `property` and `field`; nested errors are flattened with dotted paths.
- **Every DTO decorator carries an i18n message.** No class-validator constraint falls back to the
  library's own English string.
- **The privilege-granting route is gated correctly.** `PATCH /settings/users/:id/password` is
  `@RoleAuth("superuser")`, not a permission.
- **Permission create is conflict-safe.** `createMany({ skipDuplicates: true })` — unlike the sibling,
  which raises a raw constraint violation as a 500 (its §P7). Note the trade-off: this succeeds
  silently without creating anything, which is its own kind of misleading.
- **`HashUtils` is correct.** bcrypt with a cost of 10.

## §P11 Four different error envelopes ship, and `error` changes type between them — 🟠 inconsistency — CONFIRMED

> Found while writing `docs/API_DOCUMENTATION.md` (item 12b) — the guide could not describe "the
> error envelope" truthfully, because there are two.

**Where:** `libs/common/src/pipes/custom-validation/custom-validation.pipe.ts:26-41`,
`libs/common/src/response/response.ts:15-22` (`ErrorResponse`), and the `try/catch` in every
controller method

**What this is.** The house envelope is built by `ResponseHandler`: `{ code, success, message, data }`,
with `errors` under the key `error` for field-mapped failures. Controllers call
`ResponseHandler.handleError(res, error)` from a `catch` block, which is what applies it.

**Why this can happen.** A global `ValidationPipe` runs **before** the controller method is entered,
so an exception it throws never reaches that `try/catch` — Nest's default exception filter serialises
the payload verbatim instead. The pipe's `exceptionFactory` builds
`{ statusCode: 422, message, data: null, error }`, which is close to the house shape but not it: the
key is `statusCode`, not `code`, and there is **no `success` field at all**.

The pipe's own block comment asserts the opposite — "emits the project's 422 envelope, which
ResponseHandler already understands" — which is how this survived: the intent is stated, and the
mechanism that would carry it out is bypassed.

**What it costs.** A client that branches on `success` gets `undefined` for every DTO validation
failure — the single most common error an API returns — and one that reads `code` gets `undefined`
too. Both work correctly for every other status, including 422s thrown by a service.

**Verified by running it — and it is worse than two shapes.** Every error path was exercised against
one running server. There are **four**, and the guard case was missed when this finding was first
written:

```jsonc
// 1. guards (401, 403) — AuthGuard / PermissionGuard, global, throw before the controller
{ "message": "Insufficient permissions", "error": "Forbidden", "statusCode": 403 }

// 2. DTO validation (422) — CustomValidationPipe, global, also before the controller
{ "statusCode": 422, "message": "The email field must be a valid email address.",
  "data": null, "error": { "email": ["The email field must be a valid email address."] } }

// 3. service or repository (400, 404, 422) — reaches the controller catch, so ResponseHandler applies
{ "code": 422, "success": false, "message": "Invalid email or password",
  "data": null, "error": { "email": ["Invalid email or password"] } }

// 4. unmatched route (404) — pure framework
{ "message": "Not Found", "statusCode": 404 }
```

**`error` changes type between them.** It is the string `"Forbidden"` in shape 1 and a
`{ field: [messages] }` map in shapes 2 and 3. A client doing `body.error.email` does not merely get
`undefined` on a 403 — it reads a property off a string. Only shape 3 carries `code` and `success` at
all.

The common cause is the same in shapes 1, 2 and 4: **anything thrown outside the controller method's
`try/catch` never reaches `ResponseHandler`**, and guards and pipes both run before the method is
entered. `handleError` can only normalise what the controller catches.

**What we should do.** Patching the pipe alone is no longer enough — it would fix shape 2 and leave
shapes 1 and 4. **Register a global exception filter** that runs `ResponseHandler` over every
`HttpException`, whatever threw it, and drop the per-controller `try/catch` that currently does the
same job for a subset. That is the only change that makes the envelope a property of the application
rather than of the code path, and it removes the class of defect instead of this instance of it.
Roughly a day, including re-checking every status against the filter.

Whatever is chosen, correct the pipe's block comment — it asserts it "emits the project's 422
envelope, which ResponseHandler already understands", and the mechanism that would carry that out is
bypassed. That claim is how this survived review.

**Also worth deciding:** `GET /health/live` returns a bare `{ "status": "ok" }` with no envelope at
all, because it returns a literal rather than going through `ResponseHandler`. Defensible for a probe
that orchestrators parse, but it should be a decision rather than an accident.

## §P12 Three permission filters are accepted and then ignored — 🟠 latent risk — CONFIRMED — ✅ RESOLVED 2026-08-23

> Found while writing `docs/API_DOCUMENTATION.md` (item 12b), by listing each endpoint's allow-listed
> filter keys and checking that the repository implements a `where` branch for every one.

**Where:** `libs/repositories/src/repositories/permission.repository.ts:25-31` (the allow-list) against
`:86-104` (the implemented branches)

**What this is.** Each list repository exports `<entity>FilterableFields`, which does two jobs: it is
the allow-list `findAll` validates `filter[<key>]` against, and it is what the controller passes to
`@ApiDatatableQueries` so `/docs` advertises exactly what is enforced. A key in that array is a
promise that the endpoint filters by it.

**Why this can happen.** The permission array names five keys —
`["id", "name", "group", "createdAt", "updatedAt"]` — and the `where` builder implements two:

```ts
if (queryParam.filter["name"])  { /* contains, insensitive */ }
if (queryParam.filter["group"]) { /* contains, insensitive */ }
// id, createdAt, updatedAt: no branch
```

The allow-list check passes, because the key *is* listed. Nothing downstream notices there is no
branch for it.

**What it costs.** `GET /settings/permissions?filter[id]=<uuid>` returns **200 and the full,
unfiltered page**. A caller cannot distinguish that from a genuine match, and `/docs` actively
advertises the key as supported. This is worse than a rejected key: a 400 tells the caller to stop,
whereas a silently unfiltered page is data they did not ask for, presented as data they did. It is
the same defect Tier 7 found and fixed in the `clean-elysia-prisma` sibling.

The sibling repositories here are clean — `role` implements all three of its keys and `user` all six.

**What we should do.** Either implement the three branches — `id` as an equality, `createdAt` and
`updatedAt` through `parseDateRangeFilter` exactly as `role.repository.ts` already does — or remove
them from the array so the endpoint rejects them with the 400 it rejects any other unknown key with.
Implementing is the better default here: the two date keys are already implemented on the sibling
endpoints, so their absence is an oversight rather than a decision. Under an hour.

**Worth generalising.** The check that found this is cheap and mechanical: for each list repository,
diff the exported `FilterableFields` array against the keys the `where` builder actually reads. That
belongs in review whenever a filter key is added.

## §P13 `DateUtils.parse` reads a bare date in the host timezone, not the app's — 🟠 latent risk — CONFIRMED — ✅ RESOLVED 2026-08-23 (partially)

**Where:** `libs/utils/src/date/date.utils.ts` (`parse`), and its callers in
`libs/common/src/datatable/date-filter.ts` and `src/auth/auth.service.ts`

**What this is.** `DateUtils` centralises date handling on `APP_TIMEZONE` so the application behaves
the same wherever it runs. `parse(dateString)` is the entry point for turning a string into a
`dayjs` object.

**Why this can happen.** `parse` is `dayjs(dateString).tz(APP_TIMEZONE)`. For a string carrying an
offset that is correct — the instant is unambiguous and `.tz()` re-presents it. For an **offset-less**
string such as `"2024-03-05"` it is not: `dayjs("2024-03-05")` reads it in the **host** timezone, and
`.tz()` only re-presents that instant; it does not reinterpret the input as being in `APP_TIMEZONE`.

**What it costs.** Whenever the host timezone is ahead of `APP_TIMEZONE`, a bare date lands on the
**previous day**. Measured directly, for input `"2024-03-05"`:

| host `TZ` | `APP_TIMEZONE` | lower bound produced | correct |
| --- | --- | --- | --- |
| `UTC` | `America/Los_Angeles` | **2024-03-04** | 2024-03-05 |
| `Europe/Berlin` | `America/New_York` | **2024-03-04** | 2024-03-05 |
| `Asia/Jakarta` | `UTC` | **2024-03-04** | 2024-03-05 |
| `UTC` | `Asia/Jakarta` | 2024-03-05 | 2024-03-05 |

The third row is the one that matters most: **`APP_TIMEZONE` defaults to `UTC`**, so any host not set
to UTC — every developer machine, and any server that has not had its clock zone set — reports the
wrong day. A report filtered to a month silently starts a day early and ends a day early.

**What we should do — partly done.** `DateUtils.parseInZone(dateString)` was added, using
`dayjs.tz(dateString, APP_TIMEZONE)`, which parses the string *as* wall-clock time in that zone, and
`parseDateRangeFilter` now uses it. Verified across five host/app pairs including a 26-hour spread
(`Pacific/Kiritimati` host, `Pacific/Niue` app): the window now lands on the requested calendar day in
every combination.

`parse` itself was **left alone deliberately** — its three other callers all pass
`.toISOString()`, where it is correct, and changing it would alter their behaviour. It now carries a
comment saying what it is and is not for. **The remaining risk is that the trap is still reachable:**
the next person to call `parse` with a user-supplied date reintroduces this. Making `parse` reject
offset-less input outright would close it for good and is worth considering.

> This defect was carried by the `parseDateRangeFilter` helper written earlier in this session, and
> its comment claimed the opposite — that dates resolved in `APP_TIMEZONE`. The claim was propagated
> into `docs/API_DOCUMENTATION.md` before being tested. Both are now corrected, and the claim is true.

## §P14 Stack traces and debug logs are suppressed in the one environment that needs them — 🟠 inconsistency — CONFIRMED — ✅ RESOLVED 2026-08-23

**Where:** `libs/utils/src/logger/logger.utils.ts:6`, `ecosystem.config.js`,
`libs/config/src/env/index.ts` (the `NODE_ENV` choices)

**What this is.** `LoggerUtils` gates two things on being in development: `error()` appends the stack
trace only when `isDevelopment`, and `debug()` emits nothing otherwise.

**Why this can happen.** The gate is `getEnv().NODE_ENV === "development"`. The envalid `choices` list
accepts five values — `development`, `dev`, `staging`, `production`, `test` — and
`ecosystem.config.js` sets the development app's `NODE_ENV` to **`dev`**, not `development`. The two
strings never match, so on the deployed dev environment `isDevelopment` is permanently `false`.

**What it costs.** The dev deployment logs errors without stack traces and drops every `debug()` call
— exactly the environment where both are most wanted, and the failure is silent. Only a local run
that happens to set `NODE_ENV=development` gets them.

**What we should do.** Test the set, not the string:
`["development", "dev"].includes(getEnv().NODE_ENV)`. One line. Better still, drive it from an
explicit `LOG_LEVEL` variable so the intent is configured rather than inferred from a deployment
label — that is what the Elysia siblings do.

**One related risk in the same file:** every method serialises its `context` with
`JSON.stringify`, and `error()` does the same for a non-`Error` thrown value. `JSON.stringify` throws
on a circular structure, and database driver errors frequently carry one — so a logging call inside
the 500 handler can itself throw, turning a handled error into an unhandled one with nothing logged.
Wrap the serialisation in a `try/catch` or use a safe stringifier.

> **§P15 is not present in this repo.** The sibling `clean-nest-drizzle-pg` declares a
> database-level `.unique()` on `users.email` while soft-deleting users, so re-creating a deleted
> user's address there returns a 500 — the service check filters `deleted_at` and the constraint does
> not. This repo deliberately has `@@index([email])` with **no** `@unique`, exactly so a soft-deleted
> address stays reusable, and uniqueness among live users is a service check only. Do not "restore"
> the constraint to match the sibling; the sibling is the one that is wrong.

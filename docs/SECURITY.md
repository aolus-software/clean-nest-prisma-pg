# Security

How authentication, authorization, and the transport-level protections actually work here.

## Authentication

JWT bearer tokens, verified by Passport (`libs/common/src/strategies/auth.strategy.ts`).

- `POST /auth/login` issues an access token (`JWT_EXPIRES_IN`, default `1d`) and a refresh token
  (`JWT_REFRESH_EXPIRES_IN`, default `7d`), signed with `JWT_SECRET` / `JWT_REFRESH_SECRET`.
- Both secrets are **required** — envalid stops the process at boot if either is missing, and there
  is no hardcoded fallback.
- On each request the strategy resolves the caller's identity — roles plus a flattened permission
  list — and caches it in Redis under `user:<id>` for `REDIS_TTL` seconds.
- The identity is rebuilt from a query that filters `deletedAt: null`, an active status, and a verified
  email, so a deleted, suspended, or unverified user cannot authenticate even with a valid token.

**The cache is invalidated wherever authorization changes** — the user update, delete, and status
paths drop the caller's entry, and the role update and delete paths drop the entry of *every* user
holding that role. Without that, a revoked role would stay in force until the entry expired.

## Authorization

Three guards are registered globally as `APP_GUARD` providers, in this order:

1. `AuthGuard` — proves *who*. Skipped only for routes carrying `@Public()`.
2. `PermissionGuard` — requires **every** permission named by `@PermissionAuth(...)`.
3. `RoleGuard` — requires **any one** role named by `@RoleAuth(...)`.

Consequences worth internalising:

- **Every route is authenticated by default.** A new controller is protected without doing anything;
  `@Public()` is the only opt-out.
- **Authentication is not authorization.** A route with a token and no `@PermissionAuth` /
  `@RoleAuth` is reachable by *any* logged-in user. Every protected route needs its own gate.
- **Both guards short-circuit for `superuser`.**
- Both read metadata from the handler **and** the controller class, so a class-level decorator gates
  every method on it.

## The permission vocabulary

`prisma/seed/permission.seed.ts` generates the entire catalogue as `` `${group}:${action}` `` over
groups `user`, `role`, `permission` and actions `list`, `create`, `view`, `update`, `delete`,
`restore` — **18 permissions**. Seeded roles are `superuser`, `admin`, and `user`.

A guard naming a string the seeder does not produce **fails closed**: nobody can hold it, so every
non-superuser gets a 403 on a route that looks correctly gated, and nothing is logged. Grep the seeder
before inventing a permission name.

Privilege-granting routes are gated on the **role**, not a permission — `PATCH
/settings/users/:id/password` requires `superuser`, because gating it on `user:update` would let
anyone holding an edit permission take over any account.

## Passwords

- Hashed with bcrypt at cost 10 (`HashUtils`). Never stored or logged in the clear.
- Strength is enforced at the DTO boundary with `@IsStrongPassword()` — by default at least eight
  characters with lowercase, uppercase, a digit, and a symbol.
- The password hash is selected only on the login path; every other read omits the column.

## Account enumeration

The auth endpoints are deliberately uniform:

- `login` compares the password **before** checking whether the email is verified or the account is
  active, and answers an unknown address and a wrong password with the same message. The failed path
  runs a dummy bcrypt comparison so response time does not leak what the message no longer does.
- `forgot-password` and `resend-verification-email` return 200 whether or not the address exists, and
  in every branch.

## Tokens

Email-verification and password-reset tokens are 255-character random strings stored with `expiresAt` and
`usedAt`, with a unique index on the token.

- Expiry is computed **per token** at the moment it is written, from a function — never a module-level
  constant, which would freeze every token's expiry at process start.
- Single use is enforced by stamping `usedAt`, not by deleting the row, so consumption is auditable.
  A spent token is refused with the same message an invalid one gets.

## Rate limiting

`ThrottlerGuard` is an `APP_GUARD`, so **every route is throttled** — `THROTTLER_LIMIT` requests per
`THROTTLER_TTL` seconds per client, default 60 per 60s. Exceeding it is a 429.

Override a single route with `@Throttle(...)` or `@SkipThrottle()`. Credential endpoints
(`/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`,
`/auth/resend-verification-email`) may be **tightened, never loosened** — they are unauthenticated and
enumerable.

## Transport

- **CORS** comes from `ALLOWED_ORIGINS` / `ALLOWED_METHODS` / `ALLOWED_HEADERS` / `MAX_AGE` /
  `CREDENTIALS`. The default `ALLOWED_ORIGINS=*` is a development convenience — set real origins
  before exposing the service, and note that `*` with `CREDENTIALS=true` is rejected by browsers.
- **Helmet** is applied through `@fastify/helmet` with an explicit Content-Security-Policy:
  `default-src 'self'`, `frame-src 'none'`, `object-src 'none'`, `frame-ancestors 'none'`. Note
  `style-src` and `script-src` allow `'unsafe-inline'`, which the Scalar docs UI needs — tighten it if
  you disable `/docs`.
- **Body size** is bounded by Fastify's default limit.

## OpenAPI exposure

`/docs` is mounted only when `API_DOCS_ENABLED=true`. It defaults to `false` and is independent of
`NODE_ENV`, so an environment that never sets it cannot publish the schema. Do not add a `NODE_ENV`
term beside it — an `APP_ENV !== "production"` check publishes the schema on every non-production
deployment, staging included.

## Known gaps

Read [audit-findings.md](./audit-findings.md) before relying on anything here. Open items at the time
of writing include a permission created through the API being unusable by a guard (§P1), and the
error-envelope inconsistency in §P11.

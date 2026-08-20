---
paths:
  - "src/**/*.controller.ts"
  - "libs/common/**/*.ts"
---

# Rate Limiting Rules

Rate limiting is **global and always on**. `ThrottlerModule`
(`libs/common/src/throttler/throttler.module.ts`, exported from `@common`) configures
`@nestjs/throttler` and registers `ThrottlerGuard` as an `APP_GUARD`, so **every route is throttled**
— there is no per-controller opt-in and none is needed.

## Configuration

- One throttler: `ttl: seconds(getEnv().THROTTLER_TTL)`, `limit: getEnv().THROTTLER_LIMIT`.
- Both come from envalid validation in `libs/config/src/env/index.ts`, defaulting to
  **60 requests / 60 seconds** per client. Tune via `THROTTLER_TTL` / `THROTTLER_LIMIT` in `.env` —
  **never hardcode a limit in code.**
- Registered once through `CommonModule`, which is imported by `AppModule`. Do not register
  `ThrottlerGuard` again in a feature module, and do not add it to a controller's `@UseGuards(...)`
  — that would double-count a request against the bucket.

## Runtime behaviour (429)

When a client exceeds the limit, `ThrottlerGuard` throws `ThrottlerException`, an `HttpException`
with status **429**. `ResponseHandler.handleError` echoes that status in the standard error envelope.
`@ApiStandardResponses` carries a `tooManyRequests` flag defaulting to `true`, so 429 is documented
on every endpoint by default. See `response-codes.md`.

## Per-route overrides

Use the `@nestjs/throttler` decorators only where a route genuinely differs from the global policy:

- `@SkipThrottle()` — exempt a route or controller entirely
  (`@SkipThrottle({ default: false })` re-enables it on a skipped controller).
- `@Throttle({ default: { limit, ttl } })` — override limit/ttl for one route or controller.

Keep any override's numbers as named constants and say in a comment why the route differs. Do not
scatter magic numbers.

**Tighten, don't loosen, on credential endpoints.** `POST /auth/login`,
`/auth/forgot-password`, `/auth/reset-password`, and `/auth/resend-verification-email` are
unauthenticated and enumerable; if you change their policy it should be a stricter `@Throttle`, never
a `@SkipThrottle`.

**Machine-to-machine endpoints are the case for `@SkipThrottle`.** A webhook or callback that
receives bursts from one upstream IP will blow past 60/60s and cause the sender to back off and
retry. Such a route gets `@SkipThrottle()` (when the upstream already rate-limits itself) or a
deliberately high `@Throttle(...)` — never the default.

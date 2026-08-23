# Configuration

Every variable is validated once by `envalid` in `libs/config/src/env/index.ts` and read through
`getEnv()` from `@config`. **Nothing reads `process.env` directly**, and a variable that is not in
that schema is not available to the application.

A variable with no default is **required** — the process exits at boot if it is missing. Note that
envalid treats `VAR=` (empty) as *provided*, so an empty value does not fall back to the default; it
fails validation instead.

Adding one means editing three places in `libs/config/src/env/index.ts` — the `IEnvConfig` interface,
the `cleanEnv` schema, and the returned object — then `.env.example` and this file.

## Application

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `APP_NAME` | `clean nest` | Prefixed to every outgoing mail subject |
| `APP_VERSION` | `1.0.0` | Surfaced in the OpenAPI document |
| `APP_SECRET` | **required** | General-purpose app secret |
| `APP_PORT` | `8002` | The port `main.ts` listens on |
| `APP_URL` | `localhost:8002` | Advertised base URL |
| `APP_TIMEZONE` | `UTC` | Used by `DateUtils` |
| `NODE_ENV` | **required** | One of `development`, `dev`, `staging`, `production`, `test`. The PM2 apps set `dev` / `staging` / `production`, so adding an environment means editing both `ecosystem.config.js` and this list |
| `API_DOCS_ENABLED` | `false` | Mounts `/docs`. Deliberately independent of `NODE_ENV`, and fail-closed: an environment that never sets it cannot expose the schema |
| `FRONTEND_URL` | `http://localhost:3000` | Base for the links in verification and reset emails |

## Database

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `DATABASE_URL` | **required** | PostgreSQL connection string, consumed by the `prisma` singleton exported from `libs/repositories/src/index.ts` |

## Authentication

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `JWT_SECRET` | **required** | Signs and verifies the access token. No fallback — the app will not start without it |
| `JWT_REFRESH_SECRET` | **required** | Signs the refresh token |
| `JWT_EXPIRES_IN` | `1d` | Access-token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh-token lifetime |

## Rate limiting

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `THROTTLER_TTL` | `60` | Window, in seconds |
| `THROTTLER_LIMIT` | `60` | Requests allowed per window, per client |

Applies to **every** route — `ThrottlerGuard` is registered as an `APP_GUARD`. See
[SECURITY.md](./SECURITY.md).

## CORS

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `ALLOWED_ORIGINS` | `*` | Comma-separated. Containing `*` sets origin to the wildcard outright |
| `ALLOWED_METHODS` | `GET,POST,PUT,PATCH,DELETE,OPTIONS` | Comma-separated |
| `ALLOWED_HEADERS` | `Content-Type,Authorization` | Comma-separated |
| `MAX_AGE` | `3600` | Preflight cache, in seconds |
| `CREDENTIALS` | `false` | Sets `Access-Control-Allow-Credentials` |

`CREDENTIALS=true` together with the default `ALLOWED_ORIGINS=*` is not a usable combination —
browsers reject credentialed requests against a wildcard origin. Set real origins before enabling it.

## Redis

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `REDIS_HOST` | `localhost` | Used by both the cache and the BullMQ queue |
| `REDIS_PORT` | `6379` | |
| `REDIS_PASSWORD` | `""` | Omitted from the connection URL when empty |
| `REDIS_TTL` | `3600` | Cache lifetime **in seconds**. `CacheService` converts to the milliseconds `cache-manager` expects |

## Mail

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `MAIL_HOST` | **required** | |
| `MAIL_PORT` | **required** | |
| `MAIL_SECURE` | `false` | |
| `MAIL_USERNAME` | **required** | |
| `MAIL_PASSWORD` | **required** | |
| `MAIL_FROM` | `""` | Default sender and reply-to |
| `MAIL_DEFAULT_SUBJECT` | `Clean Nest` | |

Outside production the subject is additionally prefixed with `[<NODE_ENV>]`, so a staging mail reads
`[STAGING] <APP_NAME> - <subject>`.

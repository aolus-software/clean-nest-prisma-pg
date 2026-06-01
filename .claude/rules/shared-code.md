---
paths:
  - "libs/**/*.ts"
---

# Shared Code Rules

Anything reusable across feature modules lives in `libs/`, never in `src/`. When changing shared code, consider every module that depends on it. Every new export must be added to the lib's `src/index.ts` or the path-alias import will not resolve.

## What belongs in `@common` (`libs/common/src`)

NestJS-aware shared building blocks:

| Category | Examples | Location |
|---|---|---|
| Guards | `AuthGuard`, `RoleGuard`, `PermissionGuard` | `guards/<name>/` |
| Passport strategies | `auth.strategy` | `strategies/` |
| Param/method decorators | `CurrentUser`, `RoleAuth`, `PermissionAuth`, `ApiStandardResponses`, `ApiSuccessResponse`, `DefaultApiNotFoundResponse`, `ApiDatatableQueries` | `decorators/<name>/` |
| Pipes | `CustomValidationPipe`, `FilterValidationPipe` | `pipes/<name>/` |
| Interceptors | file-upload | `interceptors/<name>/` |
| Response helpers | `ResponseHandler`, `successResponse` | `response/` |
| Cache / mail / throttler | `CacheService`, `MailService` + `MailModule`, throttler module | `cache/`, `mail/`, `throttler/` |
| Shared types | `DatatableType`, `PaginationResponse`, `SortDirection` | `types/` |

## What belongs in `@repositories` (`libs/repositories/src`)

The Prisma data layer: the `prisma` client singleton (built with the `@prisma/adapter-pg` adapter), `PrismaService` (lifecycle provider), and repository factory functions in `repositories/`. The Prisma schema and migrations live at the project root under `prisma/`, not in this lib.

## What belongs in `@utils` (`libs/utils/src`)

Pure, stateless helpers with **no NestJS dependency**: `HashUtils` (bcryptjs), `JWTUtils`, `DateUtils` (dayjs), `EncryptionUtils` (crypto-js), `StrUtils`, `NumberUtils`, `LoggerUtils`, and constants (`defaultSort`, `paginationLength`, token lifetimes, upload limits).

## What belongs in `@config` (`libs/config/src`)

`getEnv()` (envalid validation, cached) and the app configs applied in `main.ts`: `CorsConfig`, `HelmetConfig`, `swaggerConfig`. Add new env vars to the `IEnvConfig` interface **and** the `cleanEnv` schema in `libs/config/src/env/index.ts`.

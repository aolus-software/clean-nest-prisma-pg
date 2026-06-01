---
paths:
  - "src/**/*.ts"
  - "libs/**/*.ts"
---

# NestJS Rules

## Layering

`Controller → Service → Repository`. Controllers handle HTTP only and delegate to one service method. Services hold business logic and own transactions. Repositories hold Prisma queries and never open transactions. Never skip a layer (no DB access from controllers).

## Services

- Inject dependencies via the constructor — never `new`. The database is not injected; import the `prisma` singleton / repository factories from `@repositories`.
- One responsibility per service. If it grows beyond one concern, split it.
- Avoid circular service imports within a module; extract shared logic to a util or sub-service.

## Reuse before you build

Before creating any guard, pipe, decorator, interceptor, strategy, helper, or constant, check `@common` and `@utils` in `libs/` — it very likely already exists (`AuthGuard`, `PermissionGuard`, `RoleGuard`, `CurrentUser`, `FilterValidationPipe`, `CustomValidationPipe`, `ResponseHandler`, `HashUtils`, `JWTUtils`, `DateUtils`, `StrUtils`, `LoggerUtils`, `paginationLength`, `defaultSort`, ...). Do not duplicate.

## Config and logging

- Read env only through `getEnv()` from `@config` — never `process.env` directly.
- No `console.*` in code (ESLint `no-console`). Use `LoggerUtils` from `@utils`.

## Modules

One CRUD per module — see `module.md`. The DB needs no module import; only import modules whose providers you inject.

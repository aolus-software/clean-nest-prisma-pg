---
paths:
  - "src/**/*.controller.ts"
---

# Route Structure Rules

## Convention: flat, resource-named, no prefix

There is **no global prefix and no URL versioning** — `main.ts` calls neither `setGlobalPrefix` nor
`enableVersioning`. A controller's path is its resource name, plural, kebab-case: `@Controller("users")`,
`@Controller("roles")`, `@Controller("permissions")`. Nesting in the filesystem (`src/settings/users/`)
groups the module and drives the Swagger tag; it does **not** add a URL segment.

Access is enforced by **decorators on the controller class and its methods**, never by the path. A
path prefix is not a security boundary here.

## Method conventions

| Operation | Verb + path | Status |
|---|---|---|
| create | `POST /<resource>` | 201 |
| list | `GET /<resource>` | 200 |
| detail | `GET /<resource>/:id` | 200 |
| update | `PATCH /<resource>/:id` | 200 |
| delete | `DELETE /<resource>/:id` | 200 |

**Use `PATCH`, never `PUT`.** A sub-resource action gets a trailing segment on the id —
`PATCH /users/:id/status`, `POST /users/:id/resend-verify-email` — and keeps the parent resource's
permission unless the action genuinely warrants its own.

## Guarding a controller

Apply the guards once at the class, then gate each method:

```ts
@Controller("users")
@UseGuards(AuthGuard, PermissionGuard, RoleGuard)
@ApiTags("Settings/Users")
@ApiBearerAuth("Bearer")
export class UsersController {
	@Post()
	@PermissionAuth("user:create")
	async create(...) {}
}
```

- Include only the guards a controller actually uses: `PermissionGuard` if any method carries
  `@PermissionAuth`, `RoleGuard` if any carries `@RoleAuth`. `AuthGuard` always comes first.
- **Every method behind `AuthGuard` needs its own `@PermissionAuth` or `@RoleAuth`**, or a comment
  saying why authentication alone is sufficient. A guard in `@UseGuards` with no metadata decorator
  on the method proves *who* the caller is; it does not restrict *what* they may do.
- A class-level `@RoleAuth` (as on `PermissionsController`) applies to every method — do not repeat
  it per method.
- Permission strings are `entity:action` with the entity **singular**: `user:create`, `user:list`,
  `user:view`, `user:update`, `user:delete`. See `module.md`.

## Current route map

```
# Root / infrastructure — no auth
GET    /                                    app health string — @ApiTags("App")
GET    /health                              @ApiTags("Health") — terminus composite check
GET    /health/live                         liveness probe

# Auth (/auth) — @ApiTags("Auth"), no class-level guard; each route is public unless marked
POST   /auth/login                          PUBLIC
POST   /auth/register                       PUBLIC
POST   /auth/resend-verification-email      PUBLIC
POST   /auth/verify-email                   PUBLIC
POST   /auth/forgot-password                PUBLIC
POST   /auth/validate-reset-password-token  PUBLIC
POST   /auth/reset-password                 PUBLIC
GET    /auth/profile                        @UseGuards(AuthGuard) — own identity

# Settings / Users (/users) — AuthGuard + PermissionGuard + RoleGuard
POST   /users                               user:create
POST   /users/:id/resend-verify-email       user:update
GET    /users                               user:list
GET    /users/:id                           user:view
PATCH  /users/:id                           user:update
PATCH  /users/:id/status                    user:update
PATCH  /users/:id/password                  @RoleAuth("superuser")
DELETE /users/:id                           user:delete

# Settings / Roles (/roles) — AuthGuard + PermissionGuard
POST   /roles                               role:create
GET    /roles                               role:list
GET    /roles/:id                           role:view
PATCH  /roles/:id                           role:update
DELETE /roles/:id                           role:delete

# Settings / Permissions (/permissions) — AuthGuard + RoleGuard, @RoleAuth("superuser") on the class
POST   /permissions                         superuser
GET    /permissions                         superuser
GET    /permissions/:id                     superuser
PATCH  /permissions/:id                     superuser
DELETE /permissions/:id                     superuser
```

**Keep this map current.** Adding, renaming, or re-gating a route updates this table in the same
change — that is `documentation.md`.

## Known gaps in the current map

None outstanding. The two gaps recorded in the 2026-08-20 sweep are fixed:
`POST /users/:id/resend-verify-email` now carries `@PermissionAuth("user:update")` like every sibling
route, and `AuthController` and `AppController` now carry `@ApiTags("Auth")` and `@ApiTags("App")`.
See `docs/audit-findings.md`.

## Swagger tagging

Tag values mirror the module path with `/` as the separator: `Settings/Users`, `Settings/Roles`,
`Settings/Permissions`, `Health`. `swaggerConfig` (`libs/config/src/app/swagger.config.ts`) declares
no `.addTag(...)` calls, so tags are created implicitly from `@ApiTags` and ordered by controller
registration — a controller with no `@ApiTags` is a documentation bug, not a styling choice. Add
`@ApiBearerAuth("Bearer")` to any controller behind `AuthGuard`; the scheme name must match the one
registered in `swaggerConfig`.

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

**The guards are global** — `AuthGuard`, `PermissionGuard` and `RoleGuard` are `APP_GUARD` providers
registered in that order, so a controller carries **no `@UseGuards`**. Every route is authenticated by
default; gate each method with the permission or role it needs:

```ts
@Controller("users")
@ApiTags("Settings/Users")
@ApiBearerAuth("Bearer")
export class UsersController {
	@Post()
	@PermissionAuth("user:create")
	async create(...) {}
}
```

- **Every authenticated method needs its own `@PermissionAuth` or `@RoleAuth`**, or a comment saying
  why authentication alone is sufficient. The guards allow what they have no metadata for, so an
  undecorated method proves *who* the caller is without restricting *what* they may do.
- **`@Public()` is the only way out of authentication.** Put it on the handler, or on the controller
  when every route is public. Nothing else opts out.
- A class-level `@PermissionAuth` / `@RoleAuth` applies to every method on that controller — the
  guards read `getAllAndOverride([getHandler(), getClass()])`. This used not to work: they read only
  `getHandler()`, so the class-level `@RoleAuth("superuser")` on `PermissionsController` was silently
  ignored and every permission route was reachable by any authenticated user.
- `@PermissionAuth` is **conjunctive** — two strings mean both are required. `@RoleAuth` is
  **disjunctive** — any one of the listed roles suffices. Both short-circuit for `superuser`.
- Permission strings are `entity:action` with the entity **singular**: `user:create`, `user:list`,
  `user:view`, `user:update`, `user:delete`. See `module.md`.

## Current route map

```
# Root / infrastructure — no auth
GET    /                                    app health string — @ApiTags("App")
GET    /health                              @ApiTags("Health") — terminus composite check
GET    /health/live                         liveness probe

# Auth (/auth) — @ApiTags("Auth"); the six public routes carry @Public(), /profile does not
POST   /auth/login                          PUBLIC
POST   /auth/register                       PUBLIC
POST   /auth/resend-verification-email      PUBLIC
POST   /auth/verify-email                   PUBLIC
POST   /auth/forgot-password                PUBLIC
POST   /auth/validate-reset-password-token  PUBLIC
POST   /auth/reset-password                 PUBLIC
GET    /auth/profile                        authenticated — own identity, no @Public()

# Settings / Users (/users) — guards are global; no @UseGuards on the class
POST   /users                               user:create
POST   /users/:id/resend-verify-email       user:update
GET    /users                               user:list
GET    /users/:id                           user:view
PATCH  /users/:id                           user:update
PATCH  /users/:id/status                    user:update
PATCH  /users/:id/password                  @RoleAuth("superuser")
DELETE /users/:id                           user:delete

# Settings / Roles (/roles) — guards are global; no @UseGuards on the class
POST   /roles                               role:create
GET    /roles                               role:list
GET    /roles/:id                           role:view
PATCH  /roles/:id                           role:update
DELETE /roles/:id                           role:delete

# Settings / Permissions (/permissions) — @RoleAuth("superuser") on the class, now actually enforced
POST   /permissions                         superuser
GET    /permissions                         superuser
GET    /permissions/:id                     superuser
PATCH  /permissions/:id                     superuser
DELETE /permissions/:id                     superuser
```

**Keep this map current.** Adding, renaming, or re-gating a route updates this table in the same
change — that is `documentation.md`.

## Known gaps in the current map

None outstanding. Every route carries a `@PermissionAuth(...)`, and every controller carries an
`@ApiTags(...)` — the two things easiest to forget when adding one. A missing `@PermissionAuth` is
reachable by any authenticated caller; a missing `@ApiTags` silently drops the controller out of its
Swagger group.

## Swagger tagging

Tag values mirror the module path with `/` as the separator: `Settings/Users`, `Settings/Roles`,
`Settings/Permissions`, `Health`. `swaggerConfig` (`libs/config/src/app/swagger.config.ts`) declares
no `.addTag(...)` calls, so tags are created implicitly from `@ApiTags` and ordered by controller
registration — a controller with no `@ApiTags` is a documentation bug, not a styling choice. Add
`@ApiBearerAuth("Bearer")` to any controller whose routes are not `@Public()`; the scheme name must match the one
registered in `swaggerConfig`.

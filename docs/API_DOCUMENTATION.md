# API Documentation

A consumer's guide. The live, generated reference is at `/docs` when `API_DOCS_ENABLED=true` —
this file covers the conventions that the generated spec does not make obvious.

## The response envelope

Every response built by `ResponseHandler` carries the same four keys:

```jsonc
// success
{ "code": 200, "success": true, "message": "User list retrieved successfully", "data": { } }

// error
{ "code": 404, "success": false, "message": "User with ID ... not found", "data": null }

// error with a field map — 400 and 422
{ "code": 422, "success": false, "message": "Email already exists", "data": null,
   "error": { "email": ["Email already exists"] } }
```

The status is in the **body** as `code` as well as on the HTTP response, and the field map key is
`error`, singular.

> **One exception, and it is worth coding against.** A request that fails **DTO validation** is
> rejected by a global pipe *before* the controller runs, so it never passes through
> `ResponseHandler`. Those responses carry `statusCode` instead of `code` and have **no `success`
> field**:
>
> ```jsonc
> { "statusCode": 422, "message": "property foo should not exist",
>    "data": null, "error": { "foo": ["..."] } }
> ```
>
> A client that branches on `success` should treat its absence as a failure. This divergence is
> recorded as §P11 in [audit-findings.md](./audit-findings.md) and is a known defect, not a design.

## Paginated responses

List endpoints nest the page inside `data`:

```jsonc
{ "code": 200, "success": true, "message": "...",
   "data": { "data": [ ... ], "meta": { "page": 1, "limit": 10, "totalCount": 42, "totalPages": 5 } } }
```

## Authentication

Send the access token as a bearer token:

```
Authorization: Bearer <accessToken>
```

`POST /auth/login` returns `accessToken` and `refreshToken`. Access tokens last `JWT_EXPIRES_IN`
(default one day). **Every route requires a token unless it is listed as public below** — the guards
are global, so a route is authenticated by default.

Two failure modes worth distinguishing: **401** means the token is missing, malformed, expired, or
the user behind it no longer resolves (deleted, or not active). **403** means the token is fine and
the caller lacks the permission or role that route requires.

## Language

Responses are translated. The language is resolved in this order, first match wins:

1. `?lang=` or `?locale=` query parameter
2. `x-lang` or `x-custom-lang` header
3. `Accept-Language` header

Supported: `en` (fallback) and `id`. `en-GB` resolves to `en`, `id-ID` to `id`.

## List query parameters

Every list endpoint accepts the same shape:

| Parameter | Default | Notes |
| --------- | ------- | ----- |
| `page` | `1` | 1-based |
| `limit` | `10` | Page size |
| `search` | — | Free-text across a per-endpoint set of columns |
| `sort` | `createdAt` | Must be one of the endpoint's sortable fields, or **400** |
| `sortDirection` | `desc` | `asc` or `desc`, or **400** |
| `filter[<key>]=<value>` | — | Key must be one of the endpoint's filterable fields, or **400** |

Sortable and filterable fields per endpoint:

| Endpoint | Sortable | Filterable |
| -------- | -------- | ---------- |
| `/settings/users` | `id`, `name`, `email`, `status`, `createdAt`, `updatedAt` | `name`, `email`, `status` (enum), `roles`, `createdAt`, `updatedAt` |
| `/settings/roles` | `id`, `name`, `createdAt`, `updatedAt` | `name`, `createdAt`, `updatedAt` |
| `/settings/permissions` | `id`, `name`, `group`, `createdAt`, `updatedAt` | `name`, `group` — see the note below |

> **`/settings/permissions` accepts three filter keys it does not implement.** `id`, `createdAt` and
> `updatedAt` are in that endpoint's allow-list, so they pass validation, but the repository has no
> matching `where` branch — the request returns a 200 and an **unfiltered** page that looks filtered.
> Only `name` and `group` actually narrow the result. Recorded as §P12 in
> [audit-findings.md](./audit-findings.md); until it is fixed, do not rely on those three.

Notes on filter semantics:

- **An unknown sort field, sort direction, or filter key is rejected with 400**, never ignored.
  Silently ignoring it would return a successful page over the wrong rows.
- **An out-of-range enum value is a 400** naming the allowed set — `filter[status]=BOGUS` does not
  reach the database.
- Name and email filters match by substring, case-insensitive.
- Date filters take `filter[createdAt]=YYYY-MM-DD` for a single day, or
  `filter[createdAt]=YYYY-MM-DD,YYYY-MM-DD` for an inclusive range. Both ends are inclusive to the
  **end** of the closing day, and the dates resolve in `APP_TIMEZONE`, not the server's timezone. An
  unparseable or reversed range is a 400.

## Routes

`PUBLIC` means no token is required. Everything else needs one, and the third column is the
permission or role the caller must additionally hold.

```
GET    /                                      PUBLIC
GET    /health                                PUBLIC    database + heap check
GET    /health/live                           PUBLIC    liveness probe

POST   /auth/login                            PUBLIC
POST   /auth/register                         PUBLIC
POST   /auth/resend-verification-email        PUBLIC
POST   /auth/verify-email                     PUBLIC
POST   /auth/forgot-password                  PUBLIC
POST   /auth/validate-reset-password-token    PUBLIC
POST   /auth/reset-password                   PUBLIC
GET    /auth/profile                          (own identity)

POST   /settings/users                        user:create
GET    /settings/users                        user:list
GET    /settings/users/:id                    user:view
PATCH  /settings/users/:id                    user:update
PATCH  /settings/users/:id/status             user:update
PATCH  /settings/users/:id/password           role: superuser
POST   /settings/users/:id/resend-verify-email  user:update
DELETE /settings/users/:id                    user:delete

POST   /settings/roles                        role:create
GET    /settings/roles                        role:list
GET    /settings/roles/:id                    role:view
PATCH  /settings/roles/:id                    role:update
DELETE /settings/roles/:id                    role:delete

POST   /settings/permissions                  role: superuser
GET    /settings/permissions                  role: superuser
GET    /settings/permissions/:id              role: superuser
PATCH  /settings/permissions/:id              role: superuser
DELETE /settings/permissions/:id              role: superuser
```

Permission strings are `entity:action` with a singular entity. The seeded catalogue is the cross
product of `user`, `role`, `permission` and `list`, `create`, `view`, `update`, `delete`, `restore` —
**18 permissions and no others**. See [SECURITY.md](./SECURITY.md).

## Behaviour worth knowing

- **The auth endpoints do not reveal whether an address is registered.** A wrong password, an unknown
  address, and an unverified account all return the same message; `forgot-password` and
  `resend-verification-email` return 200 whether or not the address exists.
- **Deleting a user is a soft delete.** The row survives with `deletedAt` stamped, and every read filters
  it out. The address becomes reusable.
- **Verification and reset tokens are single-use and expire.** A spent token is refused with the same
  message a bad one gets.

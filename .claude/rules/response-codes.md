---
paths:
  - "src/**/*.controller.ts"
---

# Response Codes Rules

## Overview

Success payloads are built with `ResponseHandler.success(...)` and sent through the Fastify reply
(see `controller.md`); errors go through `ResponseHandler.handleError(res, error)`. Swagger error
responses are declared with `@ApiStandardResponses(...)` and the success body with
`@ApiSuccessResponse(...)` / `@DefaultApiNotFoundResponse(...)`. All three live in
`libs/common/src/decorators/api-response/api-response.decorator.ts` and are re-exported from
`@common`.

## `@ApiStandardResponses` — the real option set

The decorator accepts **exactly these seven flags**, all defaulting to `true`:

| Flag | Status | Swagger response |
|---|---|---|
| `badRequest` | 400 | Bad Request |
| `unauthorized` | 401 | Unauthorized |
| `forbidden` | 403 | Forbidden |
| `validation` | 422 | Validation error (field payload) |
| `tooManyRequests` | 429 | Too Many Requests |
| `internalServerError` | 500 | Internal Server Error |
| `serviceUnavailable` | 503 | Service Unavailable |

There is **no `conflict` (409) flag** — do not pass one, it is silently ignored. 404 is **not** part of this decorator; document it separately with
`@DefaultApiNotFoundResponse("Entity")`. Pass a flag as `false` only when the endpoint genuinely
cannot produce that status.

## How runtime status is actually produced

`ResponseHandler.handleError` (`libs/common/src/response/response.ts`):

- `UnprocessableEntityException` → **422**, spreading its payload onto the standard envelope
  verbatim (`{ ...ErrorResponse, ...error.getResponse() }`). This is the field-validation contract.
- any other `HttpException` → echoes `error.getStatus()`, taking the message from `message`, then
  `error`, then `message.common.error`.
- anything else → logged via `LoggerUtils.error` and returned as a generic **500**.

Because the 422 branch spreads the payload verbatim, **the key name in the thrown payload is the key
name the client receives.** A misnamed key ships a map nothing reads.

### The 422 field map is keyed `error`, never `errors`

`@ApiStandardResponses` documents the 422 body as:

```json
{ "code": 422, "success": false, "message": "…", "data": null,
  "error": { "field1": ["…"], "field2": ["…"] } }
```

Every producer of a 422 must match that key. A service throwing a uniqueness or business-rule
failure by hand uses `error` (see `service-crud.md`):

```ts
throw new UnprocessableEntityException({
	message: this.i18n.t("message.user.email_exists"),
	error: { email: [this.i18n.t("message.user.email_exists")] },
});
```

Both producers now agree: `CustomValidationPipe`'s `exceptionFactory` emits `error`, matching
Swagger and every hand-thrown 422. A DTO-level failure and a service-level failure return the
same shape from the same status code.

### 409 happens, but cannot be declared through the decorator

A `ConflictException` returns a real 409 through `handleError`, but no flag exists for it — add a raw
`@ApiResponse({ status: 409 })` if a specific endpoint must document it. 429 **is** covered, by the
`tooManyRequests` flag. Full throttling policy: `rate-limiting.md`.

### Uniqueness and business validation use 422, not 409

This codebase surfaces uniqueness and business-rule failures as `UnprocessableEntityException` (422)
with the `error: { field: [...] }` shape — **not** `ConflictException` (409). See `service-crud.md`.
So `validation: true` (the default) is the flag that matters on `create` / `update`; a literal 409 is
rare-to-absent here.

## Rules

- **`forbidden: false` is never valid** on an endpoint behind `PermissionGuard` / `RoleGuard` — it
  can throw 403.
- **`badRequest: false` is never valid on a `findAll`** — the repository validates the sort field,
  the sort direction, and every `filter[...]` key against an exported allow-list and throws
  `BadRequestException`. The allow-lists are `<entity>SortableFields` and `<entity>FilterableFields`,
  exported from the repository and passed to `@ApiDatatableQueries({ sortFields, filterFields })` on
  the controller so `/docs` shows exactly the values that are enforced. Keep the two in sync by
  passing the constants — never restate the list. See `repository.md`.
- **`badRequest: false` is acceptable on `findOne` / `remove`** that only throw `NotFoundException`;
  pair it with `@DefaultApiNotFoundResponse("Entity")`.
- **`validation: false`** on read-only endpoints that accept no body.
- **`unauthorized: false`** only on a route outside `AuthGuard` entirely.

## `@ApiSuccessResponse(status, description, example, exampleProperties?)`

The optional 4th argument is a schema describing the `data` shape — e.g.
`ApiSuccessResponse(201, "User created successfully", null, { type: "null" })` for a create that
returns no body. The status in `ApiSuccessResponse(code, ...)`, in `res.status(code)`, and in any
`@HttpCode(code)` must all match: **201 for creation, 200 otherwise**.

## Adding a new endpoint checklist

1. Which exceptions can the **service** throw? Map each to a status.
2. Behind `@PermissionAuth` / `@RoleAuth`? → keep `forbidden` (403).
3. A `findAll`? → keep `badRequest` (400).
4. Throws `NotFoundException`? → add `@DefaultApiNotFoundResponse("Entity")`.
5. Accepts a body? → keep `validation` (422), and throw the field map under `error`.
6. Need 409 / 429 in Swagger? → add a raw `@ApiResponse` (no flag exists for them).

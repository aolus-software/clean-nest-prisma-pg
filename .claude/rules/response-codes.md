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

The decorator accepts **exactly these six flags**, all defaulting to `true`:

| Flag | Status | Swagger response |
|---|---|---|
| `badRequest` | 400 | Bad Request |
| `unauthorized` | 401 | Unauthorized |
| `forbidden` | 403 | Forbidden |
| `validation` | 422 | Validation error (field payload) |
| `internalServerError` | 500 | Internal Server Error |
| `serviceUnavailable` | 503 | Service Unavailable |

There is **no `conflict` (409) flag and no `tooManyRequests` (429) flag** — do not pass them, they
are silently ignored. 404 is **not** part of this decorator; document it separately with
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

> **Known divergence — do not copy it.** `CustomValidationPipe`'s `exceptionFactory`
> (`libs/common/src/pipes/custom-validation/custom-validation.pipe.ts:38`) currently emits
> `errors: formattedErrors` (plural). Since `handleError` spreads verbatim, a DTO-level validation
> failure reaches the client under `errors` while Swagger and every hand-thrown 422 say `error`, so a
> consumer parsing the documented contract cannot render an `@IsEmail` / `@IsStrongPassword` message
> against the input that caused it — the message degrades to a form-level banner. The intended key is
> `error`. Per `contradiction-halt.md` this is reported, not silently changed: raise it before
> writing code that depends on either spelling.

### 409 and 429 happen, but cannot be declared through the decorator

`ThrottlerGuard` is registered as an `APP_GUARD` (`libs/common/src/throttler/throttler.module.ts`),
so **every** route can throw `ThrottlerException` (429), which `handleError` echoes as a 429. A
`ConflictException` likewise returns a real 409. Neither has a flag — add a raw
`@ApiResponse({ status })` if a specific endpoint must document it. Full throttling policy:
`rate-limiting.md`.

### Uniqueness and business validation use 422, not 409

This codebase surfaces uniqueness and business-rule failures as `UnprocessableEntityException` (422)
with the `error: { field: [...] }` shape — **not** `ConflictException` (409). See `service-crud.md`.
So `validation: true` (the default) is the flag that matters on `create` / `update`; a literal 409 is
rare-to-absent here.

## Rules

- **`forbidden: false` is never valid** on an endpoint behind `PermissionGuard` / `RoleGuard` — it
  can throw 403.
- **`badRequest: false` is never valid on `findAll`** — the repository validates sort field, sort
  direction, and filter keys and throws `BadRequestException` (see `repository.md`).
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

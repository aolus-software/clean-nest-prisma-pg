# Error Handling

Errors are **thrown**, never returned. `ResponseHandler.handleError(res, error)` — called from the
`catch` block of every controller method — turns them into the response envelope.

## Exception to status

All exceptions come from `@nestjs/common`. Never throw a raw `Error`.

| Thrown | Status | Body |
| ------ | ------ | ---- |
| `BadRequestException` | 400 | `{ code, success, message, data: null }` |
| `UnauthorizedException` | 401 | as above |
| `ForbiddenException` | 403 | as above |
| `NotFoundException` | 404 | as above |
| `UnprocessableEntityException` | 422 | plus `error: { field: [messages] }` |
| `ThrottlerException` | 429 | as above — thrown by the global throttler, not by your code |
| anything else | 500 | generic translated message; the real error is logged, never sent |

`handleError` special-cases `UnprocessableEntityException` so its `{ message, error }` payload
reaches the client; every other `HttpException` contributes its status and message.

## The four error shapes

A client receives one of four shapes, depending on **where** the failure happened. Only one of them
is the house envelope, and `error` is not the same type across them.

**Thrown by a service or guard** — goes through `handleError`, gets the house envelope:

```jsonc
{ "code": 422, "success": false, "message": "Email already exists",
   "data": null, "error": { "email": ["Email already exists"] } }
```

**Rejected by DTO validation** — the global `CustomValidationPipe` runs *before* the controller
method, so the `try/catch` never sees it and Nest's default filter serialises the payload directly:

```jsonc
{ "statusCode": 422, "message": "property foo should not exist",
   "data": null, "error": { "foo": ["..."] } }
```

Note `statusCode` rather than `code`, and **no `success` field**.

**Thrown by a guard** (401, 403) — guards also run before the controller:

```jsonc
{ "message": "Insufficient permissions", "error": "Forbidden", "statusCode": 403 }
```

Here `error` is a **string**, not a field map — reading `error.email` off this is a bug waiting to
happen.

**An unmatched route** (404) is pure framework:

```jsonc
{ "message": "Not Found", "statusCode": 404 }
```

The common cause: `handleError` lives in each controller's `catch`, so it can only normalise what the
controller catches. Guards, pipes, and the router all throw earlier. Recorded as §P11 in
[audit-findings.md](./audit-findings.md), where the fix is a global exception filter rather than a
patch to any one of these. Until then, branch on the HTTP status rather than the body shape.

## Which exception to use

| Situation | Exception |
| --------- | --------- |
| Row genuinely missing | `NotFoundException` with an i18n message |
| Uniqueness conflict, or any business rule failing after schema validation | `UnprocessableEntityException` with a field map — **422, never 409** |
| An unrecognised sort field, sort direction, or `filter[...]` key | `BadRequestException` — thrown by the repository |
| Caller lacks a permission or role | leave it to the guards; do not throw `ForbiddenException` yourself |

## Rules

- **Every message is an i18n key.** Services inject `I18nService` and call `this.i18n.t(...)`; guards,
  pipes, and repositories use `I18nContext.current()?.t(...) ?? "fallback"` because they sit outside
  request DI, and that fallback is mandatory — the context is `undefined` in a queue worker.
- **Never leak internal detail.** a Prisma client error, a constraint name, or a stack trace must not reach a
  client. Catch it, log it through `LoggerUtils`, and throw a domain exception.
- **Never `catch` and swallow.** Either translate and re-throw, or handle the failure meaningfully.
  The deliberate exception is the enumeration-safe auth paths, which return early rather than
  revealing whether an account exists.
- **The status in `code` must match the HTTP status.** `ResponseHandler.success(201, ...)` goes with
  `res.status(201)`; the two are written by hand and are easy to let drift apart.

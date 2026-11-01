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

## One error shape

Every error a client receives uses the house envelope, and `error`, when present, is always a field
map:

```jsonc
{ "code": 422, "success": false, "message": "Email already exists",
   "data": null, "error": { "email": ["Email already exists"] } }
```

Controllers call `handleError` in their own `catch`. Anything thrown before the controller method
runs — a guard (401, 403, 429), the global `CustomValidationPipe` (422 with the field map),
`UuidParamPipe` on an `:id` param (422 on `error.id`), or the router (404 for an unmatched non-GET
route) — is caught by the global `AllExceptionsFilter`
(`libs/common/src/filters/all-exceptions.filter.ts`, registered in `main.ts`), which runs the same
`handleError`.

One exception remains: an **unmatched GET** is answered by `ServeStaticModule`'s catch-all route,
which sits outside Nest's pipeline and returns `{ "message": "Not Found", "statusCode": 404 }`.
Mounting the static files under a `serveRoot` would close this, at the cost of changing their URLs.

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

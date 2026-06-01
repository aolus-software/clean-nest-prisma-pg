---
paths:
  - "src/**/*.controller.ts"
---

# Controller Rules

## Responsibility

Controllers handle HTTP only: validate input via DTOs, call exactly one service method, return the response. No conditionals, data transformation, or DB access in a controller method.

## ApiTags

Every controller class has `@ApiTags("...")`. This project uses flat, slash-grouped tag names that mirror the route, e.g. `@ApiTags("Settings/Users")` for `@Controller("users")` under the settings domain.

## Response shape

Return the success payload through `ResponseHandler.success(...)` and route every error through `ResponseHandler.handleError(res, error)`. Inject the Fastify reply with `@Res() res: FastifyReply` (needed by `handleError`).

```ts
@Post()
@PermissionAuth("user:create")
@ApiStandardResponses()
async create(@Body() createUserDto: CreateUserDto, @Res() res: FastifyReply) {
	try {
		await this.usersService.create(createUserDto);
		return ResponseHandler.success<void>(201, "User created successfully", undefined);
	} catch (error) {
		return ResponseHandler.handleError(res, error);
	}
}
```

- Pass an explicit type param to `ResponseHandler.success<T>` (`<void>` when there is no body data, with `undefined` as the data argument).
- Never let an exception propagate uncaught from a controller method — always wrap in try/catch and delegate to `handleError`.
- Do not build raw response objects or call `res.send(...)` yourself for the success path.

## Swagger decorators

Document every endpoint:

- `@ApiStandardResponses()` — standard 4xx/5xx envelope. Pass `{ validation: false }` on read-only endpoints that cannot return a 422.
- `@ApiSuccessResponse(status, "message", example)` — typed success body (the example must match the real shape; for list endpoints include `data` and `meta`).
- `@DefaultApiNotFoundResponse()` — on detail/update/delete endpoints that can 404.
- `@ApiDatatableQueries()` — on list endpoints, documents page/limit/search/sort/filter.
- `@ApiBearerAuth("Bearer")` — at the class level for authenticated controllers.

These import from `@common` (except `@ApiTags`, `@ApiBearerAuth`, `@ApiOkResponse`, `@ApiCreatedResponse` from `@nestjs/swagger`).

## Guards and authorization

Apply guards once at the class level when all endpoints share auth, then gate individual methods with permission/role decorators:

```ts
@Controller("users")
@UseGuards(AuthGuard, PermissionGuard, RoleGuard)
@ApiTags("Settings/Users")
@ApiBearerAuth("Bearer")
export class UsersController { ... }
```

- `@PermissionAuth("user:create")` — permission gate (`entity:action`, entity singular).
- `@RoleAuth("superuser")` — role gate.
- `@CurrentUser()` — inject the authenticated `UserInformation`.

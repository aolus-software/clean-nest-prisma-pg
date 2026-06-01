---
paths:
  - "src/**/*.controller.ts"
---

# Controller CRUD Rules

A full CRUD controller implements five endpoints. Each wraps its body in try/catch and returns via `ResponseHandler`.

| Method | Route | Action | Permission |
|---|---|---|---|
| `GET` | `/` | List (datatable) | `entity:list` |
| `GET` | `/:id` | Get by ID | `entity:view` |
| `POST` | `/` | Create | `entity:create` |
| `PATCH` | `/:id` | Update | `entity:update` |
| `DELETE` | `/:id` | Delete | `entity:delete` |

Use `PATCH` (not `PUT`) for updates. Permission strings are `entity:action` with the entity **singular** (`user:list`, `user:view`, `user:create`, `user:update`, `user:delete`).

## List endpoint

Accept the datatable query params and assemble a `DatatableType`. `@Res() res` comes **last** because the `@Query` params are positional.

```ts
@Get()
@PermissionAuth("user:list")
@ApiStandardResponses({ validation: false })
@ApiDatatableQueries()
@ApiSuccessResponse(200, "Users retrieved successfully", {
	data: [{ id: "user-id", name: "John Doe", email: "john@example.com", status: "ACTIVE" }],
	meta: { page: 1, limit: 10, totalCount: 100, totalPages: 10 },
})
async findAll(
	@Query("page") page: number,
	@Query("limit") limit: number,
	@Query("search") search: string,
	@Query("sort") sort: string,
	@Query("sortDirection") sortDirection: string,
	@Query(new FilterValidationPipe()) filter: Record<string, string | boolean | Date> | null,
	@Res() res: FastifyReply,
) {
	try {
		const query: DatatableType = {
			page: page || 1,
			limit: limit || paginationLength,
			search: search || null,
			sort: sort || defaultSort,
			sortDirection: (sortDirection === "asc" ? "asc" : "desc") as SortDirection,
			filter: filter || null,
		};
		const users = await this.usersService.findAll(query);
		return ResponseHandler.success(200, "Users retrieved successfully", users);
	} catch (error) {
		return ResponseHandler.handleError(res, error);
	}
}
```

Import `defaultSort` and `paginationLength` from `@utils`; `DatatableType`, `SortDirection`, `FilterValidationPipe` from `@common`.

## Get by ID

```ts
@Get(":id")
@PermissionAuth("user:view")
@ApiStandardResponses({ validation: false })
@DefaultApiNotFoundResponse()
async findOne(@Param("id") id: string, @Res() res: FastifyReply) {
	try {
		const user = await this.usersService.findOne(id);
		return ResponseHandler.success(200, "User found successfully", user);
	} catch (error) {
		return ResponseHandler.handleError(res, error);
	}
}
```

## Create / Update / Delete

`create` returns `ResponseHandler.success<void>(201, ...)`; `update` and `remove` return status `200`. The service does the existence and uniqueness checks — the controller just calls it and returns the message.

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

Add `@DefaultApiNotFoundResponse()` on the `:id` view, update, and delete endpoints.

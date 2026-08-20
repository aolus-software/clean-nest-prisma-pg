---
paths:
  - "libs/repositories/src/repositories/**/*.ts"
---

# Repository Rules

## Pattern

Repositories are plain **factory functions** — not injectable NestJS classes. Each file exports one factory that accepts an optional `tx?: Prisma.TransactionClient`, resolves `const db = tx || prisma;` against the module-level `prisma` singleton from `@repositories`, and returns an object of query/mutation methods.

```ts
import { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "@repositories";

export function UserRepository(tx?: Prisma.TransactionClient) {
	const db = tx || prisma;

	return {
		user: db.user,

		async findByMail(email: string): Promise<UserForAuth | null> {
			return db.user.findFirst({ where: { email, deletedAt: null }, select: { ... } });
		},
	};
}
```

- Call as `UserRepository().findByMail(email)` — never `new`, never inject.
- To run inside a service-owned transaction, pass the Prisma transaction client to the **factory**: `UserRepository(tx).findOne(id)`. The factory binds `db` once, so the whole returned object shares that client.
- Expose the raw Prisma delegate (`user: db.user`) so callers can run ad-hoc queries without a dedicated method.

## Transactions

Repositories must **never** open their own transaction (`prisma.$transaction(...)`). Transaction management belongs to the service layer (see `service.md`). The repository only *accepts* a `tx` through its factory and uses it via `const db = tx || prisma;`.

## Types

- Define every exported type/interface (`UserList`, `UserDetail`, `UserInformation`, ...) in the same file, above the factory function. Mutation inputs are explicit named types, not the DTO.
- No `any` — ever. Use Prisma's generated types: `Prisma.UserWhereInput`, `Prisma.TransactionClient`, the model enums (`UserStatus`), etc.
- Build `where` clauses as typed `Prisma.<Model>WhereInput` and compose with `AND` / `OR`.

## Sort and filter allow-listing

Never order or filter by a raw user-supplied string. Validate against an allow-list and reject anything outside it with `BadRequestException`:

```ts
const allowedSort = ["id", "name", "email", "status", "createdAt", "updatedAt"];
if (!allowedSort.includes(sort)) {
	throw new BadRequestException("Invalid sort field");
}
if (!["asc", "desc"].includes(sortDirection)) {
	throw new BadRequestException("Invalid sort direction");
}
// orderBy: { [sort]: sortDirection }
```

Apply the same allow-list check to every key in `queryParam.filter` before building the `where` clause.

## findAll / pagination

`findAll(queryParam: DatatableType)` returns `Promise<PaginationResponse<XList>>`. Run the count and the page query in parallel, then return `{ data, meta }`:

```ts
const [totalCount, users] = await Promise.all([
	db.user.count({ where }),
	db.user.findMany({
		where,
		orderBy: { [sort]: sortDirection },
		skip: (page - 1) * limit,
		take: limit,
		select: { ... },
	}),
]);

return {
	data: users.map(mapRow),
	meta: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) },
};
```

- Always apply the soft-delete filter `deletedAt: null` to read queries on soft-deletable models.
- For case-insensitive search use `{ contains: search, mode: "insensitive" }`.

## Shaping results

Use Prisma `select` (and nested `select` on relations) to fetch exactly the columns you need, then map the nested relation rows into the flat exported type (`UserList` / `UserDetail`). Do not leak the nested relation shape out of the repository.

## Soft delete

"Delete" sets `deletedAt` to now — it does not issue a hard delete:

```ts
await db.user.update({ where: { id }, data: { deletedAt: DateUtils.now().toDate() } });
```

## Comments

One block comment per method, above the function. No line-by-line comments.

## Sort and filter allow-lists are exported, not inline

Every `findAll` validates the caller's `?sort=`, `?sortDirection=`, and `filter[<key>]` values against
an allow-list and throws `BadRequestException` with a translated message when one does not match. An
unrecognised value is **rejected, never silently ignored** — coercing it would return a successful
page over the wrong rows, which the caller cannot distinguish from a real match.

The allow-lists live at module scope and are **exported**, so the controller documents exactly what
the repository enforces:

```ts
export const userSortableFields = Object.keys(userOrderableColumns);
export const userFilterableFields = ["status", "name", "email", "role_id"];
```

```ts
@ApiDatatableQueries({
	sortFields: userSortableFields,
	filterFields: userFilterableFields,
})
```

Pass the constants — never restate the list in the controller, or `/docs` will drift from the
validation and advertise a value that returns 400.

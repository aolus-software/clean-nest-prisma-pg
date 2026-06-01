---
paths:
  - "src/**/*.service.ts"
---

# Service CRUD Rules

A full CRUD service implements these methods. List/detail delegate to the repository; create/update/remove own the validation, transformation, and transaction.

```ts
async findAll(query: DatatableType): Promise<PaginationResponse<XList>>
async findOne(id: string): Promise<XDetail>
async create(dto: CreateXDto): Promise<void>
async update(id: string, dto: UpdateXDto): Promise<void>
async remove(id: string): Promise<void>
```

## findAll

Delegates entirely to the repository — no extra logic.

```ts
async findAll(query: DatatableType): Promise<PaginationResponse<UserList>> {
	return await UserRepository().findAll(query);
}
```

## findOne

Fetch by ID; throw `NotFoundException` if missing. The message format is `"<Entity> with ID ${id} not found"`.

```ts
async findOne(id: string): Promise<UserDetail> {
	const data = await UserRepository().findOne(id);
	if (!data) {
		throw new NotFoundException(`User with ID ${id} not found`);
	}
	return data;
}
```

## create

Validate uniqueness first, hash/transform inputs, then write inside a transaction.

```ts
async create(dto: CreateUserDto): Promise<void> {
	const isEmailExist = await UserRepository().findByMail(dto.email);
	if (isEmailExist) {
		throw new UnprocessableEntityException({
			message: "Email already exists",
			error: { email: ["Email already exists"] },
		});
	}

	const password = await HashUtils.generateHash(dto.password);
	await prisma.$transaction(async (tx) => {
		const user = await tx.user.create({ data: { ...dto, password } });
		// related writes use the same tx
	});
}
```

- Uniqueness/business-validation errors use `UnprocessableEntityException` with the `error: { field: [...] }` shape.
- Hash passwords (`HashUtils.generateHash`) and compute derived fields in the service before writing.

## update

Verify existence, re-check uniqueness only when the owning entity differs, then write in a transaction.

```ts
async update(id: string, dto: UpdateUserDto): Promise<void> {
	const data = await UserRepository().findOne(id);
	if (!data) {
		throw new NotFoundException(`User with ID ${id} not found`);
	}

	const emailOwner = await UserRepository().findByMail(dto.email);
	if (emailOwner && emailOwner.id !== id) {
		throw new UnprocessableEntityException({
			message: "Email already exists",
			error: { email: ["Email already exists"] },
		});
	}

	await prisma.$transaction(async (tx) => {
		await tx.user.update({ where: { id }, data: { ... } });
	});
}
```

## remove

Verify existence, then soft-delete (set `deletedAt`) — do not issue a hard delete.

```ts
async remove(id: string): Promise<void> {
	const data = await UserRepository().findOne(id);
	if (!data) {
		throw new NotFoundException(`User with ID ${id} not found`);
	}
	await prisma.$transaction(async (tx) => {
		await tx.user.update({ where: { id }, data: { deletedAt: DateUtils.now().toDate() } });
	});
}
```

## Imports

```ts
import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { DatatableType, PaginationResponse } from "@common";
import { prisma, UserRepository, UserDetail, UserList } from "@repositories";
import { HashUtils, DateUtils } from "@utils";
```

Import only the exceptions the service actually throws.

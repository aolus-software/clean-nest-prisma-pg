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
		throw new NotFoundException(
			this.i18n.t("message.user.not_found", { args: { id } }),
		);
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
			message: this.i18n.t("message.user.email_exists"),
			error: { email: [this.i18n.t("message.user.email_exists")] },
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
		throw new NotFoundException(
			this.i18n.t("message.user.not_found", { args: { id } }),
		);
	}

	const emailOwner = await UserRepository().findByMail(dto.email);
	if (emailOwner && emailOwner.id !== id) {
		throw new UnprocessableEntityException({
			message: this.i18n.t("message.user.email_exists"),
			error: { email: [this.i18n.t("message.user.email_exists")] },
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
		throw new NotFoundException(
			this.i18n.t("message.user.not_found", { args: { id } }),
		);
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

## Exception messages are i18n lookups, never literals

Every message reaching a client goes through `this.i18n.t(...)` — see [i18n.md](./i18n.md), which is
the authority. The examples in this file used to show bare English template literals
(`` `User with ID ${id} not found` ``), which contradicted that rule: anyone following this file wrote
untranslated exceptions and was compliant with the rule they had read. The examples above are the
correct form.

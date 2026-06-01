---
paths:
  - "src/**/*.dto.ts"
---

# DTO Rules

## Decorate every property

Every property carries a Swagger decorator (`@ApiProperty` / `@ApiPropertyOptional` from `@nestjs/swagger`) **and** its class-validator decorators. Every `@ApiProperty` includes a realistic `example`.

```ts
export class CreateUserDto {
	@ApiProperty({ example: "John Doe" })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({ example: "john@example.com" })
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({ example: "Password#123" })
	@IsString()
	@IsStrongPassword()
	password: string;

	@ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
	@IsEnum(UserStatus)
	status: UserStatus;
}
```

## Validation

All validation decorators come from `class-validator` (`@IsString`, `@IsEmail`, `@IsNotEmpty`, `@IsOptional`, `@IsUUID`, `@IsEnum`, `@IsStrongPassword`, ...). Optional fields must have **both** `@ApiPropertyOptional` and `@IsOptional()`. Use `@IsStrongPassword()` for password fields. No validation logic inside the class body.

## Types

Explicit TypeScript type on every property — no implicit `any`. For enums, use the Prisma-generated enum: `@IsEnum(UserStatus)` and `@ApiProperty({ enum: UserStatus })` (import from `@prisma/client`).

## No logic

DTOs are data shapes only — no methods, computed properties, or business logic.

## Reuse with PartialType / OmitType

Build the update DTO from the create DTO instead of redeclaring fields:

```ts
export class UpdateUserDto extends OmitType(CreateUserDto, ["password"]) {}
// or, for fully-optional updates:
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

`OmitType` / `PartialType` come from `@nestjs/swagger`.

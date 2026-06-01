import { ApiProperty } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
import {
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
} from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class CreateUserDto {
	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@ApiProperty({
		example: "John Doe",
		description: "The full name of the user",
		format: "string",
	})
	name: string;

	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsEmail({}, { message: i18nValidationMessage("validation.IS_EMAIL") })
	@ApiProperty({
		example: "johndoe@example.com",
		description: "The email address of the user. Must be unique.",
		format: "email",
	})
	email: string;

	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsStrongPassword(
		{},
		{ message: i18nValidationMessage("validation.IS_STRONG_PASSWORD") },
	)
	@ApiProperty({
		example: "P@ssw0rd123",
		description: "The password for the user. Must be strong.",
		format: "password",
	})
	password: string;

	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsEnum(UserStatus, { message: i18nValidationMessage("validation.IS_ENUM") })
	@ApiProperty({
		example: UserStatus.ACTIVE,
		description: "The status of the user",
		enum: UserStatus,
	})
	status: UserStatus;
}

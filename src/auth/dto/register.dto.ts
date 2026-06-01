import { ApiProperty } from "@nestjs/swagger";
import {
	IsEmail,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
} from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class RegisterDto {
	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@ApiProperty({
		description: "Full name of the user",
		example: "John Doe",
		type: String,
	})
	name: string;

	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsEmail({}, { message: i18nValidationMessage("validation.IS_EMAIL") })
	@ApiProperty({
		description: "User email address",
		example: "someuser@example.com",
		type: String,
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
		description: "User password",
		example: "strongPassword123!",
		type: String,
		format: "password",
	})
	password: string;
}

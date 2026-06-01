import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class LoginDto {
	@IsEmail({}, { message: i18nValidationMessage("validation.IS_EMAIL") })
	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@ApiProperty({
		description: "User email address",
		example: "someuser@example.com",
		type: String,
		format: "email",
	})
	email: string;

	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@ApiProperty({
		description: "User password",
		example: "strongPassword123!",
		type: String,
	})
	password: string;
}

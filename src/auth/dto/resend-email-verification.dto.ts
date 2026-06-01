import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class ResendEmailVerificationDto {
	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsEmail({}, { message: i18nValidationMessage("validation.IS_EMAIL") })
	@ApiProperty({
		description: "User email address to resend verification email",
		example: "someuser@mail.com",
		type: String,
		format: "email",
	})
	email: string;
}

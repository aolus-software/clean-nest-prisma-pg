import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsStrongPassword } from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class ChangePasswordDto {
	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@ApiProperty({
		description: "The caller's current password",
		example: "S3crEtP4ssw0rd!",
		type: String,
		format: "password",
	})
	currentPassword: string;

	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsStrongPassword(
		{},
		{ message: i18nValidationMessage("validation.IS_STRONG_PASSWORD") },
	)
	@ApiProperty({
		description: "The new password. Must be strong.",
		example: "N3wP@ssw0rd!",
		type: String,
		format: "password",
	})
	newPassword: string;
}

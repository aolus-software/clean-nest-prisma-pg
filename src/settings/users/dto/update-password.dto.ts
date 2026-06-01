import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsStrongPassword } from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class UpdatePasswordDto {
	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsStrongPassword(
		{},
		{ message: i18nValidationMessage("validation.IS_STRONG_PASSWORD") },
	)
	@ApiProperty({
		example: "N3wP@ssw0rd!",
		description: "The new password for the user. Must be strong.",
		format: "password",
	})
	newPassword: string;
}

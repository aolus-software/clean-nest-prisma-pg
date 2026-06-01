import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class EmailVerificationDto {
	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@ApiProperty({
		description: "Email verification token sent to the user's email",
		example: "d4f5e6g7h8i9j0k1l2m3n4o5p6q7r8s9....",
		type: String,
	})
	token: string;
}

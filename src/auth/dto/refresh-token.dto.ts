import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class RefreshTokenDto {
	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@ApiProperty({
		description: "Refresh token returned by login or a previous refresh",
		example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		type: String,
	})
	refreshToken: string;
}

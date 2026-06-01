import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class CreatePermissionDto {
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsString({
		each: true,
		message: i18nValidationMessage("validation.IS_STRING"),
	})
	@ApiProperty({
		description: "Array of permission names",
		example: ["create_user", "delete_user", "update_user"],
		type: [String],
	})
	names: string[];

	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@ApiProperty({
		description: "Permission group",
		example: "user_management",
	})
	group: string;
}

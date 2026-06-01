import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class CreateRoleDto {
	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@ApiProperty({
		description: "Role name",
		example: "admin",
		format: "string",
	})
	name: string;

	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsString({
		each: true,
		message: i18nValidationMessage("validation.IS_STRING"),
	})
	@ApiProperty({
		description: "Array of permission IDs associated with the role",
		example: ["perm_123", "perm_456", "perm_789"],
		type: [String],
	})
	permissionIds: string[];
}

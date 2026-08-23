import { CreatePermissionDto } from "./create-permission.dto";
import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty, OmitType } from "@nestjs/swagger";
import { i18nValidationMessage } from "nestjs-i18n";

export class UpdatePermissionDto extends OmitType(CreatePermissionDto, [
	"actions",
]) {
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@ApiProperty({
		description:
			"The action half of the permission. Stored as `<group>:<action>`.",
		example: "create",
	})
	action: string;
}

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
		description:
			"The actions to create in this group. Each becomes a permission " +
			"named `<group>:<action>` — the form every @PermissionAuth string " +
			"uses and the form the seeder produces.",
		example: ["list", "create", "view", "update", "delete"],
		type: [String],
	})
	actions: string[];

	@IsString({ message: i18nValidationMessage("validation.IS_STRING") })
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@ApiProperty({
		description: "The resource this group of actions applies to, singular.",
		example: "user",
	})
	group: string;
}

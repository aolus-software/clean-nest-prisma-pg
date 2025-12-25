import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreatePermissionDto {
	@IsNotEmpty()
	@IsString({ each: true })
	@ApiProperty({
		description: "Array of permission names",
		example: ["create_user", "delete_user", "update_user"],
		type: [String],
	})
	names: string[];

	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "Permission group",
		example: "user_management",
	})
	group: string;
}

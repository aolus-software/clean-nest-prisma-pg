import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateRoleDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "Role name",
		example: "admin",
		format: "string",
	})
	name: string;

	@IsNotEmpty()
	@IsString({ each: true })
	@ApiProperty({
		description: "Array of permission IDs associated with the role",
		example: ["perm_123", "perm_456", "perm_789"],
		type: [String],
	})
	permissionIds: string[];
}

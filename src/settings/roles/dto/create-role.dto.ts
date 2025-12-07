import { IsNotEmpty, IsString } from "class-validator";

export class CreateRoleDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsNotEmpty()
	@IsString({ each: true })
	permissionIds: string[];
}

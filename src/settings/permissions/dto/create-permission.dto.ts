import { IsNotEmpty, IsString } from "class-validator";

export class CreatePermissionDto {
	@IsNotEmpty()
	@IsString({ each: true })
	names: string[];

	@IsString()
	@IsNotEmpty()
	group: string;
}

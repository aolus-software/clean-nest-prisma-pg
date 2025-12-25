import { CreatePermissionDto } from "./create-permission.dto";
import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty, OmitType } from "@nestjs/swagger";

export class UpdatePermissionDto extends OmitType(CreatePermissionDto, [
	"names",
]) {
	@IsNotEmpty()
	@IsString()
	@ApiProperty({
		description: "Permission name",
		example: "create_user",
	})
	name: string;
}

import { OmitType } from "@nestjs/mapped-types";
import { CreatePermissionDto } from "./create-permission.dto";
import { IsNotEmpty, IsString } from "class-validator";

export class UpdatePermissionDto extends OmitType(CreatePermissionDto, [
	"names",
]) {
	@IsNotEmpty()
	@IsString()
	name: string;
}

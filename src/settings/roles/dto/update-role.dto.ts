import { OmitType } from "@nestjs/swagger";
import { CreateRoleDto } from "./create-role.dto";

export class UpdateRoleDto extends OmitType(CreateRoleDto, []) {}

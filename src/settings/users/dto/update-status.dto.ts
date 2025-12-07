import { UserStatus } from "@prisma/client";
import { IsNotEmpty, IsEnum } from "class-validator";
export class UpdateStatusDto {
	@IsNotEmpty()
	@IsEnum(UserStatus)
	status: UserStatus;
}

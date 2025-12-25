import { ApiProperty } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
import { IsNotEmpty, IsEnum } from "class-validator";
export class UpdateStatusDto {
	@IsNotEmpty()
	@IsEnum(UserStatus)
	@ApiProperty({
		example: UserStatus.ACTIVE,
		description: "The new status for the user",
		enum: UserStatus,
	})
	status: UserStatus;
}

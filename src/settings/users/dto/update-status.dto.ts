import { ApiProperty } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
import { IsNotEmpty, IsEnum } from "class-validator";
import { i18nValidationMessage } from "nestjs-i18n";

export class UpdateStatusDto {
	@IsNotEmpty({ message: i18nValidationMessage("validation.NOT_EMPTY") })
	@IsEnum(UserStatus, { message: i18nValidationMessage("validation.IS_ENUM") })
	@ApiProperty({
		example: UserStatus.ACTIVE,
		description: "The new status for the user",
		enum: UserStatus,
	})
	status: UserStatus;
}

import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsStrongPassword } from "class-validator";

export class UpdatePasswordDto {
	@IsString()
	@IsNotEmpty()
	@IsStrongPassword()
	@ApiProperty({
		example: "N3wP@ssw0rd!",
		description: "The new password for the user. Must be strong.",
		format: "password",
	})
	newPassword: string;
}

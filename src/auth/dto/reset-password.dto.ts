import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsStrongPassword } from "class-validator";

export class ResetPasswordDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "Reset password token sent to the user's email",
		example: "d4f5e6g7h8i9j0k1l2m3n4o5p6q7r8s9....",
		type: String,
	})
	token: string;

	@IsString()
	@IsNotEmpty()
	@IsStrongPassword()
	@ApiProperty({
		description: "New password for the user",
		example: "strongPassword123!",
		type: String,
		format: "password",
	})
	password: string;
}

import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ForgotPasswordDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "User email address for password reset",
		example: "someuser@example.com",
		type: String,
		format: "email",
	})
	email: string;
}

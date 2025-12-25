import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class ResendEmailVerificationDto {
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	@ApiProperty({
		description: "User email address to resend verification email",
		example: "someuser@mail.com",
		type: String,
		format: "email",
	})
	email: string;
}

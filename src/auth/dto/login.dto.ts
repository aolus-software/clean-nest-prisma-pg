import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
	@IsEmail()
	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "User email address",
		example: "someuser@example.com",
		type: String,
		format: "email",
	})
	email: string;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "User password",
		example: "strongPassword123!",
		type: String,
	})
	password: string;
}

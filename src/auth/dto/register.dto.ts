import { ApiProperty } from "@nestjs/swagger";
import {
	IsEmail,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
} from "class-validator";

export class RegisterDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "Full name of the user",
		example: "John Doe",
		type: String,
	})
	name: string;

	@IsString()
	@IsNotEmpty()
	@IsEmail()
	@ApiProperty({
		description: "User email address",
		example: "someuser@example.com",
		type: String,
		format: "email",
	})
	email: string;

	@IsString()
	@IsNotEmpty()
	@IsStrongPassword()
	@ApiProperty({
		description: "User password",
		example: "strongPassword123!",
		type: String,
		format: "password",
	})
	password: string;
}

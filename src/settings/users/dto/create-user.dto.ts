import { ApiProperty } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
import {
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
} from "class-validator";

export class CreateUserDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		example: "John Doe",
		description: "The full name of the user",
		format: "string",
	})
	name: string;

	@IsString()
	@IsNotEmpty()
	@IsEmail()
	@ApiProperty({
		example: "johndoe@example.com",
		description: "The email address of the user. Must be unique.",
		format: "email",
	})
	email: string;

	@IsString()
	@IsNotEmpty()
	@IsStrongPassword()
	@ApiProperty({
		example: "P@ssw0rd123",
		description: "The password for the user. Must be strong.",
		format: "password",
	})
	password: string;

	@IsNotEmpty()
	@IsEnum(UserStatus)
	@ApiProperty({
		example: UserStatus.ACTIVE,
		description: "The status of the user",
		enum: UserStatus,
	})
	status: UserStatus;
}

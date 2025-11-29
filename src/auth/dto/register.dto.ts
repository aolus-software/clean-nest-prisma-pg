import {
	IsEmail,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
} from "class-validator";

export class RegisterDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	@IsEmail()
	email: string;

	@IsString()
	@IsNotEmpty()
	@IsStrongPassword()
	password: string;
}

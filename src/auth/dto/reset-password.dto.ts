import { IsNotEmpty, IsString, IsStrongPassword } from "class-validator";

export class ResetPasswordDto {
	@IsString()
	@IsNotEmpty()
	token: string;

	@IsString()
	@IsNotEmpty()
	@IsStrongPassword()
	password: string;
}

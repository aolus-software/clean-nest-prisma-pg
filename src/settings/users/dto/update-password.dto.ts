import { IsNotEmpty, IsString, IsStrongPassword } from "class-validator";

export class UpdatePasswordDto {
	@IsString()
	@IsNotEmpty()
	@IsStrongPassword()
	newPassword: string;
}

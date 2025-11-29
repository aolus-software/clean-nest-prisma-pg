import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class ResendEmailVerificationDto {
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	email: string;
}

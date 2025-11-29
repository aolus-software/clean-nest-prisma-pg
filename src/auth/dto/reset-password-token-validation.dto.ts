import { IsNotEmpty, IsString } from "class-validator";

export class ResetPasswordTokenValidationDto {
	@IsString()
	@IsNotEmpty()
	token: string;
}

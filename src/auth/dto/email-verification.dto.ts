import { IsNotEmpty, IsString } from "class-validator";

export class EmailVerificationDto {
	@IsString()
	@IsNotEmpty()
	token: string;
}

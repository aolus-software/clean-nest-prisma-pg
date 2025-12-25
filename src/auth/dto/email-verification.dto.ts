import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class EmailVerificationDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({
		description: "Email verification token sent to the user's email",
		example: "d4f5e6g7h8i9j0k1l2m3n4o5p6q7r8s9....",
		type: String,
	})
	token: string;
}

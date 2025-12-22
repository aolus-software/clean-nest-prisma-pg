import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { AuthGuard, CurrentUser, ResponseHandler } from "@common";
import { UserInformation } from "@repositories";
import { RegisterDto } from "./dto/register.dto";
import { ResendEmailVerificationDto } from "./dto/resend-email-verification.dto";
import { EmailVerificationDto } from "./dto/email-verification.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ResetPasswordTokenValidationDto } from "./dto/reset-password-token-validation.dto";
import { FastifyReply } from "fastify";

@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post("/login")
	async login(@Body() data: LoginDto, @Res() res: FastifyReply) {
		try {
			const result = await this.authService.login(data);
			return res.status(200).send(
				ResponseHandler.success<{
					user: UserInformation;
					accessToken: string;
					refreshToken: string;
				}>(200, "Login successful", result),
			);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/register")
	async register(@Body() data: RegisterDto, @Res() res: FastifyReply) {
		try {
			await this.authService.register(data);
			return res
				.status(201)
				.send(
					ResponseHandler.success(
						201,
						"Registration successful, please verify your email",
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/resend-verification-email")
	async resendVerificationEmail(
		@Body() data: ResendEmailVerificationDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.authService.resendVerificationEmail(data);
			return res
				.status(200)
				.send(
					ResponseHandler.success(
						200,
						"Verification email resent successfully",
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/verify-email")
	async verifyEmail(
		@Body() data: EmailVerificationDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.authService.verifyEmail(data);
			return res
				.status(200)
				.send(
					ResponseHandler.success(200, "Email verified successfully", null),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/forgot-password")
	async forgotPassword(
		@Body() data: ForgotPasswordDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.authService.forgotPassword(data);
			return res
				.status(200)
				.send(
					ResponseHandler.success(
						200,
						"Password reset email sent successfully",
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/validate-reset-password-token")
	async validateResetPasswordToken(
		@Body() data: ResetPasswordTokenValidationDto,
		@Res() res: FastifyReply,
	) {
		try {
			const isValid = await this.authService.isResetPasswordTokenValid(data);
			return res
				.status(200)
				.send(
					ResponseHandler.success(
						200,
						"Reset password token validation successful",
						{ isValid },
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/reset-password")
	async resetPassword(
		@Body() data: ResetPasswordDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.authService.resetPassword(data);
			return res
				.status(200)
				.send(
					ResponseHandler.success(200, "Password reset successfully", null),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Get("/profile")
	@UseGuards(AuthGuard)
	profile(@Res() res: FastifyReply, @CurrentUser() user: UserInformation) {
		try {
			return res
				.status(200)
				.send(
					ResponseHandler.success<UserInformation>(
						200,
						"Profile fetched successfully",
						user,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}
}

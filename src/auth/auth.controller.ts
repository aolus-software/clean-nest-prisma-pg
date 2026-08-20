import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import {
	ApiStandardResponses,
	AuthGuard,
	CurrentUser,
	ResponseHandler,
} from "@common";
import { UserInformation } from "@repositories";
import { RegisterDto } from "./dto/register.dto";
import { ResendEmailVerificationDto } from "./dto/resend-email-verification.dto";
import { EmailVerificationDto } from "./dto/email-verification.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ResetPasswordTokenValidationDto } from "./dto/reset-password-token-validation.dto";
import { FastifyReply } from "fastify";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiSuccessResponse } from "@common";
import { UserStatus } from "@prisma/client";
import { I18nService } from "nestjs-i18n";

@Controller("auth")
@ApiTags("Auth")
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly i18n: I18nService,
	) {}

	@Post("/login")
	@ApiSuccessResponse(
		200,
		"Login successful",
		{
			user: {
				id: "user-id",
				email: "user@example.com",
				name: "John Doe",
				status: "ACTIVE",
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2024-01-01T00:00:00.000Z",
				roles: [
					{
						name: "User",
						permissions: ["read_articles", "comment"],
					},
				],
				permissions: ["read_articles", "comment"],
			},
			accessToken: "access-token",
			refreshToken: "refresh-token",
		},
		{
			type: "object",
			properties: {
				user: {
					type: "object",
					properties: {
						id: { type: "string", example: "user-id" },
						email: { type: "string", example: "user@example.com" },
						name: { type: "string", example: "John Doe" },
						status: {
							type: "enum",
							example: "ACTIVE",
							enum: Object.values(UserStatus),
						},
						createdAt: { type: "string", format: "date-time" },
						updatedAt: { type: "string", format: "date-time" },
						roles: {
							type: "array",
							items: {
								type: "object",
								properties: {
									name: { type: "string", example: "User" },
									permissions: {
										type: "array",
										items: { type: "string", example: "read_articles" },
									},
								},
							},
						},
						permissions: {
							type: "array",
							items: { type: "string", example: "read_articles" },
						},
					},
				},
				accessToken: { type: "string", example: "access-token" },
				refreshToken: { type: "string", example: "refresh-token" },
			},
		},
	)
	@ApiStandardResponses({
		unauthorized: false,
		forbidden: false,
	})
	async login(@Body() data: LoginDto, @Res() res: FastifyReply) {
		try {
			const result = await this.authService.login(data);
			return res.status(200).send(
				ResponseHandler.success<{
					user: UserInformation;
					accessToken: string;
					refreshToken: string;
				}>(200, this.i18n.t("message.auth.login_success"), result),
			);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/register")
	@ApiSuccessResponse(
		201,
		"Registration successful, please verify your email",
		null,
	)
	@ApiStandardResponses({
		unauthorized: false,
		forbidden: false,
	})
	async register(@Body() data: RegisterDto, @Res() res: FastifyReply) {
		try {
			await this.authService.register(data);
			return res
				.status(201)
				.send(
					ResponseHandler.success(
						201,
						this.i18n.t("message.auth.register_success"),
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/resend-verification-email")
	@ApiSuccessResponse(200, "Verification email resent successfully", null)
	@ApiStandardResponses({
		unauthorized: false,
		forbidden: false,
	})
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
						this.i18n.t("message.auth.resend_verification_success"),
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/verify-email")
	@ApiSuccessResponse(200, "Email verified successfully", null)
	@ApiStandardResponses({
		unauthorized: false,
		forbidden: false,
	})
	async verifyEmail(
		@Body() data: EmailVerificationDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.authService.verifyEmail(data);
			return res
				.status(200)
				.send(
					ResponseHandler.success(
						200,
						this.i18n.t("message.auth.verify_email_success"),
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/forgot-password")
	@ApiSuccessResponse(200, "Password reset email sent successfully", null)
	@ApiStandardResponses({
		unauthorized: false,
		forbidden: false,
	})
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
						this.i18n.t("message.auth.forgot_password_success"),
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/validate-reset-password-token")
	@ApiSuccessResponse(200, "Reset password token validation successful", {
		isValid: true,
	})
	@ApiStandardResponses({
		unauthorized: false,
		forbidden: false,
	})
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
						this.i18n.t("message.auth.reset_token_valid_success"),
						{ isValid },
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/reset-password")
	@ApiSuccessResponse(200, "Password reset successfully", null)
	@ApiStandardResponses({
		unauthorized: false,
		forbidden: false,
	})
	async resetPassword(
		@Body() data: ResetPasswordDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.authService.resetPassword(data);
			return res
				.status(200)
				.send(
					ResponseHandler.success(
						200,
						this.i18n.t("message.auth.reset_password_success"),
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Get("/profile")
	@UseGuards(AuthGuard)
	@ApiBearerAuth("Bearer")
	@ApiSuccessResponse(
		200,
		"Profile fetched successfully",
		{
			id: "user-id",
			email: "user@example.com",
			name: "John Doe",
			status: "ACTIVE",
			createdAt: "2024-01-01T00:00:00.000Z",
			updatedAt: "2024-01-01T00:00:00.000Z",
			roles: [
				{
					name: "User",
					permissions: ["read_articles", "comment"],
				},
			],
			permissions: ["read_articles", "comment"],
		},
		{
			type: "object",
			properties: {
				id: { type: "string", example: "user-id" },
				email: { type: "string", example: "user@example.com" },
				name: { type: "string", example: "John Doe" },
				status: {
					type: "string",
					example: "ACTIVE",
					enum: Object.values(UserStatus),
				},
				createdAt: { type: "string", format: "date-time" },
				updatedAt: { type: "string", format: "date-time" },
				roles: {
					type: "array",
					items: {
						type: "object",
						properties: {
							name: { type: "string", example: "User" },
							permissions: {
								type: "array",
								items: { type: "string", example: "read_articles" },
							},
						},
					},
				},
				permissions: {
					type: "array",
					items: { type: "string", example: "read_articles" },
				},
			},
		},
	)
	@ApiStandardResponses({
		forbidden: false,
	})
	profile(@Res() res: FastifyReply, @CurrentUser() user: UserInformation) {
		try {
			return res
				.status(200)
				.send(
					ResponseHandler.success<UserInformation>(
						200,
						this.i18n.t("message.auth.profile_success"),
						user,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}
}

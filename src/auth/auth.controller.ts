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
import { ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";

@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post("/login")
	@ApiResponse({
		status: 200,
		description: "User login successful",
		schema: {
			format: "application/json",
			title: "Login Response",
			description: "Response schema for a successful login",
			example: {
				code: 200,
				success: true,
				message: "Login successful",
				data: {
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
			},
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
	})
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
				}>(200, "Login successful", result),
			);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/register")
	@ApiResponse({
		status: 201,
		description: "User registration successful",
		schema: {
			format: "application/json",
			title: "Registration Response",
			description: "Response schema for a successful registration",
			example: {
				code: 201,
				success: true,
				message: "Registration successful, please verify your email",
				data: null,
			},
		},
	})
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
						"Registration successful, please verify your email",
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/resend-verification-email")
	@ApiResponse({
		status: 200,
		description: "Verification email resent successfully",
		schema: {
			format: "application/json",
			title: "Resend Verification Email Response",
			description: "Response schema for a successful resend verification email",
			example: {
				code: 200,
				success: true,
				message: "Verification email resent successfully",
				data: null,
			},
		},
	})
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
						"Verification email resent successfully",
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/verify-email")
	@ApiResponse({
		status: 200,
		description: "Email verified successfully",
		schema: {
			format: "application/json",
			title: "Email Verification Response",
			description: "Response schema for a successful email verification",
			example: {
				code: 200,
				success: true,
				message: "Email verified successfully",
				data: null,
			},
		},
	})
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
					ResponseHandler.success(200, "Email verified successfully", null),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/forgot-password")
	@ApiResponse({
		status: 200,
		description: "Password reset email sent successfully",
		schema: {
			format: "application/json",
			title: "Forgot Password Response",
			description: "Response schema for a successful forgot password request",
			example: {
				code: 200,
				success: true,
				message: "Password reset email sent successfully",
				data: null,
			},
		},
	})
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
						"Password reset email sent successfully",
						null,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/validate-reset-password-token")
	@ApiResponse({
		status: 200,
		description: "Reset password token validation successful",
		schema: {
			format: "application/json",
			title: "Reset Password Token Validation Response",
			description:
				"Response schema for a successful reset password token validation",
			example: {
				code: 200,
				success: true,
				message: "Reset password token validation successful",
				data: {
					isValid: true,
				},
			},
		},
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
						"Reset password token validation successful",
						{ isValid },
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Post("/reset-password")
	@ApiResponse({
		status: 200,
		description: "Password reset successfully",
		schema: {
			format: "application/json",
			title: "Reset Password Response",
			description: "Response schema for a successful password reset",
			example: {
				code: 200,
				success: true,
				message: "Password reset successfully",
				data: null,
			},
		},
	})
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
					ResponseHandler.success(200, "Password reset successfully", null),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}

	@Get("/profile")
	@UseGuards(AuthGuard)
	@ApiBearerAuth("Bearer")
	@ApiResponse({
		status: 200,
		description: "Profile fetched successfully",
		schema: {
			format: "application/json",
			title: "Profile Response",
			description: "Response schema for a successful profile fetch",
			example: {
				code: 200,
				success: true,
				message: "Profile fetched successfully",
				data: {
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
			},
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
	})
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
						"Profile fetched successfully",
						user,
					),
				);
		} catch (error) {
			ResponseHandler.handleError(res, error);
		}
	}
}

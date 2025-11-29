import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import { prisma, UserInformation, UserRepository } from "@repositories";
import { DateUtils, HashUtils, JWTUtils, StrUtils } from "@utils";
import { CacheService, MailService, UserCache } from "@common";
import { RegisterDto } from "./dto/register.dto";
import { ResendEmailVerificationDto } from "./dto/resend-email-verification.dto";
import { EmailVerificationDto } from "./dto/email-verification.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ResetPasswordTokenValidationDto } from "./dto/reset-password-token-validation.dto";

@Injectable()
export class AuthService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly mailService: MailService,
	) {}

	async login(data: LoginDto): Promise<{
		user: UserInformation;
		accessToken: string;
		refreshToken: string;
	}> {
		const user = await UserRepository().findByMail(data.email);
		if (!user) {
			throw new UnprocessableEntityException({
				message: "Invalid email or password",
				error: {
					email: ["Invalid email or password"],
				},
			});
		}

		if (!user.emailVerifiedAt) {
			throw new UnprocessableEntityException({
				message: "Please verify your email to proceed",
				error: {
					email: ["Please verify your email to proceed"],
				},
			});
		}

		const isPasswordValid = await HashUtils.compareHash(
			data.password,
			user.password,
		);
		if (!isPasswordValid) {
			throw new UnprocessableEntityException({
				message: "Invalid email or password",
				error: {
					email: ["Invalid email or password"],
				},
			});
		}

		// Clear any existing cache for the user
		await this.cacheService.del(UserCache(user.id));
		const userInformation = await UserRepository().userInformation(user.id);
		if (!userInformation) {
			throw new UnprocessableEntityException({
				message: "User information could not be retrieved",
				error: {
					user: ["User information could not be retrieved"],
				},
			});
		}

		await this.cacheService.set<UserInformation>(
			UserCache(user.id),
			userInformation,
			null,
		);

		const accessToken = JWTUtils.generateAccessToken({ sub: user.id });
		const refreshToken = JWTUtils.generateRefreshToken({ sub: user.id });

		return {
			user: userInformation,
			accessToken,
			refreshToken,
		};
	}

	async register(data: RegisterDto) {
		const isEmailExist = await UserRepository().findByMail(data.email);
		if (isEmailExist && isEmailExist.emailVerifiedAt !== null) {
			throw new UnprocessableEntityException({
				message: "Email already in use",
				error: {
					email: ["Email already in use"],
				},
			});
		}

		if (isEmailExist && isEmailExist.emailVerifiedAt === null) {
			throw new UnprocessableEntityException({
				message: "Please verify your email to complete registration",
				error: {
					email: ["Please verify your email to complete registration"],
				},
			});
		}

		const hashedPassword = await HashUtils.generateHash(data.password);
		await prisma.$transaction(async (tx) => {
			const newUser = await tx.user.create({
				data: {
					name: data.name,
					email: data.email,
					password: hashedPassword,
				},
			});

			const token = StrUtils.random(255);
			await tx.emailVerification.create({
				data: {
					userId: newUser.id,
					token,
					expiresAt: DateUtils.addHours(DateUtils.now(), 2).toDate(),
				},
			});

			await this.mailService.sendMail({
				subject: "Verify your email address",
				to: data.email,
				template: "auth/verify-email",
				context: {
					name: data.name,
					verifyUrl: `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
				},
			});
		});
	}

	async resendVerificationEmail(
		data: ResendEmailVerificationDto,
	): Promise<void> {
		const user = await UserRepository().findByMail(data.email);
		if (!user) {
			return;
		}

		if (user.emailVerifiedAt) {
			throw new UnprocessableEntityException({
				message: "Email is already verified",
				error: {
					email: ["Email is already verified"],
				},
			});
		}

		const token = StrUtils.random(255);
		await prisma.emailVerification.create({
			data: {
				userId: user.id,
				token,
				expiresAt: DateUtils.addHours(DateUtils.now(), 2).toDate(),
			},
		});

		await this.mailService.sendMail({
			subject: "Verify your email address",
			to: user.email,
			template: "auth/verify-email",
			context: {
				name: user.name,
				verifyUrl: `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
			},
		});
	}

	async verifyEmail(data: EmailVerificationDto): Promise<void> {
		const emailVerification = await prisma.emailVerification.findFirst({
			where: { token: data.token },
			include: { user: true },
		});

		if (!emailVerification) {
			throw new UnprocessableEntityException({
				message: "Invalid or expired verification token",
				error: {
					token: ["Invalid or expired verification token"],
				},
			});
		}

		if (emailVerification.usedAt) {
			throw new UnprocessableEntityException({
				message: "Invalid or expired verification token",
				error: {
					token: ["Invalid or expired verification token"],
				},
			});
		}

		const now = DateUtils.now();
		const expiredAt = DateUtils.parse(
			emailVerification.expiresAt.toISOString(),
		);

		if (now.isAfter(expiredAt)) {
			throw new UnprocessableEntityException({
				message: "Invalid or expired verification token",
				error: {
					token: ["Invalid or expired verification token"],
				},
			});
		}

		await prisma.$transaction(async (tx) => {
			await tx.user.update({
				where: { id: emailVerification.userId },
				data: { emailVerifiedAt: DateUtils.now().toDate() },
			});

			await tx.emailVerification.update({
				where: { id: emailVerification.id },
				data: { usedAt: DateUtils.now().toDate() },
			});
		});
	}

	async forgotPassword(data: ForgotPasswordDto) {
		const user = await UserRepository().findByMail(data.email);
		if (!user) {
			return;
		}

		if (!user.emailVerifiedAt) {
			throw new UnprocessableEntityException({
				message: "Please verify your email to proceed",
				error: {
					email: ["Please verify your email to proceed"],
				},
			});
		}

		const token = StrUtils.random(255);
		await prisma.resetPassword.create({
			data: {
				userId: user.id,
				token,
				expiresAt: DateUtils.addHours(DateUtils.now(), 2).toDate(),
			},
		});

		await this.mailService.sendMail({
			to: user.email,
			subject: "Reset your password",
			template: "auth/forgot-password",
			context: {
				name: user.name,
				resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
			},
		});
	}

	async isResetPasswordTokenValid(
		data: ResetPasswordTokenValidationDto,
	): Promise<boolean> {
		const resetPassword = await prisma.resetPassword.findFirst({
			where: { token: data.token },
		});

		if (!resetPassword) {
			return false;
		}

		if (resetPassword.usedAt) {
			return false;
		}

		const now = DateUtils.now();
		const expiredAt = DateUtils.parse(resetPassword.expiresAt.toISOString());

		if (now.isAfter(expiredAt)) {
			return false;
		}

		return true;
	}

	async resetPassword(data: ResetPasswordDto) {
		const resetPassword = await prisma.resetPassword.findFirst({
			where: { token: data.token },
			include: { user: true },
		});

		if (!resetPassword) {
			throw new UnprocessableEntityException({
				message: "Invalid or expired reset token",
				error: {
					token: ["Invalid or expired reset token"],
				},
			});
		}

		if (resetPassword.usedAt) {
			throw new UnprocessableEntityException({
				message: "Invalid or expired reset token",
				error: {
					token: ["Invalid or expired reset token"],
				},
			});
		}

		const now = DateUtils.now();
		const expiredAt = DateUtils.parse(resetPassword.expiresAt.toISOString());

		if (now.isAfter(expiredAt)) {
			throw new UnprocessableEntityException({
				message: "Invalid or expired reset token",
				error: {
					token: ["Invalid or expired reset token"],
				},
			});
		}

		const hashedPassword = await HashUtils.generateHash(data.password);
		await prisma.$transaction(async (tx) => {
			await tx.user.update({
				where: { id: resetPassword.userId },
				data: { password: hashedPassword },
			});

			await tx.resetPassword.update({
				where: { id: resetPassword.id },
				data: { usedAt: DateUtils.now().toDate() },
			});
		});
	}
}

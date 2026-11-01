import {
	Injectable,
	UnauthorizedException,
	UnprocessableEntityException,
} from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import { prisma, UserInformation, UserRepository } from "@repositories";
import {
	DateUtils,
	emailVerificationLifetime,
	HashUtils,
	JWTPayload,
	JWTUtils,
	resetPasswordLifetime,
	StrUtils,
} from "@utils";
import {
	CacheService,
	MailService,
	RefreshTokenCache,
	UserCache,
} from "@common";
import { RegisterDto } from "./dto/register.dto";
import { ResendEmailVerificationDto } from "./dto/resend-email-verification.dto";
import { EmailVerificationDto } from "./dto/email-verification.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ResetPasswordTokenValidationDto } from "./dto/reset-password-token-validation.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { getEnv } from "@config";
import { I18nService } from "nestjs-i18n";

/* A real bcrypt hash of a value nobody holds. Compared against when the email
   does not resolve, purely so the failed-login path costs the same either way. */
const TIMING_EQUALISER_HASH =
	"$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

@Injectable()
export class AuthService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly mailService: MailService,
		private readonly i18n: I18nService,
	) {}

	async login(data: LoginDto): Promise<{
		user: UserInformation;
		accessToken: string;
		refreshToken: string;
	}> {
		const user = await UserRepository().findByMail(data.email);

		/* Verify the password before looking at account state, and answer an
		   unknown address and a wrong password with the same message. Checking
		   "is this email verified" first would let an unauthenticated caller
		   tell a registered address from an unknown one without ever holding a
		   valid password. The dummy comparison keeps the response time for an
		   unknown address in line with a real one, so timing does not leak what
		   the message no longer does. */
		const isPasswordValid = user
			? await HashUtils.compareHash(data.password, user.password)
			: await HashUtils.compareHash(data.password, TIMING_EQUALISER_HASH);

		if (!user || !isPasswordValid) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.auth.invalid_credentials"),
				error: {
					email: [this.i18n.t("message.auth.invalid_credentials")],
				},
			});
		}

		if (!user.emailVerifiedAt) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.auth.verify_email_required"),
				error: {
					email: [this.i18n.t("message.auth.verify_email_required")],
				},
			});
		}

		// Clear any existing cache for the user
		await this.cacheService.del(UserCache(user.id));
		const userInformation = await UserRepository().userInformation(user.id);
		if (!userInformation) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.auth.user_info_failed"),
				error: {
					user: [this.i18n.t("message.auth.user_info_failed")],
				},
			});
		}

		await this.cacheService.set<UserInformation>(
			UserCache(user.id),
			userInformation,
			null,
		);

		const { accessToken, refreshToken } = await this.issueTokens(user.id);

		return {
			user: userInformation,
			accessToken,
			refreshToken,
		};
	}

	/* Exchange a refresh token for a new access + refresh pair. The token's jti
	   must match the one stored for the user in Redis, and issuing the new pair
	   replaces it, so each refresh token works once and anything that revokes
	   the session (password change or reset, delete, suspend) rejects it at
	   once. The user is re-read from the database, not the cache, so an account
	   deactivated or deleted since login cannot refresh. */
	async refresh(data: RefreshTokenDto): Promise<{
		accessToken: string;
		refreshToken: string;
	}> {
		let payload: JWTPayload;
		try {
			payload = JWTUtils.verifyRefreshToken(data.refreshToken);
		} catch {
			throw new UnauthorizedException(
				this.i18n.t("message.auth.invalid_refresh_token"),
			);
		}

		const storedJti = await this.cacheService.get<string>(
			RefreshTokenCache(payload.sub),
		);
		if (!payload.jti || storedJti !== payload.jti) {
			throw new UnauthorizedException(
				this.i18n.t("message.auth.invalid_refresh_token"),
			);
		}

		const user = await UserRepository().userInformation(payload.sub);
		if (!user) {
			await this.cacheService.revokeSession(payload.sub);
			throw new UnauthorizedException(
				this.i18n.t("message.auth.invalid_refresh_token"),
			);
		}

		return await this.issueTokens(user.id);
	}

	private async issueTokens(userId: string): Promise<{
		accessToken: string;
		refreshToken: string;
	}> {
		const jti = StrUtils.random(32);
		const refreshToken = JWTUtils.generateRefreshToken({ sub: userId, jti });
		const expiresAt = JWTUtils.decodeToken(refreshToken)?.exp ?? 0;
		const ttl = Math.max(expiresAt - Math.floor(Date.now() / 1000), 1);
		await this.cacheService.set(RefreshTokenCache(userId), jti, ttl);

		return {
			accessToken: JWTUtils.generateAccessToken({ sub: userId }),
			refreshToken,
		};
	}

	async register(data: RegisterDto) {
		const isEmailExist = await UserRepository().findByMail(data.email);
		if (isEmailExist && isEmailExist.emailVerifiedAt !== null) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.auth.email_in_use"),
				error: {
					email: [this.i18n.t("message.auth.email_in_use")],
				},
			});
		}

		if (isEmailExist && isEmailExist.emailVerifiedAt === null) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.auth.verify_to_complete"),
				error: {
					email: [this.i18n.t("message.auth.verify_to_complete")],
				},
			});
		}

		const hashedPassword = await HashUtils.generateHash(data.password);

		/* The mail is enqueued only after the transaction commits. Redis and
		   Postgres share no transaction, so enqueuing inside the callback lets
		   the worker send a verification link whose token row is not committed
		   yet — or send one at all for a registration that rolled back. This is
		   what .claude/rules/queue.md rule 11 already requires. */
		const token = await prisma.$transaction(async (tx) => {
			const newUser = await tx.user.create({
				data: {
					name: data.name,
					email: data.email,
					password: hashedPassword,
				},
			});

			const verificationToken = StrUtils.random(255);
			await tx.emailVerification.create({
				data: {
					userId: newUser.id,
					token: verificationToken,
					expiresAt: emailVerificationLifetime(),
				},
			});

			return verificationToken;
		});

		await this.mailService.sendMail({
			subject: this.i18n.t("email.verify_email.subject"),
			to: data.email,
			template: "auth/verify-email",
			context: {
				name: data.name,
				verifyUrl: `${getEnv().FRONTEND_URL}/verify-email?token=${token}`,
			},
		});
	}

	async resendVerificationEmail(
		data: ResendEmailVerificationDto,
	): Promise<void> {
		const user = await UserRepository().findByMail(data.email);
		if (!user) {
			return;
		}

		/* Already verified: return as though the mail was sent. Throwing here
		   would tell an unauthenticated caller that the address is registered
		   and verified, which is what the silent branch above exists to
		   prevent. */
		if (user.emailVerifiedAt) {
			return;
		}

		const token = StrUtils.random(255);
		await prisma.emailVerification.create({
			data: {
				userId: user.id,
				token,
				expiresAt: emailVerificationLifetime(),
			},
		});

		await this.mailService.sendMail({
			subject: this.i18n.t("email.verify_email.subject"),
			to: user.email,
			template: "auth/verify-email",
			context: {
				name: user.name,
				verifyUrl: `${getEnv().FRONTEND_URL}/verify-email?token=${token}`,
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
				message: this.i18n.t("message.auth.invalid_verification_token"),
				error: {
					token: [this.i18n.t("message.auth.invalid_verification_token")],
				},
			});
		}

		if (emailVerification.usedAt) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.auth.invalid_verification_token"),
				error: {
					token: [this.i18n.t("message.auth.invalid_verification_token")],
				},
			});
		}

		const now = DateUtils.now();
		const expiredAt = DateUtils.parse(
			emailVerification.expiresAt.toISOString(),
		);

		if (now.isAfter(expiredAt)) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.auth.invalid_verification_token"),
				error: {
					token: [this.i18n.t("message.auth.invalid_verification_token")],
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

		/* Not yet verified: return silently rather than throwing. A distinct
		   error here would reveal that the address is registered — the same
		   disclosure the unknown-address branch above avoids. */
		if (!user.emailVerifiedAt) {
			return;
		}

		const token = StrUtils.random(255);
		await prisma.resetPassword.create({
			data: {
				userId: user.id,
				token,
				expiresAt: resetPasswordLifetime(),
			},
		});

		await this.mailService.sendMail({
			to: user.email,
			subject: this.i18n.t("email.forgot_password.subject"),
			template: "auth/forgot-password",
			context: {
				name: user.name,
				resetUrl: `${getEnv().FRONTEND_URL}/reset-password?token=${token}`,
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
				message: this.i18n.t("message.auth.invalid_reset_token"),
				error: {
					token: [this.i18n.t("message.auth.invalid_reset_token")],
				},
			});
		}

		if (resetPassword.usedAt) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.auth.invalid_reset_token"),
				error: {
					token: [this.i18n.t("message.auth.invalid_reset_token")],
				},
			});
		}

		const now = DateUtils.now();
		const expiredAt = DateUtils.parse(resetPassword.expiresAt.toISOString());

		if (now.isAfter(expiredAt)) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.auth.invalid_reset_token"),
				error: {
					token: [this.i18n.t("message.auth.invalid_reset_token")],
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

		await this.cacheService.revokeSession(resetPassword.userId);
	}
}

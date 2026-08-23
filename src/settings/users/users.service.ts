import {
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { prisma, UserDetail, UserList, UserRepository } from "@repositories";
import { DatatableType, MailService, PaginationResponse } from "@common";
import { DateUtils, HashUtils, StrUtils } from "@utils";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { getEnv } from "@config";
import { I18nService } from "nestjs-i18n";
import { CacheService, UserCache } from "@common";

@Injectable()
export class UsersService {
	constructor(
		private readonly mailService: MailService,
		private readonly i18n: I18nService,
		private readonly cacheService: CacheService,
	) {}

	async create(createUserDto: CreateUserDto): Promise<void> {
		const isEmailExist = await UserRepository().findByMail(createUserDto.email);
		if (isEmailExist) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.user.email_exists"),
				error: {
					email: [this.i18n.t("message.user.email_exists")],
				},
			});
		}

		const password = await HashUtils.generateHash(createUserDto.password);
		await prisma.$transaction(async (tx) => {
			const user = await tx.user.create({
				data: {
					email: createUserDto.email,
					name: createUserDto.name,
					password: password,
					status: createUserDto.status,
				},
			});

			const token = StrUtils.random(255);
			await tx.emailVerification.create({
				data: {
					userId: user.id,
					token,
					expiresAt: DateUtils.addHours(DateUtils.now(), 2).toDate(),
				},
			});

			// Send verification email
			await this.mailService.sendMail({
				subject: this.i18n.t("email.verify_email.subject"),
				to: createUserDto.email,
				template: "auth/verify-email",
				context: {
					name: createUserDto.name,
					verifyUrl: `${getEnv().FRONTEND_URL}/verify-email?token=${token}`,
				},
			});
		});
	}

	async resendVerificationEmail(id: string): Promise<void> {
		const user = await UserRepository().user.findFirst({
			where: { id, deletedAt: null },
			select: { id: true, name: true, email: true, emailVerifiedAt: true },
		});
		if (!user) {
			return;
		}

		if (user.emailVerifiedAt) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.user.email_already_verified"),
				error: {
					email: [this.i18n.t("message.user.email_already_verified")],
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
			subject: this.i18n.t("email.verify_email.subject"),
			to: user.email,
			template: "auth/verify-email",
			context: {
				name: user.name,
				verifyUrl: `${getEnv().FRONTEND_URL}/verify-email?token=${token}`,
			},
		});
	}

	async findAll(
		queryParam: DatatableType,
	): Promise<PaginationResponse<UserList>> {
		return await UserRepository().findAll(queryParam);
	}

	async findOne(id: string): Promise<UserDetail> {
		const data = await UserRepository().findOne(id);
		if (!data) {
			throw new NotFoundException(
				this.i18n.t("message.user.not_found", { args: { id } }),
			);
		}

		return data;
	}

	async update(id: string, updateUserDto: UpdateUserDto): Promise<void> {
		const data = await UserRepository().findOne(id);
		if (!data) {
			throw new NotFoundException(
				this.i18n.t("message.user.not_found", { args: { id } }),
			);
		}

		const isEmailExist = await UserRepository().findByMail(updateUserDto.email);
		if (isEmailExist && isEmailExist.id !== id) {
			throw new UnprocessableEntityException({
				message: this.i18n.t("message.user.email_exists"),
				error: {
					email: [this.i18n.t("message.user.email_exists")],
				},
			});
		}

		await prisma.$transaction(async (tx) => {
			await tx.user.update({
				where: { id },
				data: {
					email: updateUserDto.email,
					name: updateUserDto.name,
					status: updateUserDto.status,
				},
			});
		});

		/* AuthStrategy resolves the caller's roles and permissions from this
		   cache entry, so a write that changes identity or authorization has to
		   drop it. Leaving it means a revoked role stays in force until the
		   entry expires. */
		await this.cacheService.del(UserCache(id));
	}

	async remove(id: string): Promise<void> {
		const data = await UserRepository().findOne(id);
		if (!data) {
			throw new NotFoundException(
				this.i18n.t("message.user.not_found", { args: { id } }),
			);
		}

		await prisma.$transaction(async (tx) => {
			await tx.user.update({
				where: { id },
				data: {
					deletedAt: DateUtils.now().toDate(),
				},
			});
		});

		/* AuthStrategy resolves the caller's roles and permissions from this
		   cache entry, so a write that changes identity or authorization has to
		   drop it. Leaving it means a revoked role stays in force until the
		   entry expires. */
		await this.cacheService.del(UserCache(id));
	}

	async updateStatus(id: string, data: UpdateStatusDto): Promise<void> {
		const user = await UserRepository().findOne(id);
		if (!user) {
			throw new NotFoundException(
				this.i18n.t("message.user.not_found", { args: { id } }),
			);
		}

		await prisma.user.update({
			where: { id },
			data: {
				status: data.status,
			},
		});

		/* AuthStrategy resolves the caller's roles and permissions from this
		   cache entry, so a write that changes identity or authorization has to
		   drop it. Leaving it means a revoked role stays in force until the
		   entry expires. */
		await this.cacheService.del(UserCache(id));
	}

	async updatePassword(id: string, data: UpdatePasswordDto): Promise<void> {
		const user = await UserRepository().findOne(id);
		if (!user) {
			throw new NotFoundException(
				this.i18n.t("message.user.not_found", { args: { id } }),
			);
		}

		const hashedPassword = await HashUtils.generateHash(data.newPassword);
		await prisma.user.update({
			where: { id },
			data: {
				password: hashedPassword,
			},
		});
	}

	async sendForgotPasswordEmail(id: string): Promise<void> {
		const user = await UserRepository().findOne(id);
		if (!user) {
			return;
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
			subject: this.i18n.t("email.forgot_password.subject"),
			to: user.email,
			template: "auth/forgot-password",
			context: {
				name: user.name,
				resetUrl: `${getEnv().FRONTEND_URL}/reset-password?token=${token}`,
			},
		});
	}
}

import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { MailJobData } from "./mail.processor";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class MailService {
	constructor(
		@InjectQueue("mail-queue") private readonly _mailQueue: Queue,
		private readonly _mailerService: MailerService,
		private readonly _configService: ConfigService,
	) {}

	async sendMail(options: MailJobData): Promise<void> {
		const enrichedOptions = this._enrichMailOptions(options);
		await this._mailQueue.add("sendMail", enrichedOptions);
	}

	async sendEmailSync(options: MailJobData): Promise<void> {
		const enrichedOptions = this._enrichMailOptions(options);
		await this._mailerService.sendMail(enrichedOptions);
	}

	private _enrichMailOptions(options: MailJobData): MailJobData {
		let appName: string | undefined = this._configService.get("APP_NAME");
		let appEnv: string | undefined = this._configService.get("APP_ENV");

		if (!appName) {
			appName = "Application";
		}

		if (!appEnv) {
			appEnv = "development";
		}

		let subject = options.subject;
		if (subject && !subject.includes(appName)) {
			subject = `${appName} - ${subject}`;
		}

		if (appEnv !== "production") {
			subject = `[${appEnv.toUpperCase()}] ${subject}`;
		}

		return {
			...options,
			from: options.from || this._configService.get("MAIL_FROM"),
			subject,
			replyTo: options.replyTo || this._configService.get("MAIL_FROM"),
			context: {
				...options.context,
				appName: this._configService.get("APP_NAME"),
				frontendUrl: this._configService.get("FRONTEND_URL"),
			},
		};
	}
}

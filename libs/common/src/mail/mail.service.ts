import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { MailJobData } from "./mail.processor";
import { MailerService } from "@nestjs-modules/mailer";
import { getEnv } from "@config";

@Injectable()
export class MailService {
	constructor(
		@InjectQueue("mail-queue") private readonly _mailQueue: Queue,
		private readonly _mailerService: MailerService,
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
		const appName: string = getEnv().APP_NAME;
		const appEnv: string = getEnv().NODE_ENV;

		let subject = options.subject;
		if (subject && !subject.includes(appName)) {
			subject = `${appName} - ${subject}`;
		}

		if (appEnv !== "production") {
			subject = `[${appEnv.toUpperCase()}] ${subject}`;
		}

		return {
			...options,
			from: options.from || getEnv().MAIL_FROM,
			subject,
			replyTo: options.replyTo || getEnv().MAIL_FROM,
			context: {
				...options.context,
				appName: appName,
				frontendUrl: getEnv().FRONTEND_URL,
			},
		};
	}
}

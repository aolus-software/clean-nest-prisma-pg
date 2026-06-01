import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { MailJobData } from "./mail.processor";
import { MailerService } from "@nestjs-modules/mailer";
import { getEnv } from "@config";
import { I18nContext } from "nestjs-i18n";

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
			template: this._localizedTemplate(options.template),
			context: {
				...options.context,
				appName: appName,
				frontendUrl: getEnv().FRONTEND_URL,
			},
		};
	}

	/* Resolves the Handlebars template against the active request language by
	   prefixing it with the locale directory (e.g. "auth/verify-email" becomes
	   "en/auth/verify-email"). Falls back to "en" outside a request context,
	   such as when a job is processed by the queue worker. */
	private _localizedTemplate(template?: string): string | undefined {
		if (!template) {
			return template;
		}

		const lang = I18nContext.current()?.lang ?? "en";
		return `${lang}/${template}`;
	}
}

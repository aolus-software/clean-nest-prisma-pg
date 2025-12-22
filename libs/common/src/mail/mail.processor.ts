import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import { ISendMailOptions, MailerService } from "@nestjs-modules/mailer";
import { LoggerUtils } from "@utils";

export interface MailJobData extends Omit<
	ISendMailOptions,
	"to" | "cc" | "bcc" | "replyTo"
> {
	to?: string | string[];
	cc?: string | string[];
	bcc?: string | string[];
	replyTo?: string | string[];
}

@Processor("mail-queue")
@Injectable()
export class MailProcessor extends WorkerHost {
	constructor(private readonly _mailerService: MailerService) {
		super();
	}

	async process(job: Job<MailJobData>) {
		await this._mailerService.sendMail(job.data);

		let message = `Mail ${job.data.subject} sent to `;
		const format = (val?: string | string[]) =>
			Array.isArray(val) ? val.join(", ") : (val ?? "");
		message += job.data.to ? `to: ${format(job.data.to)}, ` : "";
		message += job.data.cc ? `cc: ${format(job.data.cc)}, ` : "";
		message += job.data.bcc ? `bcc: ${format(job.data.bcc)}, ` : "";
		message += job.data.replyTo ? `replyTo: ${format(job.data.replyTo)}, ` : "";

		LoggerUtils.info(message);
	}
}

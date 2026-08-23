import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
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

	/* Fires once a job has exhausted every attempt. Without it a permanently
	   failed email leaves no trace at all — the job moves to the failed set and
	   nothing is logged, so an operator has nothing to correlate against a user
	   reporting that mail never arrived. queue.md rule 6. */
	@OnWorkerEvent("failed")
	onFailed(job: Job<MailJobData>, error: Error): void {
		LoggerUtils.error(
			`Mail job ${job?.id} failed after ${job?.attemptsMade} attempt(s)`,
			error,
		);
	}
}

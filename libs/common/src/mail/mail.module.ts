import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { BullModule } from "@nestjs/bullmq";
import { join } from "path";
import { MailProcessor } from "./mail.processor";
import { getEnv } from "@config";

@Module({
	providers: [MailService, MailProcessor],
	imports: [
		MailerModule.forRootAsync({
			useFactory: () => {
				const env = getEnv();
				return {
					transport: {
						host: env.MAIL_HOST,
						port: env.MAIL_PORT,
						secure: env.MAIL_SECURE,
						auth: {
							user: env.MAIL_USERNAME,
							pass: env.MAIL_PASSWORD,
						},
					},
					defaults: {
						from: env.MAIL_FROM,
					},

					template: {
						dir: join(
							process.cwd(),
							"libs",
							"common",
							"src",
							"mail",
							"templates",
						),
						adapter: new HandlebarsAdapter(),
						options: {
							strict: true,
						},
					},
				};
			},
		}),

		BullModule.registerQueue({
			name: "mail-queue",
			connection: {
				host: getEnv().REDIS_HOST,
				port: getEnv().REDIS_PORT,
				password: getEnv().REDIS_PASSWORD || undefined,
			},
		}),
	],

	exports: [MailService],
})
export class MailModule {}

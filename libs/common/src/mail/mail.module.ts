import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { BullModule } from "@nestjs/bullmq";
import { join } from "path";
import { ConfigModule } from "@nestjs/config";
import { MailProcessor } from "./mail.processor";

@Module({
	providers: [MailService, MailProcessor],
	imports: [
		ConfigModule.forRoot(),
		MailerModule.forRootAsync({
			useFactory: () => ({
				transport: {
					host: process.env.MAIL_HOST,
					port: parseInt(process.env.MAIL_PORT || "0", 10),
					secure: process.env.MAIL_SECURE === "true",
					auth: {
						user: process.env.MAIL_USERNAME,
						pass: process.env.MAIL_PASSWORD,
					},
				},
				defaults: {
					from: process.env.MAIL_FROM,
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
			}),
		}),

		BullModule.registerQueue({
			name: "mail-queue",
			connection: {
				host: process.env.REDIS_HOST || "localhost",
				port: Number(process.env.REDIS_PORT) || 6379,
				password: process.env.REDIS_PASSWORD || undefined,
			},
		}),
	],

	exports: [MailService],
})
export class MailModule {}

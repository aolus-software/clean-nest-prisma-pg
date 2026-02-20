import { Logger } from "@nestjs/common";
import { DateUtils } from "../date/date.utils";
import { getEnv } from "@config";

export class LoggerUtils {
	private static isDevelopment = getEnv().NODE_ENV === "development";
	private static logger = new Logger("LoggerUtils");

	static error(
		message: string,
		// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
		error?: Error | unknown,
		context?: object,
	): void {
		const timestamp = DateUtils.now().format("YYYY-MM-DD HH:mm:ss");
		const separator = "=".repeat(80);

		let errorMessage = `\n${separator}\n[ERROR] ${timestamp}\nMessage: ${message}`;

		if (context) {
			errorMessage += `\nContext: ${JSON.stringify(context, null, 2)}`;
		}

		if (error) {
			if (error instanceof Error) {
				errorMessage += `\nError Name: ${error.name}\nError Message: ${error.message}`;

				if (this.isDevelopment && error.stack) {
					errorMessage += `\nStack Trace:\n${error.stack}`;
				}
			} else {
				errorMessage += `\nError Details: ${JSON.stringify(error)}`;
			}
		}

		errorMessage += `\n${separator}`;

		this.logger.error(errorMessage);
	}

	static warn(message: string, context?: object): void {
		const timestamp = DateUtils.now().format("YYYY-MM-DD HH:mm:ss");
		let warnMessage = `[WARN] ${timestamp} - ${message}`;

		if (context) {
			warnMessage += `\nContext: ${JSON.stringify(context, null, 2)}`;
		}

		this.logger.warn(warnMessage);
	}

	static info(message: string, context?: object): void {
		const timestamp = DateUtils.now().format("YYYY-MM-DD HH:mm:ss");
		let infoMessage = `[INFO] ${timestamp} - ${message}`;

		if (context) {
			infoMessage += `\nContext: ${JSON.stringify(context, null, 2)}`;
		}

		this.logger.log(infoMessage);
	}

	static debug(message: string, context?: object): void {
		if (this.isDevelopment) {
			const timestamp = DateUtils.now().format("YYYY-MM-DD HH:mm:ss");
			let debugMessage = `[DEBUG] ${timestamp} - ${message}`;

			if (context) {
				debugMessage += `\nContext: ${JSON.stringify(context, null, 2)}`;
			}

			this.logger.debug(debugMessage);
		}
	}
}

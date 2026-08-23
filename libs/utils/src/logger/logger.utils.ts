import { Logger } from "@nestjs/common";
import { DateUtils } from "../date/date.utils";
import { getEnv } from "@config";

export class LoggerUtils {
	/* Both "development" and "dev" count. ecosystem.config.js sets the deployed
	   development app's NODE_ENV to "dev", so testing only "development" left
	   that environment with no stack traces and no debug output — silently, and
	   in the one place they are most wanted. */
	private static isDevelopment = ["development", "dev"].includes(
		getEnv().NODE_ENV,
	);

	/* JSON.stringify throws on a circular structure, and database driver errors
	   routinely carry one. Since this runs inside the 500 handler, letting it
	   throw would turn a handled error into an unhandled one with nothing
	   logged at all. */
	private static safeStringify(value: unknown): string {
		try {
			return JSON.stringify(value, null, 2) ?? String(value);
		} catch {
			return "[unserialisable]";
		}
	}
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
			errorMessage += `\nContext: ${this.safeStringify(context)}`;
		}

		if (error) {
			if (error instanceof Error) {
				errorMessage += `\nError Name: ${error.name}\nError Message: ${error.message}`;

				if (this.isDevelopment && error.stack) {
					errorMessage += `\nStack Trace:\n${error.stack}`;
				}
			} else {
				errorMessage += `\nError Details: ${this.safeStringify(error)}`;
			}
		}

		errorMessage += `\n${separator}`;

		this.logger.error(errorMessage);
	}

	static warn(message: string, context?: object): void {
		const timestamp = DateUtils.now().format("YYYY-MM-DD HH:mm:ss");
		let warnMessage = `[WARN] ${timestamp} - ${message}`;

		if (context) {
			warnMessage += `\nContext: ${this.safeStringify(context)}`;
		}

		this.logger.warn(warnMessage);
	}

	static info(message: string, context?: object): void {
		const timestamp = DateUtils.now().format("YYYY-MM-DD HH:mm:ss");
		let infoMessage = `[INFO] ${timestamp} - ${message}`;

		if (context) {
			infoMessage += `\nContext: ${this.safeStringify(context)}`;
		}

		this.logger.log(infoMessage);
	}

	static debug(message: string, context?: object): void {
		if (this.isDevelopment) {
			const timestamp = DateUtils.now().format("YYYY-MM-DD HH:mm:ss");
			let debugMessage = `[DEBUG] ${timestamp} - ${message}`;

			if (context) {
				debugMessage += `\nContext: ${this.safeStringify(context)}`;
			}

			this.logger.debug(debugMessage);
		}
	}
}

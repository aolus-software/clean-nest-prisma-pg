import { HttpException, UnprocessableEntityException } from "@nestjs/common";
import { LoggerUtils } from "@utils";
import { FastifyReply } from "fastify";
import { I18nContext } from "nestjs-i18n";

export class SuccessResponse<T> {
	constructor(
		readonly code: number,
		readonly success: boolean = true,
		readonly message: string = "Success",
		readonly data: T,
	) {}
}

export class ErrorResponse {
	constructor(
		readonly code: number,
		readonly success: boolean = false,
		readonly message: string,
		readonly data: null = null,
	) {}
}

export class ResponseHandler {
	static success<T>(
		statusCode: number,
		message: string = "Success",
		data: T,
	): SuccessResponse<T> {
		return new SuccessResponse(statusCode, true, message, data);
	}

	static error(statusCode: number, message: string): ErrorResponse {
		return new ErrorResponse(statusCode, false, message);
	}

	static handleError(res: FastifyReply, error: unknown): FastifyReply {
		const i18n = I18nContext.current();

		if (error instanceof HttpException) {
			if (error instanceof UnprocessableEntityException) {
				const response = this.error(
					422,
					i18n?.t("message.common.unprocessable_entity") ??
						"Unprocessable Entity",
				);
				return res.status(422).send({
					...response,
					...(error.getResponse() as Record<string, unknown>),
				});
			}

			const status = error.getStatus();
			const message = error.getResponse();

			if (message instanceof Object) {
				const msg = message as { message?: string; error?: string };
				return res
					.status(status)
					.send(
						this.error(
							status,
							msg.message ??
								msg.error ??
								i18n?.t("message.common.error") ??
								"An error occurred",
						),
					);
			}

			return res.status(status).send(this.error(status, String(message)));
		}

		LoggerUtils.error(`Internal server error`, error);

		return res
			.status(500)
			.send(
				this.error(
					500,
					i18n?.t("message.common.internal_error") ?? "Internal Server Error",
				),
			);
	}
}

// Backward compatibility exports
export const errorResponse = (res: FastifyReply, error: unknown) => {
	return ResponseHandler.handleError(res, error);
};

export function successResponse<T>(
	statusCode: number,
	message: string = "Success",
	data: T,
) {
	return ResponseHandler.success(statusCode, message, data);
}

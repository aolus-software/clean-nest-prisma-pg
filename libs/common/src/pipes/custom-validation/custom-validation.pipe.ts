import {
	Injectable,
	UnprocessableEntityException,
	ValidationError,
	ValidationPipe,
} from "@nestjs/common";
import { I18nContext } from "nestjs-i18n";

/* Validation pipe that translates class-validator messages inline using the
   active request language. DTOs declare their messages with
   i18nValidationMessage("validation.KEY"), which class-validator stores as the
   encoded string `key|{argsJson}`. The exceptionFactory resolves that key
   against I18nContext.current() (reliably available here because the pipe runs
   inside the request handler) and emits the project's 422 envelope, which
   ResponseHandler already understands. */
@Injectable()
export class CustomValidationPipe extends ValidationPipe {
	constructor() {
		super({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
			exceptionFactory: (errors: ValidationError[]) => {
				const formattedErrors = formatErrors(errors);
				const i18n = I18nContext.current();
				const fallback =
					i18n?.t("message.common.unprocessable_entity") ??
					"Unprocessable Entity";
				const firstMessage = Object.values(formattedErrors)[0]?.[0] || fallback;

				return new UnprocessableEntityException({
					statusCode: 422,
					message: firstMessage,
					data: null,
					errors: formattedErrors,
				});
			},
		});
	}
}

/* Resolves the encoded message produced by i18nValidationMessage from
   nestjs-i18n, which uses the format `key|JSON.stringify(args)`. The field name
   is injected as `property` so catalog entries can interpolate {property};
   falls back to the raw message when it is not an i18n key. */
function resolveMessage(raw: string, field: string): string {
	const i18n = I18nContext.current();

	const pipeIndex = raw.indexOf("|");
	if (pipeIndex === -1) {
		return raw;
	}

	const key = raw.slice(0, pipeIndex);
	const argsRaw = raw.slice(pipeIndex + 1);
	if (!key || !/^[\w.-]+$/.test(key)) {
		return raw;
	}

	let args: Record<string, unknown>;
	try {
		args = JSON.parse(argsRaw) as Record<string, unknown>;
	} catch {
		args = {};
	}

	return i18n?.t(key, { args: { property: field, field, ...args } }) ?? raw;
}

/* Flattens nested class-validator errors into a { field: [messages] } map,
   translating each constraint message and joining nested paths with a dot. */
function formatErrors(
	errors: ValidationError[],
	parentField = "",
): Record<string, string[]> {
	const formattedErrors: Record<string, string[]> = {};

	errors.forEach((error) => {
		const field = parentField
			? `${parentField}.${error.property}`
			: error.property;

		if (error.constraints) {
			formattedErrors[field] = Object.values(error.constraints).map((msg) =>
				resolveMessage(msg, field),
			);
		}

		if (error.children?.length) {
			const childErrors = formatErrors(error.children, field);
			Object.assign(formattedErrors, childErrors);
		}
	});

	return formattedErrors;
}

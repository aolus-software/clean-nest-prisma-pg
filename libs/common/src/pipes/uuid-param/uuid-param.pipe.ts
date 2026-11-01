import {
	Injectable,
	ParseUUIDPipe,
	UnprocessableEntityException,
} from "@nestjs/common";
import { I18nContext } from "nestjs-i18n";

/* Rejects a malformed `:id` with a 422 on `id` before it reaches Postgres,
   which would otherwise fail the uuid cast and surface as a 500. */
@Injectable()
export class UuidParamPipe extends ParseUUIDPipe {
	constructor() {
		super({
			exceptionFactory: () => {
				const message =
					I18nContext.current()?.t("validation.IS_UUID", {
						args: { property: "id" },
					}) ?? "The id field must be a valid UUID.";

				return new UnprocessableEntityException({
					message,
					data: null,
					error: { id: [message] },
				});
			},
		});
	}
}

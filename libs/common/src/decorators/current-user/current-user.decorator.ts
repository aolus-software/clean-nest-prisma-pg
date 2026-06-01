import {
	createParamDecorator,
	ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import { UserInformation } from "@repositories";
import { FastifyRequest } from "fastify";
import { I18nContext } from "nestjs-i18n";

export const CurrentUser = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): UserInformation => {
		const request: FastifyRequest = ctx.switchToHttp().getRequest();
		if (!request.user) {
			throw new UnauthorizedException(
				I18nContext.current()?.t("message.common.unauthorized") ??
					"Unauthorized",
			);
		}

		return request.user;
	},
);

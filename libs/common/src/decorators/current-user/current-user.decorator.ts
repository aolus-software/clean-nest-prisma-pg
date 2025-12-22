import {
	createParamDecorator,
	ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import { UserInformation } from "@repositories";
import { FastifyRequest } from "fastify";

export const CurrentUser = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): UserInformation => {
		const request: FastifyRequest = ctx.switchToHttp().getRequest();
		if (!request.user) {
			throw new UnauthorizedException("Unauthorized");
		}

		return request.user;
	},
);

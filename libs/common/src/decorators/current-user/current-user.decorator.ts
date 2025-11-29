import {
	createParamDecorator,
	ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import { UserInformation } from "@repositories";
import { Request } from "express";

export const CurrentUser = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): UserInformation => {
		const request: Request = ctx.switchToHttp().getRequest();
		if (!request.user) {
			throw new UnauthorizedException("Unauthorized");
		}

		return request.user;
	},
);

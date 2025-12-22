/* eslint-disable */
import {
	Injectable,
	ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard as AuthGuardPassport } from "@nestjs/passport";
import { FastifyRequest } from "fastify";

@Injectable()
export class AuthGuard extends AuthGuardPassport("jwt") {
	canActivate(context: ExecutionContext) {
		return super.canActivate(context);
	}

	handleRequest(err, user, info, context) {
		if (err || !user) {
			throw err || new UnauthorizedException("Unauthorized");
		}
		const request: FastifyRequest = context.switchToHttp().getRequest();
		request.user = user;
		return user;
	}
}

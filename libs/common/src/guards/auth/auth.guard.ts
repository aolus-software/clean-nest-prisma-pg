import {
	Injectable,
	ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard as AuthGuardPassport } from "@nestjs/passport";
import { FastifyRequest } from "fastify";
import { UserInformation } from "@repositories";
import { I18nContext } from "nestjs-i18n";
import { Observable } from "rxjs";

@Injectable()
export class AuthGuard extends AuthGuardPassport("jwt") {
	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		return super.canActivate(context);
	}

	handleRequest<TUser = UserInformation>(
		err: unknown,
		user: TUser | false,
		_info: unknown,
		context: ExecutionContext,
	): TUser {
		if (err instanceof Error) {
			throw err;
		}

		if (!user) {
			throw new UnauthorizedException(
				I18nContext.current()?.t("message.common.unauthorized") ??
					"Unauthorized",
			);
		}
		const request: FastifyRequest = context.switchToHttp().getRequest();
		request.user = user as unknown as UserInformation;
		return user;
	}
}

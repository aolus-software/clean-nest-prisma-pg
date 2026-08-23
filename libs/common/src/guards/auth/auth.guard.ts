import {
	Injectable,
	ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard as AuthGuardPassport } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../../decorators/public/public.decorator";
import { FastifyRequest } from "fastify";
import { UserInformation } from "@repositories";
import { I18nContext } from "nestjs-i18n";
import { Observable } from "rxjs";

@Injectable()
export class AuthGuard extends AuthGuardPassport("jwt") {
	constructor(private readonly reflector: Reflector) {
		super();
	}

	/* Registered as an APP_GUARD, so this runs on every route. A route opts out
	   only by carrying @Public() on the handler or its controller. */
	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

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

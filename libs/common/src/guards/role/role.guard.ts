import {
	CanActivate,
	ExecutionContext,
	Injectable,
	ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserInformation } from "@repositories/repositories";
import { FastifyRequest } from "fastify";
import { I18nContext } from "nestjs-i18n";

@Injectable()
export class RoleGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		/* Read the handler first and fall back to the controller class, so a
		   class-level @RoleAuth gates every method on it. Reading only
		   getHandler() silently ignores a class-level declaration. */
		const requiredRoles = this.reflector.getAllAndOverride<string[]>("roles", [
			context.getHandler(),
			context.getClass(),
		]);

		if (!requiredRoles) {
			return true;
		}

		const request: FastifyRequest = context.switchToHttp().getRequest();
		const user: UserInformation = request.user;
		if (!user || !user.roles) {
			throw new ForbiddenException(
				I18nContext.current()?.t("message.common.access_denied") ??
					"Access denied",
			);
		}

		if (user.roles.some((role) => role.name === "superuser")) {
			return true;
		}

		/* Holding any one of the listed roles is enough — unlike permissions,
		   which are conjunctive. See .claude/rules/rbac.md. */
		const hasRole = requiredRoles.some((role) =>
			user.roles.some((userRole) => userRole.name === role),
		);

		if (!hasRole) {
			throw new ForbiddenException(
				I18nContext.current()?.t("message.common.insufficient_permission") ??
					"Insufficient permissions",
			);
		}

		return true;
	}
}

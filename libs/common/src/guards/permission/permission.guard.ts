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
export class PermissionGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		/* Read the handler first and fall back to the controller class, so a
		   class-level @PermissionAuth gates every method on it. Reading only
		   getHandler() silently ignores a class-level declaration: the guard
		   finds no metadata and allows the request. */
		const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
			"permissions",
			[context.getHandler(), context.getClass()],
		);

		if (!requiredPermissions) {
			return true;
		}

		const request: FastifyRequest = context.switchToHttp().getRequest();
		const user: UserInformation = request.user;
		if (!user || !user.roles || !user.permissions) {
			throw new ForbiddenException(
				I18nContext.current()?.t("message.common.access_denied") ??
					"Access denied",
			);
		}

		if (user.roles.some((role) => role.name === "superuser")) {
			return true;
		}

		/* Every listed permission is required. A route naming two permissions
		   means both, not either. */
		const hasPermission = requiredPermissions.every((permission) =>
			user.permissions.includes(permission),
		);

		if (!hasPermission) {
			throw new ForbiddenException(
				I18nContext.current()?.t("message.common.insufficient_permission") ??
					"Insufficient permissions",
			);
		}

		return true;
	}
}

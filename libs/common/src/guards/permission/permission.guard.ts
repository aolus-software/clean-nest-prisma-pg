import {
	CanActivate,
	ExecutionContext,
	Injectable,
	ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserInformation } from "@repositories/repositories";
import { FastifyRequest } from "fastify";

@Injectable()
export class PermissionGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredPermissions = this.reflector.get<string[]>(
			"permissions",
			context.getHandler(),
		);

		if (!requiredPermissions) {
			return true;
		}

		const request: FastifyRequest = context.switchToHttp().getRequest();
		const user: UserInformation = request.user;
		if (!user || !user.roles) {
			throw new ForbiddenException("Access denied");
		}

		if (user.roles.some((role) => role.name === "superuser")) {
			return true;
		}

		const hasPermission = requiredPermissions.some((permission) =>
			user.roles.some((userRole) => userRole.name === permission),
		);

		if (!hasPermission) {
			throw new ForbiddenException("Insufficient permissions");
		}

		return true;
	}
}

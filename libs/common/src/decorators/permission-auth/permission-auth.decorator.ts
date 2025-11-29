import { SetMetadata } from "@nestjs/common";

export const PermissionAuth = (...args: string[]) =>
	SetMetadata("permissions", args);

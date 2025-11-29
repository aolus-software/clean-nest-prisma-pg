import { SetMetadata } from "@nestjs/common";

export const RoleAuth = (...args: string[]) => SetMetadata("roles", args);

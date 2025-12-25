import { Module } from "@nestjs/common";
import { PermissionsModule } from "./permissions/permissions.module";
import { RolesModule } from "./roles/roles.module";
import { UsersModule } from "./users/users.module";
import { RouterModule } from "@nestjs/core";

@Module({
	imports: [
		PermissionsModule,
		RolesModule,
		UsersModule,
		RouterModule.register([
			{
				path: "settings",
				module: UsersModule,
			},
			{
				path: "settings",
				module: RolesModule,
			},
			{
				path: "settings",
				module: PermissionsModule,
			},
		]),
	],
	controllers: [],
	providers: [],
})
export class SettingsModule {}

import { Module } from "@nestjs/common";
import { PermissionsModule } from "./permissions/permissions.module";

@Module({
	imports: [PermissionsModule],
	controllers: [],
	providers: [],
})
export class SettingsModule {}

import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { AuthModule } from "./auth/auth.module";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import * as jwt from "jsonwebtoken";
import {
	AuthGuard,
	AuthStrategy,
	CommonModule,
	PermissionGuard,
	RoleGuard,
	ThrottlerModule,
} from "@common";
import { PrismaService } from "@repositories";
import { SettingsModule } from "./settings/settings.module";
import { HealthModule } from "./health/health.module";
import { getEnv } from "@config";

@Module({
	imports: [
		ServeStaticModule.forRoot({
			rootPath: join(__dirname, "..", "/storage/"),
		}),
		PassportModule.register({ defaultStrategy: "jwt" }),
		JwtModule.register({
			secret: getEnv().JWT_SECRET,
			signOptions: {
				expiresIn: getEnv().JWT_EXPIRES_IN,
			} as jwt.SignOptions,
		}),

		CommonModule,
		ThrottlerModule,

		AuthModule,
		HealthModule,
		SettingsModule,
	],
	controllers: [AppController],
	/* Guard order is the registration order, and it is load-bearing: AuthGuard
	   must populate request.user before the two RBAC guards read it. Registering
	   them globally means a new controller is protected by default — a route
	   opts out with @Public(), never by omission. */
	providers: [
		AuthStrategy,
		PrismaService,
		{ provide: APP_GUARD, useClass: AuthGuard },
		{ provide: APP_GUARD, useClass: PermissionGuard },
		{ provide: APP_GUARD, useClass: RoleGuard },
	],
})
export class AppModule {}

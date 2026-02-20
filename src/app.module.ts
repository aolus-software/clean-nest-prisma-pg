import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { AuthModule } from "./auth/auth.module";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import * as jwt from "jsonwebtoken";
import { AuthStrategy, CommonModule, ThrottlerModule } from "@common";
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
	providers: [AuthStrategy, PrismaService],
})
export class AppModule {}

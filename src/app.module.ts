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

@Module({
	imports: [
		ServeStaticModule.forRoot({
			rootPath: join(__dirname, "..", "/storage/"),
		}),
		PassportModule.register({ defaultStrategy: "jwt" }),
		JwtModule.register({
			secret: process.env.JWT_SECRET || "default-secret",
			signOptions: {
				expiresIn: process.env.JWT_EXPIRATION || "1d",
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

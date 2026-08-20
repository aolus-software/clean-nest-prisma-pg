import { Module } from "@nestjs/common";
import {
	ThrottlerModule as NodeThrottlerModule,
	seconds,
	ThrottlerGuard,
} from "@nestjs/throttler";
import { getEnv } from "@config";
import { APP_GUARD } from "@nestjs/core";

@Module({
	imports: [
		NodeThrottlerModule.forRoot({
			throttlers: [
				{
					ttl: seconds(getEnv().THROTTLER_TTL),
					limit: getEnv().THROTTLER_LIMIT,
				},
			],
		}),
	],

	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
	],
})
export class ThrottlerModule {}

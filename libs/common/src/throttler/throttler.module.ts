import { Module } from "@nestjs/common";
import {
	ThrottlerModule as NodeThrottlerModule,
	seconds,
} from "@nestjs/throttler";
import { getEnv } from "@config";

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

	exports: [ThrottlerModule],
})
export class ThrottlerModule {}

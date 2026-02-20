import { Global, Module } from "@nestjs/common";
import { CacheModule as NestCacheManager } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-ioredis-yet";
import { CacheService } from "./cache.service";
import { getEnv } from "@config";

@Global()
@Module({
	imports: [
		NestCacheManager.registerAsync({
			useFactory: () => {
				const env = getEnv();
				return {
					store: redisStore,
					host: env.REDIS_HOST,
					port: env.REDIS_PORT,
					password: env.REDIS_PASSWORD || undefined,
					ttl: env.REDIS_TTL * 1000,
				};
			},
		}),
	],
	providers: [CacheService],
	exports: [CacheService],
})
export class CacheModule {}

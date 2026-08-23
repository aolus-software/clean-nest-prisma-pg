import { Global, Module } from "@nestjs/common";
import { CacheModule as NestCacheManager } from "@nestjs/cache-manager";
import KeyvRedis from "@keyv/redis";
import Keyv from "keyv";
import { CacheService } from "./cache.service";
import { getEnv } from "@config";

/* cache-manager v7 is Keyv-based and takes a `stores` array. The v5-era shape
   this module used before — { store: redisStore, host, port } — is not an error
   in v7, it is silently ignored, so the cache fell back to an in-process memory
   store: nothing was ever written to Redis. That matters under PM2, which runs
   `instances: "max"` in production, because each worker then holds its own copy
   and an invalidation on one worker leaves the others serving stale roles and
   permissions. */
const redisUrl = (): string => {
	const password = getEnv().REDIS_PASSWORD;
	const credentials = password ? `:${encodeURIComponent(password)}@` : "";
	return `redis://${credentials}${getEnv().REDIS_HOST}:${getEnv().REDIS_PORT}`;
};

@Global()
@Module({
	imports: [
		NestCacheManager.registerAsync({
			useFactory: () => ({
				stores: [
					new Keyv({
						store: new KeyvRedis(redisUrl()),
						namespace: undefined,
						useKeyPrefix: false,
					}),
				],
				ttl: getEnv().REDIS_TTL * 1000,
			}),
		}),
	],
	providers: [CacheService],
	exports: [CacheService],
})
export class CacheModule {}

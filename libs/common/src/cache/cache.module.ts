import { Global, Module } from "@nestjs/common";
import {
	type CacheManagerOptions,
	CacheModule as NestCacheManager,
} from "@nestjs/cache-manager";
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

/* @nestjs/cache-manager is an ES module, so its option types can see keyv's
   ESM declarations while this file sees the CJS ones — or the reverse under
   ts-node, which the seeder runs through. Both describe the same runtime
   class, so the store is typed from cache-manager's own options type, which
   matches under either module resolution. */
type CacheStore = Extract<
	NonNullable<CacheManagerOptions["stores"]>,
	unknown[]
>[number];

const redisStore = (): CacheStore =>
	new Keyv({
		store: new KeyvRedis(redisUrl()),
		namespace: undefined,
		useKeyPrefix: false,
	}) as unknown as CacheStore;

@Global()
@Module({
	imports: [
		NestCacheManager.registerAsync({
			useFactory: () => ({
				stores: [redisStore()],
				ttl: getEnv().REDIS_TTL * 1000,
			}),
		}),
	],
	providers: [CacheService],
	exports: [CacheService],
})
export class CacheModule {}

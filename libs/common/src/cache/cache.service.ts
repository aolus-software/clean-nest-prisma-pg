import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { getEnv } from "@config";

@Injectable()
export class CacheService {
	constructor(@Inject(CACHE_MANAGER) private _cacheManager: Cache) {}

	/* ttl is in SECONDS, converted to the milliseconds cache-manager expects —
	   the same conversion CacheModule applies to its store-wide default. Passing
	   the seconds value straight through expired every entry after 3.6 seconds
	   instead of an hour. Uses ?? so an explicit 0 is honoured rather than being
	   treated as "not supplied". */
	async set<T>(key: string, value: T, ttl: number | null): Promise<void> {
		const ttlSeconds = ttl ?? getEnv().REDIS_TTL;
		await this._cacheManager.set(key, value, ttlSeconds * 1000);
	}

	async get<T>(key: string): Promise<T | undefined> {
		return await this._cacheManager.get<T>(key);
	}

	async del(key: string): Promise<void> {
		await this._cacheManager.del(key);
	}
}

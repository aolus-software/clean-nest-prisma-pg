import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { getEnv } from "@config";

@Injectable()
export class CacheService {
	constructor(@Inject(CACHE_MANAGER) private _cacheManager: Cache) {}

	async set<T>(key: string, value: T, ttl: number | null): Promise<void> {
		const ttlValue = ttl ? ttl : getEnv().REDIS_TTL;
		await this._cacheManager.set(key, value, ttlValue);
	}

	async get<T>(key: string): Promise<T | undefined> {
		return await this._cacheManager.get<T>(key);
	}

	async del(key: string): Promise<void> {
		await this._cacheManager.del(key);
	}
}

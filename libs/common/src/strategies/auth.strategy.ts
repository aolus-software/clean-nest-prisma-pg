import { CacheService } from "@common/cache/cache.service";
import { UserCache } from "@common/cache/const";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import {
	UserInformation,
	UserRepository,
} from "@repositories/repositories/user.repository";
import { JWTPayload } from "@utils";
import { Strategy, ExtractJwt } from "passport-jwt";

@Injectable()
export class AuthStrategy extends PassportStrategy(Strategy, "jwt") {
	constructor(private readonly _cacheService: CacheService) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		super({
			// eslint-disable-next-line
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: process.env.JWT_SECRET || "default-secret",
		});
	}

	async validate(payload: JWTPayload): Promise<UserInformation> {
		let user: UserInformation | null | undefined =
			await this._cacheService.get<UserInformation>(UserCache(payload.sub));
		if (!user) {
			user = await UserRepository().userInformation(payload.sub);
			if (!user) {
				throw new UnauthorizedException("User not found");
			}
			await this._cacheService.set(UserCache(payload.sub), user, null);
		}

		return user;
	}
}

import * as jwt from "jsonwebtoken";
import { getEnv } from "@config";

export type JWTTokenType = "access" | "refresh";

export interface JWTPayload {
	sub: string;
	type?: JWTTokenType;
	jti?: string;
	iat?: number;
	exp?: number;
}

export class JWTUtils {
	private static readonly secret = getEnv().JWT_SECRET;
	private static readonly refreshSecret = getEnv().JWT_REFRESH_SECRET;
	private static readonly expiresIn = getEnv().JWT_EXPIRES_IN;
	private static readonly refreshExpiresIn = getEnv().JWT_REFRESH_EXPIRES_IN;

	static generateAccessToken(
		payload: Omit<JWTPayload, "type" | "iat" | "exp">,
	): string {
		return jwt.sign(
			{ ...payload, type: "access" },
			this.secret as jwt.Secret,
			{
				expiresIn: this.expiresIn,
			} as jwt.SignOptions,
		);
	}

	static generateRefreshToken(payload: { sub: string; jti: string }): string {
		return jwt.sign(
			{ ...payload, type: "refresh" },
			this.refreshSecret as jwt.Secret,
			{
				expiresIn: this.refreshExpiresIn,
			} as jwt.SignOptions,
		);
	}

	/* Each verifier also checks the `type` claim, so a token is only ever
	   accepted for the purpose it was minted for, even if the two secrets are
	   ever configured to the same value. */
	static verifyAccessToken(token: string): JWTPayload {
		let payload: JWTPayload;
		try {
			payload = jwt.verify(token, this.secret) as JWTPayload;
		} catch {
			throw new Error("Invalid access token");
		}
		if (payload.type !== "access") {
			throw new Error("Invalid access token");
		}
		return payload;
	}

	static verifyRefreshToken(token: string): JWTPayload {
		let payload: JWTPayload;
		try {
			payload = jwt.verify(token, this.refreshSecret) as JWTPayload;
		} catch {
			throw new Error("Invalid refresh token");
		}
		if (payload.type !== "refresh") {
			throw new Error("Invalid refresh token");
		}
		return payload;
	}

	static decodeToken(token: string): JWTPayload | null {
		try {
			return jwt.decode(token) as JWTPayload;
		} catch {
			return null;
		}
	}
}

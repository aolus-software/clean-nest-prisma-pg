import * as jwt from "jsonwebtoken";
import { getEnv } from "@config";

export interface JWTPayload {
	sub: string;
	iat?: number;
	exp?: number;
}

export class JWTUtils {
	private static readonly secret = getEnv().JWT_SECRET;
	private static readonly refreshSecret = getEnv().JWT_REFRESH_SECRET;
	private static readonly expiresIn = getEnv().JWT_EXPIRES_IN;
	private static readonly refreshExpiresIn = getEnv().JWT_REFRESH_EXPIRES_IN;

	static generateAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
		return jwt.sign(
			payload,
			this.secret as jwt.Secret,
			{
				expiresIn: this.expiresIn,
			} as jwt.SignOptions,
		);
	}

	static generateRefreshToken(
		payload: Omit<JWTPayload, "iat" | "exp">,
	): string {
		return jwt.sign(
			payload,
			this.refreshSecret as jwt.Secret,
			{
				expiresIn: this.refreshExpiresIn,
			} as jwt.SignOptions,
		);
	}

	static verifyAccessToken(token: string): JWTPayload {
		try {
			return jwt.verify(token, this.secret) as JWTPayload;
		} catch {
			throw new Error("Invalid access token");
		}
	}

	static verifyRefreshToken(token: string): JWTPayload {
		try {
			return jwt.verify(token, this.refreshSecret) as JWTPayload;
		} catch {
			throw new Error("Invalid refresh token");
		}
	}

	static decodeToken(token: string): JWTPayload | null {
		try {
			return jwt.decode(token) as JWTPayload;
		} catch {
			return null;
		}
	}
}

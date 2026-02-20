import { cleanEnv, str, num, port, bool } from "envalid";

interface IEnvConfig {
	APP_NAME: string;
	APP_VERSION: string;
	APP_SECRET: string;
	APP_PORT: number;
	APP_URL: string;
	APP_TIMEZONE: string;
	NODE_ENV: "development" | "production" | "test";

	FRONTEND_URL: string;

	DATABASE_URL: string;

	JWT_SECRET: string;
	JWT_REFRESH_SECRET: string;
	JWT_EXPIRES_IN: string;
	JWT_REFRESH_EXPIRES_IN: string;

	THROTTLER_TTL: number;
	THROTTLER_LIMIT: number;

	ALLOWED_ORIGINS: string[];
	ALLOWED_METHODS: string[];
	ALLOWED_HEADERS: string[];
	MAX_AGE: number;
	CREDENTIALS: boolean;

	REDIS_HOST: string;
	REDIS_PORT: number;
	REDIS_PASSWORD?: string;
	REDIS_TTL: number;

	MAIL_HOST: string;
	MAIL_PORT: number;
	MAIL_SECURE: boolean;
	MAIL_USERNAME: string;
	MAIL_PASSWORD: string;
	MAIL_FROM: string;
	MAIL_DEFAULT_SUBJECT: string;
}

let _cachedEnv: IEnvConfig | null = null;

export function getEnv(): IEnvConfig {
	if (_cachedEnv) return _cachedEnv;

	const env = cleanEnv(process.env, {
		APP_NAME: str({ default: "clean nest" }),
		APP_VERSION: str({ default: "1.0.0" }),
		APP_SECRET: str(),
		APP_PORT: port({ default: 8002 }),
		APP_URL: str({ default: "localhost:8002" }),
		APP_TIMEZONE: str({ default: "UTC" }),
		NODE_ENV: str({
			choices: ["development", "production", "test"],
			default: "development",
		}),

		FRONTEND_URL: str({ default: "http://localhost:3000" }),

		DATABASE_URL: str(),

		JWT_SECRET: str(),
		JWT_REFRESH_SECRET: str(),
		JWT_EXPIRES_IN: str({ default: "1d" }),
		JWT_REFRESH_EXPIRES_IN: str({ default: "7d" }),

		THROTTLER_TTL: num({ default: 60 }),
		THROTTLER_LIMIT: num({ default: 60 }),

		ALLOWED_ORIGINS: str({ default: "*" }),
		ALLOWED_METHODS: str({ default: "GET,POST,PUT,PATCH,DELETE,OPTIONS" }),
		ALLOWED_HEADERS: str({ default: "Content-Type,Authorization" }),
		MAX_AGE: num({ default: 3600 }),
		CREDENTIALS: bool({ default: false }),

		REDIS_HOST: str({ default: "localhost" }),
		REDIS_PORT: port({ default: 6379 }),
		REDIS_PASSWORD: str({ default: "" }),
		REDIS_TTL: num({ default: 3600 }),

		MAIL_HOST: str(),
		MAIL_PORT: port(),
		MAIL_SECURE: bool({ default: false }),
		MAIL_USERNAME: str(),
		MAIL_PASSWORD: str(),
		MAIL_FROM: str({ default: "" }),
		MAIL_DEFAULT_SUBJECT: str({ default: "Clean Nest" }),
	});

	_cachedEnv = {
		APP_NAME: env.APP_NAME,
		APP_VERSION: env.APP_VERSION,
		APP_SECRET: env.APP_SECRET,
		APP_PORT: env.APP_PORT,
		APP_URL: env.APP_URL,
		APP_TIMEZONE: env.APP_TIMEZONE,
		NODE_ENV: env.NODE_ENV,

		FRONTEND_URL: env.FRONTEND_URL,

		DATABASE_URL: env.DATABASE_URL,

		JWT_SECRET: env.JWT_SECRET,
		JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
		JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
		JWT_REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN,

		THROTTLER_TTL: env.THROTTLER_TTL,
		THROTTLER_LIMIT: env.THROTTLER_LIMIT,

		ALLOWED_ORIGINS: env.ALLOWED_ORIGINS.split(",").map((origin) =>
			origin.trim(),
		),
		ALLOWED_METHODS: env.ALLOWED_METHODS.split(",").map((method) =>
			method.trim(),
		),
		ALLOWED_HEADERS: env.ALLOWED_HEADERS.split(",").map((header) =>
			header.trim(),
		),
		MAX_AGE: env.MAX_AGE,
		CREDENTIALS: env.CREDENTIALS,

		REDIS_HOST: env.REDIS_HOST,
		REDIS_PORT: env.REDIS_PORT,
		REDIS_PASSWORD: env.REDIS_PASSWORD,
		REDIS_TTL: env.REDIS_TTL,

		MAIL_HOST: env.MAIL_HOST,
		MAIL_PORT: env.MAIL_PORT,
		MAIL_SECURE: env.MAIL_SECURE,
		MAIL_USERNAME: env.MAIL_USERNAME,
		MAIL_PASSWORD: env.MAIL_PASSWORD,
		MAIL_FROM: env.MAIL_FROM,
		MAIL_DEFAULT_SUBJECT: env.MAIL_DEFAULT_SUBJECT,
	};

	return _cachedEnv;
}

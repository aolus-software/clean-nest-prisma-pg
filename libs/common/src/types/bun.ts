declare module "bun" {
	interface Env {
		APP_NAME: string;
		APP_SECRET: string;
		APP_PORT: number;
		APP_URL: string;
		APP_TIMEZONE: string;

		FRONTEND_URL: string;

		DATABASE_URL: string;

		JWT_SECRET: string;
		JWT_REFRESH_SECRET: string;
		JWT_EXPIRES_IN: string;
		JWT_REFRESH_EXPIRES_IN: string;

		THROTTLER_TTL: number;
		THROTTLER_LIMIT: number;

		ALLOWED_ORIGINS: string;
		ALLOWED_METHODS: string;
		ALLOWED_HEADERS: string;
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
}

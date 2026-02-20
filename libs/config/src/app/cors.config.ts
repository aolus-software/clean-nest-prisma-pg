import { getEnv } from "../env";

interface ICorsConfig {
	origin: string[];
	methods: string[];
	allowedHeaders: string[];
	maxAge: number;
	credentials: boolean;
}

export const CorsConfig: ICorsConfig = {
	origin: getEnv().ALLOWED_ORIGINS,
	methods: getEnv().ALLOWED_METHODS,
	allowedHeaders: getEnv().ALLOWED_HEADERS,
	maxAge: getEnv().MAX_AGE,
	credentials: getEnv().CREDENTIALS,
};

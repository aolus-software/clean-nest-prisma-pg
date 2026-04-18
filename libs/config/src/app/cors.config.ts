import { getEnv } from "../env";

interface ICorsConfig {
	origin: string | string[];
	methods: string[];
	allowedHeaders: string[];
	maxAge: number;
	credentials: boolean;
}

const isAllowWildCard = getEnv().ALLOWED_ORIGINS.includes("*");

export const CorsConfig: ICorsConfig = {
	origin: isAllowWildCard ? "*" : getEnv().ALLOWED_ORIGINS,
	methods: getEnv().ALLOWED_METHODS,
	allowedHeaders: getEnv().ALLOWED_HEADERS,
	maxAge: getEnv().MAX_AGE,
	credentials: getEnv().CREDENTIALS,
};

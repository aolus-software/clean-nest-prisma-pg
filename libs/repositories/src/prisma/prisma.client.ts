import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { getEnv } from "@config";
import { LoggerUtils } from "@utils";

/* The one PrismaClient, and so the one pg pool, for the process. The exported
   `prisma` singleton and PrismaService both hand out this instance; a second
   `new PrismaClient` opens a second pool and doubles the connection count.
   With DB_LOG_QUERIES on, each statement is logged at debug level with its
   text and duration only: parameters carry password hashes and tokens. */
const adapter = new PrismaPg({
	connectionString: getEnv().DATABASE_URL,
	max: getEnv().DB_POOL_MAX,
	idleTimeoutMillis: getEnv().DB_POOL_IDLE_TIMEOUT_MS,
	connectionTimeoutMillis: getEnv().DB_POOL_CONNECTION_TIMEOUT_MS,
});

const queryLog: Prisma.LogDefinition[] = getEnv().DB_LOG_QUERIES
	? [{ emit: "event", level: "query" }]
	: [];

export const prisma = new PrismaClient<Prisma.PrismaClientOptions, "query">({
	adapter,
	log: queryLog,
});

if (getEnv().DB_LOG_QUERIES) {
	prisma.$on("query", (event: Prisma.QueryEvent) => {
		LoggerUtils.debug("db query", {
			query: event.query,
			durationMs: event.duration,
		});
	});
}

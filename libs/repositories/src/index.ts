import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getEnv } from "@config";

export * from "./repositories.module";
export * from "./repositories.service";
export * from "./prisma/prisma.service";
export * from "./repositories/index";

const adapter = new PrismaPg({
	connectionString: getEnv().DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });

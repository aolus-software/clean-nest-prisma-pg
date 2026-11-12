import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { prisma } from "./prisma.client";

/* Lifecycle wrapper around the shared `prisma` client: connects it at boot and
   closes its pool on shutdown. `client` returns that same instance, never a
   new one, so the process keeps a single connection pool. */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
	async onModuleInit(): Promise<void> {
		await prisma.$connect();
	}

	async onModuleDestroy(): Promise<void> {
		await prisma.$disconnect();
	}

	get client(): typeof prisma {
		return prisma;
	}
}

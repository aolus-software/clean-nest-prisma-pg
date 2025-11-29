import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
	private adapter = new PrismaPg({
		connectionString: process.env.DATABASE_URL || "",
	});

	constructor() {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL environment variable is not set.");
		}
	}

	private prisma = new PrismaClient({ adapter: this.adapter });
	async onModuleInit() {
		await this.prisma.$connect();
	}

	async onModuleDestroy() {
		await this.prisma.$disconnect();
	}

	get client() {
		return this.prisma;
	}
}

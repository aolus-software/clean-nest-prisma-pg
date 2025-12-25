import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
	HealthCheck,
	HealthCheckService,
	MemoryHealthIndicator,
	PrismaHealthIndicator,
} from "@nestjs/terminus";
import { prisma } from "@repositories";

@Controller("health")
@ApiTags("Health")
export class HealthController {
	constructor(
		private health: HealthCheckService,
		private db: PrismaHealthIndicator,
		private memory: MemoryHealthIndicator,
	) {}

	@Get()
	@HealthCheck()
	check() {
		return this.health.check([
			() => this.db.pingCheck("database", prisma),
			() => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),
		]);
	}

	@Get("live")
	liveness() {
		return { status: "ok" };
	}
}

import { Module } from "@nestjs/common";
import { RepositoriesService } from "./repositories.service";
import { PrismaService } from "./prisma/prisma.service";

@Module({
	providers: [RepositoriesService, PrismaService],
	exports: [RepositoriesService, PrismaService],
})
export class RepositoriesModule {}

import { PrismaService } from "@repositories";
import { seedPermissions } from "./permission.seed";
import { seedRoles } from "./role.seed";
import { seedUsers } from "./user.seed";

async function seed() {
	const prismaService = new PrismaService();

	await seedPermissions(prismaService.client);
	await seedRoles(prismaService.client);
	await seedUsers(prismaService.client);
}

seed()
	.then(() => {
		console.log("Seeding completed.");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Seeding failed:", error);
		process.exit(1);
	});

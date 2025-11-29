import { PrismaClient } from "@prisma/client";

export async function seedPermissions(prisma: PrismaClient) {
	const groups = ["user", "role", "permission"];
	const actions = ["list", "create", "view", "update", "delete", "restore"];

	for (const group of groups) {
		for (const action of actions) {
			const permissionName = `${group}:${action}`;
			await prisma.permission.upsert({
				where: { name: permissionName },
				update: {},
				create: { name: permissionName, group },
			});
		}
	}
}

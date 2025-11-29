import { PrismaClient } from "@prisma/client";

export async function seedRoles(prisma: PrismaClient) {
	const roleNames = ["superuser", "admin", "user"];
	for (const name of roleNames) {
		await prisma.role.upsert({
			where: { name },
			update: {},
			create: { name },
		});

		if (name === "superuser" || name === "admin") {
			const allPermissions = await prisma.permission.findMany();
			const role = await prisma.role.findUnique({ where: { name } });
			if (role) {
				for (const permission of allPermissions) {
					const existtingPermission = await prisma.rolePermission.findFirst({
						where: {
							roleId: role.id,
							permissionId: permission.id,
						},
					});

					if (!existtingPermission) {
						await prisma.rolePermission.create({
							data: {
								roleId: role.id,
								permissionId: permission.id,
							},
						});
					}
				}
			}
		}
	}

	console.log("Role seeding completed.");
}

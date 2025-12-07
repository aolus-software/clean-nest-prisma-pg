import { PrismaClient } from "@prisma/client";
import { DateUtils, HashUtils } from "@utils";

export async function seedUsers(prisma: PrismaClient) {
	const userNames = ["superuser", "admin", "user"];

	for (const name of userNames) {
		const ifUserExist = await prisma.user.findFirst({
			where: { email: `${name}@example.com` },
		});

		if (ifUserExist) {
			continue;
		}

		const user = await prisma.user.create({
			data: {
				name: name,
				email: `${name}@example.com`,
				password: await HashUtils.generateHash("S3crEtP4ssw0rd!"),
				emailVerifiedAt: DateUtils.now().toDate(),
				status: "ACTIVE",
			},
		});

		const role = await prisma.role.findUnique({
			where: { name },
		});

		if (role) {
			const isRoleAssigned = await prisma.userRole.findFirst({
				where: {
					userId: user.id,
					roleId: role.id,
				},
			});

			if (!isRoleAssigned) {
				await prisma.userRole.create({
					data: {
						userId: user.id,
						roleId: role.id,
					},
				});
			}
		}
	}

	console.log("User seeding completed.");
}

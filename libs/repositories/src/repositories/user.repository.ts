import { Prisma } from "@prisma/client";
import { prisma } from "@repositories";

export interface UserInformation {
	id: string;
	email: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
	roles: {
		name: string;
		permissions: string[];
	}[];
	permissions: string[];
}

export function UserRepository(tx?: Prisma.TransactionClient) {
	const db = tx || prisma;

	return {
		user: db.user,

		async findByMail(email: string): Promise<{
			id: string;
			email: string;
			name: string;
			password: string;
			emailVerifiedAt: Date | null;
			createdAt: Date;
			updatedAt: Date;
		} | null> {
			return db.user.findFirst({
				where: { email, deletedAt: null },
				select: {
					id: true,
					email: true,
					name: true,
					password: true,
					emailVerifiedAt: true,
					createdAt: true,
					updatedAt: true,
				},
			});
		},

		async userInformation(userId: string): Promise<UserInformation | null> {
			const user = await db.user.findUnique({
				where: { id: userId, deletedAt: null, emailVerifiedAt: { not: null } },
				select: {
					id: true,
					email: true,
					name: true,
					createdAt: true,
					updatedAt: true,
					roles: {
						select: {
							role: {
								select: {
									name: true,
									permissions: {
										select: {
											permission: {
												select: {
													name: true,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			});

			if (!user) {
				return null;
			}

			const roles = user.roles.map((userRole) => ({
				name: userRole.role.name,
				permissions: userRole.role.permissions.map((rp) => rp.permission.name),
			}));

			const permissionsSet = new Set<string>();
			roles.forEach((role) => {
				role.permissions.forEach((permission) => {
					permissionsSet.add(permission);
				});
			});

			return {
				id: user.id,
				email: user.email,
				name: user.name,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				roles,
				permissions: Array.from(permissionsSet),
			};
		},
	};
}

import { DatatableType, PaginationResponse } from "@common";
import { BadRequestException } from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "@repositories";
import { DateUtils } from "@utils";

export interface UserInformation {
	id: string;
	email: string;
	name: string;
	status: UserStatus;
	createdAt: Date;
	updatedAt: Date;
	roles: {
		name: string;
		permissions: string[];
	}[];
	permissions: string[];
}

export interface UserList {
	id: string;
	email: string;
	name: string;
	status: UserStatus;
	createdAt: Date;
	updatedAt: Date;
	roles: {
		id: string;
		name: string;
	}[];
}

export type UserDetail = Required<UserList>;

export function UserRepository(tx?: Prisma.TransactionClient) {
	const db = tx || prisma;

	return {
		user: db.user,

		async findAll(
			queryParam: DatatableType,
		): Promise<PaginationResponse<UserList>> {
			const { page, limit, search, sort, sortDirection } = queryParam;
			const finalLimit = Number(limit);
			const finalPage = Number(page);

			const allowedSort = [
				"id",
				"name",
				"email",
				"status",
				"createdAt",
				"updatedAt",
			];
			const sortDirectionAllowed = ["asc", "desc"];
			const allowedFilter = [
				"id",
				"name",
				"email",
				"status",
				"roles",
				"createdAt",
				"updatedAt",
			];

			if (!allowedSort.includes(sort)) {
				throw new BadRequestException("Invalid sort field");
			}

			if (!sortDirectionAllowed.includes(sortDirection)) {
				throw new BadRequestException("Invalid sort direction");
			}

			if (queryParam.filter) {
				const filterKeys = Object.keys(queryParam.filter);
				for (const key of filterKeys) {
					if (!allowedFilter.includes(key)) {
						throw new BadRequestException("Invalid filter field");
					}
				}
			}

			let whereCondition: Prisma.UserWhereInput = { deletedAt: null };
			if (search) {
				whereCondition = {
					...whereCondition,
					AND: [
						{
							OR: [
								{ name: { contains: search, mode: "insensitive" } },
								{ email: { contains: search, mode: "insensitive" } },
							],
						},
					],
				};
			}

			let filterCondition: Prisma.UserWhereInput = { deletedAt: null };
			if (queryParam.filter) {
				if (queryParam.filter["status"]) {
					filterCondition = {
						...filterCondition,
						status: queryParam.filter["status"] as UserStatus,
					};
				}

				if (queryParam.filter["roles"]) {
					const roles = queryParam.filter["roles"]
						.toString()
						.split(",")
						.map((role) => role.trim());

					filterCondition = {
						...filterCondition,
						roles: {
							some: {
								role: {
									name: {
										in: roles,
									},
								},
							},
						},
					};
				}

				if (queryParam.filter["name"]) {
					filterCondition = {
						...filterCondition,
						name: queryParam.filter["name"].toString(),
					};
				}

				if (queryParam.filter["email"]) {
					filterCondition = {
						...filterCondition,
						email: queryParam.filter["email"].toString(),
					};
				}

				if (queryParam.filter["status"]) {
					filterCondition = {
						...filterCondition,
						status: queryParam.filter["status"] as UserStatus,
					};
				}

				if (
					queryParam.filter["createdAt"] &&
					typeof queryParam.filter["createdAt"] === "string"
				) {
					const [startDate, endDate] =
						queryParam.filter["createdAt"].split(",");
					filterCondition = {
						...filterCondition,
						createdAt: {
							gte: DateUtils.parse(startDate).toDate(),
							...(endDate && {
								lte: DateUtils.parse(endDate).toDate(),
							}),
						},
					};
				}

				if (
					queryParam.filter["updatedAt"] &&
					typeof queryParam.filter["updatedAt"] === "string"
				) {
					const [startDate, endDate] =
						queryParam.filter["updatedAt"].split(",");
					filterCondition = {
						...filterCondition,
						updatedAt: {
							gte: DateUtils.parse(startDate).toDate(),
							...(endDate && {
								lte: DateUtils.parse(endDate).toDate(),
							}),
						},
					};
				}
			}

			const where: Prisma.UserWhereInput = {
				AND: [whereCondition, filterCondition],
			};

			const [totalCount, users] = await Promise.all([
				db.user.count({ where }),
				db.user.findMany({
					where,
					orderBy: { [sort]: sortDirection },
					skip: (finalPage - 1) * finalLimit,
					take: finalLimit,
					select: {
						id: true,
						email: true,
						name: true,
						status: true,
						createdAt: true,
						updatedAt: true,
						roles: {
							select: {
								role: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
				}),
			]);

			return {
				data: users.map((user) => ({
					id: user.id,
					email: user.email,
					name: user.name,
					status: user.status,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
					roles: user.roles.map((userRole) => userRole.role),
				})),
				meta: {
					limit: finalLimit,
					page: finalPage,
					totalCount,
					totalPages: Math.ceil(totalCount / finalLimit),
				},
			};
		},

		async findOne(id: string): Promise<UserDetail | null> {
			const data = await db.user.findFirst({
				where: { id, deletedAt: null },
				select: {
					id: true,
					email: true,
					name: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					roles: {
						select: {
							role: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
			});

			if (!data) {
				return null;
			}

			return {
				id: data.id,
				email: data.email,
				name: data.name,
				status: data.status,
				createdAt: data.createdAt,
				updatedAt: data.updatedAt,
				roles: data.roles.map((userRole) => userRole.role),
			};
		},

		async findByMail(email: string): Promise<{
			id: string;
			email: string;
			name: string;
			password: string;
			status: UserStatus;
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
					status: true,
					password: true,
					emailVerifiedAt: true,
					createdAt: true,
					updatedAt: true,
				},
			});
		},

		async userInformation(userId: string): Promise<UserInformation | null> {
			const user = await db.user.findUnique({
				where: {
					id: userId,
					deletedAt: null,
					emailVerifiedAt: { not: null },
					status: UserStatus.ACTIVE,
				},
				select: {
					id: true,
					email: true,
					name: true,
					status: true,
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
				status: user.status,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				roles,
				permissions: Array.from(permissionsSet),
			};
		},
	};
}

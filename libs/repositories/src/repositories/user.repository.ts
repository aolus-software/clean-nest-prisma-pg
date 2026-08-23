import {
	DatatableType,
	PaginationResponse,
	parseDateRangeFilter,
} from "@common";
import { BadRequestException } from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "@repositories";
import { I18nContext } from "nestjs-i18n";

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

/* The ?sort= and filter[...] values this repository accepts. Exported so the
   controller can document them in Swagger from one source of truth rather than
   restating the list. An unrecognised value is rejected, not ignored. */
export const userSortableFields = [
	"id",
	"name",
	"email",
	"status",
	"createdAt",
	"updatedAt",
];
export const userFilterableFields = [
	"id",
	"name",
	"email",
	"status",
	"roles",
	"createdAt",
	"updatedAt",
];

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

			const sortDirectionAllowed = ["asc", "desc"];

			if (!userSortableFields.includes(sort)) {
				throw new BadRequestException(
					I18nContext.current()?.t("message.common.invalid_sort_field") ??
						"Invalid sort field",
				);
			}

			if (!sortDirectionAllowed.includes(sortDirection)) {
				throw new BadRequestException(
					I18nContext.current()?.t("message.common.invalid_sort_direction") ??
						"Invalid sort direction",
				);
			}

			if (queryParam.filter) {
				const filterKeys = Object.keys(queryParam.filter);
				for (const key of filterKeys) {
					if (!userFilterableFields.includes(key)) {
						throw new BadRequestException(
							I18nContext.current()?.t("message.common.invalid_filter_field") ??
								"Invalid filter field",
						);
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
					/* The key is allow-listed above; the value was not. An
					   unrecognised member cast straight to the enum reaches
					   Prisma and fails validation as a 500 — reject it here as
					   the 400 the allow-list machinery exists to produce. */
					const status = queryParam.filter["status"].toString();
					if (!Object.values(UserStatus).includes(status as UserStatus)) {
						throw new BadRequestException(
							I18nContext.current()?.t("message.common.invalid_filter_field") ??
								"Invalid filter field",
						);
					}

					filterCondition = {
						...filterCondition,
						status: status as UserStatus,
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
						name: {
							contains: queryParam.filter["name"].toString(),
							mode: "insensitive",
						},
					};
				}

				if (queryParam.filter["email"]) {
					filterCondition = {
						...filterCondition,
						email: {
							contains: queryParam.filter["email"].toString(),
							mode: "insensitive",
						},
					};
				}

				if (
					queryParam.filter["createdAt"] &&
					typeof queryParam.filter["createdAt"] === "string"
				) {
					filterCondition = {
						...filterCondition,
						createdAt: parseDateRangeFilter(
							queryParam.filter["createdAt"],
							"createdAt",
						),
					};
				}

				if (
					queryParam.filter["updatedAt"] &&
					typeof queryParam.filter["updatedAt"] === "string"
				) {
					filterCondition = {
						...filterCondition,
						updatedAt: parseDateRangeFilter(
							queryParam.filter["updatedAt"],
							"updatedAt",
						),
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
			return await db.user.findFirst({
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

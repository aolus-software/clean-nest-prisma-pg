import { DatatableType, parseDateRangeFilter } from "@common";
import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "@repositories";
import { PaginationResponse } from "../../../common/src/types/datatable";
import { I18nContext } from "nestjs-i18n";

export interface RoleList {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface RoleDetail extends Required<RoleList> {
	permissions: {
		[key: string]: {
			id: string;
			name: string;
			group: string;
			isAssigned: boolean;
		}[];
	};
}

/* The ?sort= and filter[...] values this repository accepts. Exported so the
   controller can document them in Swagger from one source of truth rather than
   restating the list. An unrecognised value is rejected, not ignored. */
export const roleSortableFields = ["id", "name", "createdAt", "updatedAt"];
export const roleFilterableFields = ["name", "createdAt", "updatedAt"];

export function RoleRepository(tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;

	return {
		role: db.role,

		findAll: async (
			queryParam: DatatableType,
		): Promise<PaginationResponse<RoleList>> => {
			const { page, limit, search, sort, sortDirection } = queryParam;
			const finalLimit = Number(limit);
			const finalPage = Number(page);

			const sortDirectionAllowed = ["asc", "desc"];

			if (!roleSortableFields.includes(sort)) {
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
					if (!roleFilterableFields.includes(key)) {
						throw new BadRequestException(
							I18nContext.current()?.t("message.common.invalid_filter_field") ??
								"Invalid filter field",
						);
					}
				}
			}

			let whereCondition: Prisma.RoleWhereInput = {};
			if (search) {
				whereCondition = {
					OR: [{ name: { contains: search, mode: "insensitive" } }],
				};
			}

			let filterCondition: Prisma.RoleWhereInput = {};
			if (queryParam.filter) {
				if (queryParam.filter["name"]) {
					filterCondition = {
						...filterCondition,
						name: {
							contains: queryParam.filter["name"].toString(),
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

			const where: Prisma.RoleWhereInput = {
				AND: [whereCondition, filterCondition],
			};

			const [totalCount, roles] = await Promise.all([
				db.role.count({ where }),
				db.role.findMany({
					where,
					orderBy: {
						[sort]: sortDirection,
					},
					skip: (finalPage - 1) * finalLimit,
					take: finalLimit,

					select: {
						id: true,
						name: true,
						createdAt: true,
						updatedAt: true,
					},
				}),
			]);

			return {
				data: roles,
				meta: {
					limit: finalLimit,
					page: finalPage,
					totalCount,
					totalPages: Math.ceil(totalCount / finalLimit),
				},
			};
		},

		findOne: async (id: string): Promise<RoleDetail | null> => {
			const data = await db.role.findFirst({
				where: { id },
				select: {
					id: true,
					name: true,
					createdAt: true,
					updatedAt: true,
					permissions: {
						select: {
							permission: {
								select: {
									id: true,
									name: true,
									group: true,
								},
							},
						},
					},
				},
			});

			if (!data) {
				return null;
			}

			const permissions = await db.permission.findMany({
				select: {
					id: true,
					name: true,
					group: true,
				},
			});

			const groupedPermissions: RoleDetail["permissions"] = {};
			for (const perm of permissions) {
				if (!groupedPermissions[perm.group]) {
					groupedPermissions[perm.group] = [];
				}
				const isAssigned = data.permissions.some(
					(p) => p.permission.id === perm.id,
				);
				groupedPermissions[perm.group].push({
					...perm,
					isAssigned,
				});
			}

			return {
				id: data.id,
				name: data.name,
				createdAt: data.createdAt,
				updatedAt: data.updatedAt,
				permissions: groupedPermissions,
			};
		},
	};
}

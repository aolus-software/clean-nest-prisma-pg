import {
	DatatableType,
	PaginationResponse,
	parseDateRangeFilter,
} from "@common";
import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "@repositories";
import { I18nContext } from "nestjs-i18n";

export interface PermissionList {
	id: string;
	name: string;
	group: string;
	createdAt: Date;
	updatedAt: Date;
}

/* The ?sort= and filter[...] values this repository accepts. Exported so the
   controller can document them in Swagger from one source of truth rather than
   restating the list. An unrecognised value is rejected, not ignored. */
export const permissionSortableFields = [
	"id",
	"name",
	"group",
	"createdAt",
	"updatedAt",
];
export const permissionFilterableFields = [
	"id",
	"name",
	"group",
	"createdAt",
	"updatedAt",
];

export function PermissionRepository(tx?: Prisma.TransactionClient) {
	const db = tx || prisma;

	return {
		permission: db.permission,

		findAll: async (
			queryParam: DatatableType,
		): Promise<PaginationResponse<PermissionList>> => {
			const { page, limit, search, sort, sortDirection } = queryParam;
			const finalLimit = Number(limit);
			const finalPage = Number(page);

			const sortDirectionAllowed = ["asc", "desc"];

			if (!permissionSortableFields.includes(sort)) {
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
					if (!permissionFilterableFields.includes(key)) {
						throw new BadRequestException(
							I18nContext.current()?.t("message.common.invalid_filter_field") ??
								"Invalid filter field",
						);
					}
				}
			}

			let whereCondition: Prisma.PermissionWhereInput = {};
			if (search) {
				whereCondition = {
					AND: [
						{ name: { contains: search, mode: "insensitive" } },
						{ group: { contains: search, mode: "insensitive" } },
					],
				};
			}

			let filterCondition: Prisma.PermissionWhereInput = {};
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

				if (queryParam.filter["id"]) {
					filterCondition = {
						...filterCondition,
						id: queryParam.filter["id"].toString(),
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

				if (queryParam.filter["group"]) {
					filterCondition = {
						...filterCondition,
						group: {
							contains: queryParam.filter["group"].toString(),
							mode: "insensitive",
						},
					};
				}
			}

			const where: Prisma.PermissionWhereInput = {
				AND: [whereCondition, filterCondition],
			};

			const [totalCount, permissions] = await Promise.all([
				db.permission.count({ where }),
				db.permission.findMany({
					where,
					orderBy: { [sort]: sortDirection },
					skip: (finalPage - 1) * finalLimit,
					take: finalLimit,
					select: {
						id: true,
						name: true,
						group: true,
						createdAt: true,
						updatedAt: true,
					},
				}),
			]);

			return {
				data: permissions,
				meta: {
					limit: finalLimit,
					page: finalPage,
					totalCount,
					totalPages: Math.ceil(totalCount / finalLimit),
				},
			};
		},

		findOne: async (id: string): Promise<PermissionList | null> => {
			return await db.permission.findFirst({
				where: { id },
				select: {
					id: true,
					name: true,
					group: true,
					createdAt: true,
					updatedAt: true,
				},
			});
		},
	};
}

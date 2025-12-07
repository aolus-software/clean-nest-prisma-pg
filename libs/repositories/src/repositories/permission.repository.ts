import { DatatableType, PaginationResponse } from "@common";
import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "@repositories";

export interface PermissionList {
	id: string;
	name: string;
	group: string;
	createdAt: Date;
	updatedAt: Date;
}

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

			const allowedSort = ["id", "name", "group", "createdAt", "updatedAt"];
			const sortDirectionAllowed = ["asc", "desc"];
			const allowedFilter = ["id", "name", "group", "createdAt", "updatedAt"];

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
						name: queryParam.filter["name"].toString(),
					};
				}

				if (queryParam.filter["group"]) {
					filterCondition = {
						...filterCondition,
						group: queryParam.filter["group"].toString(),
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

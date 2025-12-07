import { Injectable, NotFoundException } from "@nestjs/common";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { PermissionList, PermissionRepository, prisma } from "@repositories";
import { Prisma } from "@prisma/client";
import { DatatableType, PaginationResponse } from "@common";

@Injectable()
export class PermissionsService {
	async create(createPermissionDto: CreatePermissionDto): Promise<void> {
		await prisma.$transaction(async (tx) => {
			const permissionData: Prisma.PermissionCreateInput[] =
				createPermissionDto.names.map((action) => ({
					name: `${action}:${createPermissionDto.group}`,
					group: createPermissionDto.group,
				}));

			await tx.permission.createMany({
				data: permissionData,
				skipDuplicates: true,
			});
		});
	}

	async findAll(
		query: DatatableType,
	): Promise<PaginationResponse<PermissionList>> {
		return await PermissionRepository().findAll(query);
	}

	async findOne(id: string): Promise<PermissionList> {
		const data = await PermissionRepository().findOne(id);
		if (!data) {
			throw new NotFoundException(`Permission with ID ${id} not found`);
		}

		return data;
	}

	async update(
		id: string,
		updatePermissionDto: UpdatePermissionDto,
	): Promise<void> {
		await prisma.$transaction(async (tx) => {
			const existingPermission = await tx.permission.findUnique({
				where: { id },
			});
			if (!existingPermission) {
				throw new NotFoundException(`Permission with ID ${id} not found`);
			}

			const updatedName = `${updatePermissionDto.name}:${updatePermissionDto.group}`;
			await tx.permission.update({
				where: { id },
				data: {
					name: updatedName,
					group: updatePermissionDto.group,
				},
			});
		});
	}

	async remove(id: string): Promise<void> {
		await prisma.$transaction(async (tx) => {
			const existingPermission = await tx.permission.findUnique({
				where: { id },
			});
			if (!existingPermission) {
				throw new NotFoundException(`Permission with ID ${id} not found`);
			}

			await tx.permission.delete({
				where: { id },
			});
		});
	}
}

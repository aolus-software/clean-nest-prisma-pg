import { Injectable, NotFoundException } from "@nestjs/common";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { PermissionList, PermissionRepository, prisma } from "@repositories";
import { Prisma } from "@prisma/client";
import { DatatableType, PaginationResponse } from "@common";
import { I18nService } from "nestjs-i18n";

@Injectable()
export class PermissionsService {
	constructor(private readonly i18n: I18nService) {}

	async create(createPermissionDto: CreatePermissionDto): Promise<void> {
		await prisma.$transaction(async (tx) => {
			const permissionData: Prisma.PermissionCreateInput[] =
				createPermissionDto.actions.map((action) => ({
					name: `${createPermissionDto.group}:${action}`,
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
			throw new NotFoundException(
				this.i18n.t("message.permission.not_found", { args: { id } }),
			);
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
				throw new NotFoundException(
					this.i18n.t("message.permission.not_found", { args: { id } }),
				);
			}

			const updatedName = `${updatePermissionDto.group}:${updatePermissionDto.action}`;
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
				throw new NotFoundException(
					this.i18n.t("message.permission.not_found", { args: { id } }),
				);
			}

			await tx.permission.delete({
				where: { id },
			});
		});
	}
}

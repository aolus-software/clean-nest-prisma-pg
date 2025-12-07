import {
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from "@nestjs/common";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { prisma } from "@repositories";
import { DatatableType, PaginationResponse } from "@common";
import {
	RoleDetail,
	RoleList,
	RoleRepository,
} from "@repositories/repositories/role.repostory";

@Injectable()
export class RolesService {
	async create(createRoleDto: CreateRoleDto): Promise<void> {
		const isNameExists = await prisma.role.findFirst({
			where: { name: createRoleDto.name },
		});

		if (isNameExists) {
			throw new UnprocessableEntityException({
				message: "Role name already exists",
				error: {
					name: ["Role name already exists"],
				},
			});
		}

		const permissionExists = await prisma.permission.findMany({
			where: {
				id: {
					in: createRoleDto.permissionIds,
				},
			},
		});

		if (permissionExists.length !== createRoleDto.permissionIds.length) {
			throw new UnprocessableEntityException({
				message: "One or more permissions do not exist",
				error: {
					permissionIds: ["One or more permissions do not exist"],
				},
			});
		}

		await prisma.$transaction(async (tx) => {
			const role = await tx.role.create({
				data: {
					name: createRoleDto.name,
				},
			});

			const rolePermissionsData = createRoleDto.permissionIds.map((pid) => ({
				roleId: role.id,
				permissionId: pid,
			}));

			await tx.rolePermission.createMany({
				data: rolePermissionsData,
			});
		});
	}

	async findAll(
		queryParam: DatatableType,
	): Promise<PaginationResponse<RoleList>> {
		return await RoleRepository().findAll(queryParam);
	}

	async findOne(id: string): Promise<RoleDetail> {
		const role = await RoleRepository().findOne(id);
		if (!role) {
			throw new NotFoundException("Role not found");
		}

		return role;
	}

	async update(id: string, updateRoleDto: UpdateRoleDto): Promise<void> {
		const roleExist = await prisma.role.findFirst({
			where: { id },
			select: { id: true },
		});

		if (!roleExist) {
			throw new NotFoundException("Role not found");
		}

		const isNameExists = await prisma.role.findFirst({
			where: {
				name: updateRoleDto.name,
				NOT: { id },
			},
			select: { id: true },
		});

		if (isNameExists) {
			throw new UnprocessableEntityException({
				message: "Role name already exists",
				error: {
					name: ["Role name already exists"],
				},
			});
		}

		const permissionExists = await prisma.permission.findMany({
			where: {
				id: {
					in: updateRoleDto.permissionIds,
				},
			},
		});

		if (permissionExists.length !== updateRoleDto.permissionIds.length) {
			throw new UnprocessableEntityException({
				message: "One or more permissions do not exist",
				error: {
					permissionIds: ["One or more permissions do not exist"],
				},
			});
		}

		await prisma.$transaction(async (tx) => {
			await tx.role.update({
				where: { id },
				data: { name: updateRoleDto.name },
			});

			await tx.rolePermission.deleteMany({
				where: { roleId: id },
			});

			const rolePermissionsData = updateRoleDto.permissionIds.map((pid) => ({
				roleId: id,
				permissionId: pid,
			}));

			await tx.rolePermission.createMany({
				data: rolePermissionsData,
			});
		});
	}

	async remove(id: string): Promise<void> {
		const roleExist = await prisma.role.findFirst({
			where: { id },
			select: { id: true },
		});

		if (!roleExist) {
			throw new NotFoundException("Role not found");
		}

		await prisma.$transaction(async (tx) => {
			await tx.rolePermission.deleteMany({
				where: { roleId: id },
			});
			await tx.role.delete({
				where: { id },
			});
		});
	}
}

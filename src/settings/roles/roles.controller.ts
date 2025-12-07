import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	Res,
	Query,
	UseGuards,
} from "@nestjs/common";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import {
	AuthGuard,
	DatatableType,
	FilterValidationPipe,
	PaginationResponse,
	PermissionAuth,
	PermissionGuard,
	ResponseHandler,
	SortDirection,
} from "@common";
import { Response } from "express";
import { defaultSort, paginationLength } from "@utils";
import {
	RoleDetail,
	RoleList,
} from "@repositories/repositories/role.repostory";

@Controller("roles")
@UseGuards(AuthGuard, PermissionGuard)
export class RolesController {
	constructor(private readonly rolesService: RolesService) {}

	@Post()
	@PermissionAuth("role:create")
	async create(@Body() createRoleDto: CreateRoleDto, @Res() res: Response) {
		try {
			await this.rolesService.create(createRoleDto);
			return ResponseHandler.success<void>(
				201,
				"Role created successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Get()
	@PermissionAuth("role:list")
	async findAll(
		@Query("page") page: number,
		@Query("limit") limit: number,
		@Query("search") search: string,
		@Query("sort") sort: string,
		@Query("sortDirection") sortDirection: string,
		@Query(new FilterValidationPipe())
		filter: Record<string, string | boolean | Date> | null,
		@Res() res: Response,
	) {
		try {
			const query: DatatableType = {
				page: page || 1,
				limit: limit || paginationLength,
				search: search || null,
				sort: sort || defaultSort,
				sortDirection: (sortDirection === "asc"
					? "asc"
					: "desc") as SortDirection,
				filter: filter || null,
			};
			const result = await this.rolesService.findAll(query);
			return ResponseHandler.success<PaginationResponse<RoleList>>(
				200,
				"Roles fetched successfully",
				result,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Get(":id")
	@PermissionAuth("role:view")
	async findOne(@Param("id") id: string, @Res() res: Response) {
		try {
			const result = await this.rolesService.findOne(id);
			return ResponseHandler.success<RoleDetail>(
				200,
				"Role fetched successfully",
				result,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Patch(":id")
	@PermissionAuth("role:update")
	async update(
		@Param("id") id: string,
		@Body() updateRoleDto: UpdateRoleDto,
		@Res() res: Response,
	) {
		try {
			await this.rolesService.update(id, updateRoleDto);
			return ResponseHandler.success<void>(
				200,
				"Role updated successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Delete(":id")
	@PermissionAuth("role:delete")
	async remove(@Param("id") id: string, @Res() res: Response) {
		try {
			await this.rolesService.remove(id);
			return ResponseHandler.success<void>(
				200,
				"Role deleted successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}
}

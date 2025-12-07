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
import { PermissionsService } from "./permissions.service";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import {
	AuthGuard,
	DatatableType,
	FilterValidationPipe,
	PaginationResponse,
	ResponseHandler,
	RoleAuth,
	RoleGuard,
	SortDirection,
} from "@common";
import { Response } from "express";
import { PermissionList } from "@repositories";
import { defaultSort, paginationLength } from "@utils";

@Controller("permissions")
@UseGuards(AuthGuard, RoleGuard)
@RoleAuth("superuser")
export class PermissionsController {
	constructor(private readonly permissionsService: PermissionsService) {}

	@Post()
	async create(
		@Body() createPermissionDto: CreatePermissionDto,
		@Res() res: Response,
	) {
		try {
			await this.permissionsService.create(createPermissionDto);
			return ResponseHandler.success<void>(
				201,
				"Permission(s) created successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Get()
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
			const result: PaginationResponse<PermissionList> =
				await this.permissionsService.findAll(query);

			return ResponseHandler.success<PaginationResponse<PermissionList>>(
				200,
				"Permissions retrieved successfully",
				result,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Get(":id")
	async findOne(@Param("id") id: string, @Res() res: Response) {
		try {
			const data = await this.permissionsService.findOne(id);
			return ResponseHandler.success<PermissionList>(
				200,
				"Permission retrieved successfully",
				data,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Patch(":id")
	async update(
		@Param("id") id: string,
		@Body() updatePermissionDto: UpdatePermissionDto,
		@Res() res: Response,
	) {
		try {
			await this.permissionsService.update(id, updatePermissionDto);
			return ResponseHandler.success<void>(
				200,
				"Permission updated successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Delete(":id")
	async remove(@Param("id") id: string, @Res() res: Response) {
		try {
			await this.permissionsService.remove(id);
			return ResponseHandler.success<void>(
				200,
				"Permission deleted successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}
}

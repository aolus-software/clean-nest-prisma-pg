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
	ApiStandardResponses,
	ApiSuccessResponse,
	AuthGuard,
	DatatableType,
	DefaultApiNotFoundResponse,
	FilterValidationPipe,
	PaginationResponse,
	PermissionAuth,
	PermissionGuard,
	ResponseHandler,
} from "@common";
import { defaultSort, paginationLength } from "@utils";
import { RoleDetail, RoleList } from "@repositories";
import { FastifyReply } from "fastify";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiDatatableQueries } from "@common/decorators/api-datatable-queries/api-datatable-queries.decorator";
import { roleSortableFields, roleFilterableFields } from "@repositories";
import { I18nService } from "nestjs-i18n";

@Controller("roles")
@UseGuards(AuthGuard, PermissionGuard)
@ApiTags("Settings/Roles")
@ApiBearerAuth("Bearer")
export class RolesController {
	constructor(
		private readonly rolesService: RolesService,
		private readonly i18n: I18nService,
	) {}

	@Post()
	@PermissionAuth("role:create")
	@ApiSuccessResponse(201, "Role created successfully", null, {
		type: "null",
	})
	@ApiStandardResponses()
	async create(@Body() createRoleDto: CreateRoleDto, @Res() res: FastifyReply) {
		try {
			await this.rolesService.create(createRoleDto);
			return res
				.status(201)
				.send(
					ResponseHandler.success<void>(
						201,
						this.i18n.t("message.role.create_success"),
						undefined,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Get()
	@PermissionAuth("role:list")
	@ApiStandardResponses({
		validation: false,
	})
	@ApiDatatableQueries({
		sortFields: roleSortableFields,
		filterFields: roleFilterableFields,
	})
	@ApiSuccessResponse(
		200,
		"Roles fetched successfully",
		{
			data: [
				{
					id: "role_123",
					name: "Administrator",
					createdAt: "2023-01-01T00:00:00.000Z",
					updatedAt: "2023-01-01T00:00:00.000Z",
				},
			],
			meta: {
				page: 1,
				limit: 10,
				totalCount: 100,
				totalPages: 10,
			},
		},
		{
			type: "object",
			properties: {
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string", example: "role_123" },
							name: { type: "string", example: "Administrator" },
							createdAt: {
								type: "string",
								format: "date-time",
								example: "2023-01-01T00:00:00.000Z",
							},
							updatedAt: {
								type: "string",
								format: "date-time",
								example: "2023-01-01T00:00:00.000Z",
							},
						},
					},
				},
				meta: {
					type: "object",
					properties: {
						page: { type: "number", example: 1 },
						limit: { type: "number", example: 10 },
						totalCount: { type: "number", example: 100 },
						totalPages: { type: "number", example: 10 },
					},
				},
			},
		},
	)
	async findAll(
		@Query("page") page: number,
		@Query("limit") limit: number,
		@Query("search") search: string,
		@Query("sort") sort: string,
		@Query("sortDirection") sortDirection: string,
		@Query(new FilterValidationPipe())
		filter: Record<string, string | boolean | Date> | null,
		@Res() res: FastifyReply,
	) {
		try {
			const query: DatatableType = {
				page: page || 1,
				limit: limit || paginationLength,
				search: search || null,
				sort: sort || defaultSort,
				sortDirection: sortDirection === "asc" ? "asc" : "desc",
				filter: filter || null,
			};
			const result = await this.rolesService.findAll(query);
			return res
				.status(200)
				.send(
					ResponseHandler.success<PaginationResponse<RoleList>>(
						200,
						this.i18n.t("message.role.retrieved_success"),
						result,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Get(":id")
	@PermissionAuth("role:view")
	@ApiSuccessResponse(200, "Role fetched successfully", {
		id: "role_123",
		name: "Administrator",
		createdAt: "2023-01-01T00:00:00.000Z",
		updatedAt: "2023-01-01T00:00:00.000Z",
		permissions: [
			{
				id: "perm_123",
				name: "Create User",
				group: "User Management",
				isAssigned: true,
			},
		],
	})
	@ApiStandardResponses({
		validation: false,
	})
	@DefaultApiNotFoundResponse()
	async findOne(@Param("id") id: string, @Res() res: FastifyReply) {
		try {
			const result = await this.rolesService.findOne(id);
			return res
				.status(200)
				.send(
					ResponseHandler.success<RoleDetail>(
						200,
						this.i18n.t("message.role.found_success"),
						result,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Patch(":id")
	@PermissionAuth("role:update")
	@ApiSuccessResponse(200, "Role updated successfully", null, {
		type: "null",
	})
	@ApiStandardResponses()
	@DefaultApiNotFoundResponse()
	async update(
		@Param("id") id: string,
		@Body() updateRoleDto: UpdateRoleDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.rolesService.update(id, updateRoleDto);
			return res
				.status(200)
				.send(
					ResponseHandler.success<void>(
						200,
						this.i18n.t("message.role.update_success"),
						undefined,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Delete(":id")
	@PermissionAuth("role:delete")
	@ApiSuccessResponse(200, "Role deleted successfully", null, {
		type: "null",
	})
	@ApiStandardResponses({
		validation: false,
	})
	@DefaultApiNotFoundResponse()
	async remove(@Param("id") id: string, @Res() res: FastifyReply) {
		try {
			await this.rolesService.remove(id);
			return res
				.status(200)
				.send(
					ResponseHandler.success<void>(
						200,
						this.i18n.t("message.role.delete_success"),
						undefined,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}
}

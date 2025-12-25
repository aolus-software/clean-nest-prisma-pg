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
	ApiStandardResponses,
	ApiSuccessResponse,
	AuthGuard,
	DatatableType,
	DefaultApiNotFoundResponse,
	FilterValidationPipe,
	PaginationResponse,
	ResponseHandler,
	RoleAuth,
	RoleGuard,
	SortDirection,
} from "@common";
import { PermissionList } from "@repositories";
import { defaultSort, paginationLength } from "@utils";
import { FastifyReply } from "fastify";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiDatatableQueries } from "@common/decorators/api-datatable-queries/api-datatable-queries.decorator";

@Controller("permissions")
@UseGuards(AuthGuard, RoleGuard)
@RoleAuth("superuser")
@ApiTags("Settings/Permissions")
@ApiBearerAuth("Bearer")
export class PermissionsController {
	constructor(private readonly permissionsService: PermissionsService) {}

	@Post()
	@ApiSuccessResponse(201, "Permission(s) created successfully", null, {
		type: "null",
	})
	@ApiStandardResponses()
	async create(
		@Body() createPermissionDto: CreatePermissionDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.permissionsService.create(createPermissionDto);
			return res
				.status(201)
				.send(
					ResponseHandler.success<void>(
						201,
						"Permission(s) created successfully",
						undefined,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Get()
	@ApiDatatableQueries()
	@ApiSuccessResponse(
		200,
		"Permissions retrieved successfully",
		{
			data: [
				{
					id: "permission-id",
					name: "read_articles",
					description: "Permission to read articles",
					createdAt: "2024-01-01T00:00:00.000Z",
					updatedAt: "2024-01-01T00:00:00.000Z",
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
							id: { type: "string", example: "permission-id" },
							name: { type: "string", example: "read_articles" },
							description: {
								type: "string",
								example: "Permission to read articles",
							},
							createdAt: { type: "string", format: "date-time" },
							updatedAt: { type: "string", format: "date-time" },
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
	@ApiStandardResponses({
		validation: false,
	})
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
				sortDirection: (sortDirection === "asc"
					? "asc"
					: "desc") as SortDirection,
				filter: filter || null,
			};
			const result: PaginationResponse<PermissionList> =
				await this.permissionsService.findAll(query);

			return res
				.status(200)
				.send(
					ResponseHandler.success<PaginationResponse<PermissionList>>(
						200,
						"Permissions retrieved successfully",
						result,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Get(":id")
	@ApiSuccessResponse(
		200,
		"Permission retrieved successfully",
		{
			id: "permission-id",
			name: "read_articles",
			description: "Permission to read articles",
			createdAt: "2024-01-01T00:00:00.000Z",
			updatedAt: "2024-01-01T00:00:00.000Z",
		},
		{
			type: "object",
			properties: {
				id: { type: "string", example: "permission-id" },
				name: { type: "string", example: "read_articles" },
				description: { type: "string", example: "Permission to read articles" },
				createdAt: { type: "string", format: "date-time" },
				updatedAt: { type: "string", format: "date-time" },
			},
		},
	)
	@DefaultApiNotFoundResponse("Permission")
	@ApiStandardResponses({
		validation: false,
	})
	async findOne(@Param("id") id: string, @Res() res: FastifyReply) {
		try {
			const data = await this.permissionsService.findOne(id);
			return res
				.status(200)
				.send(
					ResponseHandler.success<PermissionList>(
						200,
						"Permission retrieved successfully",
						data,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Patch(":id")
	@ApiSuccessResponse(200, "Permission updated successfully", null, {
		type: "null",
	})
	@DefaultApiNotFoundResponse("Permission")
	@ApiStandardResponses()
	async update(
		@Param("id") id: string,
		@Body() updatePermissionDto: UpdatePermissionDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.permissionsService.update(id, updatePermissionDto);
			return res
				.status(200)
				.send(
					ResponseHandler.success<void>(
						200,
						"Permission updated successfully",
						undefined,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Delete(":id")
	@DefaultApiNotFoundResponse("Permission")
	@ApiSuccessResponse(200, "Permission deleted successfully", null, {
		type: "null",
	})
	@ApiStandardResponses({
		validation: false,
	})
	async remove(@Param("id") id: string, @Res() res: FastifyReply) {
		try {
			await this.permissionsService.remove(id);
			return res
				.status(200)
				.send(
					ResponseHandler.success<void>(
						200,
						"Permission deleted successfully",
						undefined,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}
}

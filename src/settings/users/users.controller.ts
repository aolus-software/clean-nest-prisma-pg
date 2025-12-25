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
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

import {
	ApiStandardResponses,
	ApiSuccessResponse,
	AuthGuard,
	DatatableType,
	DefaultApiNotFoundResponse,
	FilterValidationPipe,
	PermissionAuth,
	PermissionGuard,
	ResponseHandler,
	RoleAuth,
	RoleGuard,
	SortDirection,
} from "@common";
import { defaultSort, paginationLength } from "@utils";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { FastifyReply } from "fastify";
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiTags,
} from "@nestjs/swagger";
import { ApiDatatableQueries } from "@common/decorators/api-datatable-queries/api-datatable-queries.decorator";

@Controller("users")
@UseGuards(AuthGuard, PermissionGuard, RoleGuard)
@ApiTags("Settings/Users")
@ApiBearerAuth("Bearer")
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Post()
	@PermissionAuth("user:create")
	@ApiStandardResponses()
	@ApiCreatedResponse({
		description: "User created successfully",
		example: {
			success: true,
			statusCode: 201,
			message: "User created successfully",
			data: null,
		},
	})
	async create(@Body() createUserDto: CreateUserDto, @Res() res: FastifyReply) {
		try {
			await this.usersService.create(createUserDto);
			return ResponseHandler.success<void>(
				201,
				"User created successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Post(":id/resend-verify-email")
	@ApiStandardResponses()
	@ApiOkResponse({
		description: "Verification email resent successfully",
		example: {
			success: true,
			statusCode: 200,
			message: "Email verified successfully",
			data: null,
		},
	})
	async resendVerifyEmail(@Param("id") id: string, @Res() res: FastifyReply) {
		try {
			await this.usersService.resendVerificationEmail(id);
			return ResponseHandler.success<void>(
				200,
				"Email verified successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Get()
	@PermissionAuth("user:list")
	@ApiStandardResponses({
		validation: false,
	})
	@ApiDatatableQueries()
	@ApiSuccessResponse(200, "Users retrieved successfully", {
		data: [
			{
				id: "user-id",
				name: "John Doe",
				email: "john.doe@example.com",
				status: "ACTIVE",
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

			const users = await this.usersService.findAll(query);
			return ResponseHandler.success(
				200,
				"Users retrieved successfully",
				users,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Get(":id")
	@PermissionAuth("user:view")
	@ApiStandardResponses({
		validation: false,
	})
	@DefaultApiNotFoundResponse()
	async findOne(@Param("id") id: string, @Res() res: FastifyReply) {
		try {
			const user = await this.usersService.findOne(id);
			return ResponseHandler.success(200, "User found successfully", user);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Patch(":id")
	@PermissionAuth("user:update")
	@ApiStandardResponses({})
	async update(
		@Param("id") id: string,
		@Body() updateUserDto: UpdateUserDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.usersService.update(id, updateUserDto);
			return ResponseHandler.success<void>(
				200,
				"User updated successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Patch(":id/status")
	@PermissionAuth("user:update")
	@ApiStandardResponses({})
	async updateStatus(
		@Param("id") id: string,
		@Body() updateStatusDto: UpdateStatusDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.usersService.updateStatus(id, updateStatusDto);
			return ResponseHandler.success<void>(
				200,
				"User status updated successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Patch(":id/password")
	@RoleAuth("superuser")
	@ApiStandardResponses({})
	async updatePassword(
		@Param("id") id: string,
		@Body() updatePasswordDto: UpdatePasswordDto,
		@Res() res: FastifyReply,
	) {
		try {
			await this.usersService.updatePassword(id, updatePasswordDto);
			return ResponseHandler.success<void>(
				200,
				"User password updated successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Delete(":id")
	@PermissionAuth("user:delete")
	@ApiStandardResponses({
		validation: false,
	})
	@DefaultApiNotFoundResponse()
	async remove(@Param("id") id: string, @Res() res: FastifyReply) {
		try {
			await this.usersService.remove(id);
			return ResponseHandler.success<void>(
				200,
				"User deleted successfully",
				undefined,
			);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}
}

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
import { Response } from "express";
import {
	AuthGuard,
	DatatableType,
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

@Controller("users")
@UseGuards(AuthGuard, PermissionGuard, RoleGuard)
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Post()
	@PermissionAuth("user:create")
	async create(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
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
	async resendVerifyEmail(@Param("id") id: string, @Res() res: Response) {
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
	async findOne(@Param("id") id: string, @Res() res: Response) {
		try {
			const user = await this.usersService.findOne(id);
			return ResponseHandler.success(200, "User found successfully", user);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}

	@Patch(":id")
	@PermissionAuth("user:update")
	async update(
		@Param("id") id: string,
		@Body() updateUserDto: UpdateUserDto,
		@Res() res: Response,
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
	async updateStatus(
		@Param("id") id: string,
		@Body() updateStatusDto: UpdateStatusDto,
		@Res() res: Response,
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
	async updatePassword(
		@Param("id") id: string,
		@Body() updatePasswordDto: UpdatePasswordDto,
		@Res() res: Response,
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
	async remove(@Param("id") id: string, @Res() res: Response) {
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

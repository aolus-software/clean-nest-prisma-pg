import { Body, Controller, Patch, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
	ApiStandardResponses,
	ApiSuccessResponse,
	CurrentUser,
	ResponseHandler,
} from "@common";
import type { UserInformation } from "@repositories";
import { FastifyReply } from "fastify";
import { I18nService } from "nestjs-i18n";
import { ProfileService } from "./profile.service";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Controller("profile")
@ApiTags("Profile")
@ApiBearerAuth("Bearer")
export class ProfileController {
	constructor(
		private readonly profileService: ProfileService,
		private readonly i18n: I18nService,
	) {}

	/* Own-account action: authentication alone is the gate, so no
	   @PermissionAuth or @RoleAuth — any signed-in user may change their own
	   password, and the service checks the current one first. */
	@Patch("/password")
	@ApiSuccessResponse(200, "Password changed successfully", null)
	@ApiStandardResponses({
		forbidden: false,
	})
	async changePassword(
		@Body() data: ChangePasswordDto,
		@CurrentUser() user: UserInformation,
		@Res() res: FastifyReply,
	) {
		try {
			await this.profileService.changePassword(user.id, data);
			return res
				.status(200)
				.send(
					ResponseHandler.success(
						200,
						this.i18n.t("message.auth.change_password_success"),
						null,
					),
				);
		} catch (error) {
			return ResponseHandler.handleError(res, error);
		}
	}
}

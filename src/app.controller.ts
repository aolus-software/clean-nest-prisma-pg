import { successResponse } from "@common/response/response";
import { Controller, Get, Res } from "@nestjs/common";
import { DateUtils } from "@utils";
import { Response } from "express";

@Controller()
export class AppController {
	@Get()
	getHello(@Res() res: Response): Response {
		return res.json(
			successResponse(200, `Welcome to ${process.env.APP_NAME}`, {
				appName: process.env.APP_NAME,
				appVersion: process.env.APP_VERSION,
				timestamp: DateUtils.now().toISOString(),
			}),
		);
	}
}

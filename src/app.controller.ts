import { successResponse } from "@common/response/response";
import { Controller, Get, Res } from "@nestjs/common";
import { DateUtils } from "@utils";
import { FastifyReply } from "fastify";

@Controller()
export class AppController {
	@Get()
	getHello(@Res() res: FastifyReply): FastifyReply {
		return res.send(
			successResponse(200, `Welcome to ${process.env.APP_NAME}`, {
				appName: process.env.APP_NAME,
				appVersion: process.env.APP_VERSION,
				timestamp: DateUtils.now().toISOString(),
			}),
		);
	}
}

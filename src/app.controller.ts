import { successResponse } from "@common/response/response";
import { Controller, Get, Res } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { DateUtils } from "@utils";
import { FastifyReply } from "fastify";

@Controller()
export class AppController {
	@Get()
	@ApiOkResponse({
		description: "Welcome message",
		schema: {
			type: "object",
			properties: {
				code: { type: "number", example: 200 },
				success: { type: "boolean", example: true },
				message: {
					type: "string",
					example: "Welcome to MyApp",
				},
				data: {
					type: "object",
					properties: {
						appName: { type: "string", example: "MyApp" },
						appVersion: { type: "string", example: "1.0.0" },
						timestamp: {
							type: "string",
							format: "date-time",
							example: "2023-01-01T00:00:00.000Z",
						},
					},
				},
			},
		},
	})
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

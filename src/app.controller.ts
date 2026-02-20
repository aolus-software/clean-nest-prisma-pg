import { successResponse } from "@common/response/response";
import { Controller, Get, Res } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { DateUtils } from "@utils";
import { FastifyReply } from "fastify";
import { getEnv } from "@config";

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
			successResponse(200, `Welcome to ${getEnv().APP_NAME}`, {
				appName: getEnv().APP_NAME,
				appVersion: getEnv().APP_VERSION,
				timestamp: DateUtils.now().toISOString(),
			}),
		);
	}
}

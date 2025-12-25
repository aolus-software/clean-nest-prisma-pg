import { applyDecorators } from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiForbiddenResponse,
	ApiInternalServerErrorResponse,
	ApiResponse,
	ApiServiceUnavailableResponse,
	ApiUnauthorizedResponse,
	ApiUnprocessableEntityResponse,
	ApiNotFoundResponse,
} from "@nestjs/swagger";
import {
	ReferenceObject,
	SchemaObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

interface ApiStandardResponsesOptions {
	badRequest?: boolean;
	unauthorized?: boolean;
	forbidden?: boolean;
	validation?: boolean;
	internalServerError?: boolean;
	serviceUnavailable?: boolean;
}

export const ApiStandardResponses = (
	options: ApiStandardResponsesOptions = {},
) => {
	const {
		badRequest = true,
		unauthorized = true,
		forbidden = true,
		validation = true,
		internalServerError = true,
		serviceUnavailable = true,
	} = options;

	const decorators: Array<MethodDecorator & ClassDecorator> = [];

	if (validation) {
		decorators.push(
			ApiUnprocessableEntityResponse({
				description: "Validation failed",
				schema: {
					example: {
						code: 422,
						success: false,
						message: "Validation error",
						data: null,
						error: {
							field1: ["Error message 1", "Error message 2"],
							field2: ["Error message 1"],
						},
					},
					properties: {
						status: { type: "number", example: 422 },
						success: { type: "boolean", example: false },
						message: { type: "string", example: "Validation error" },
						data: { type: "null", example: null },
						error: {
							type: "object",
							additionalProperties: {
								type: "array",
								items: { type: "string", example: "Error message" },
							},
						},
					},
				},
			}),
		);
	}

	if (badRequest) {
		decorators.push(
			ApiBadRequestResponse({
				description: "Bad Request",
				schema: {
					example: {
						code: 400,
						success: false,
						message: "Your request is invalid",
						data: null,
					},
					properties: {
						status: { type: "number", example: 400 },
						success: { type: "boolean", example: false },
						message: { type: "string", example: "Bad Request" },
						data: { type: "null", example: null },
					},
				},
			}),
		);
	}

	if (unauthorized) {
		decorators.push(
			ApiUnauthorizedResponse({
				description: "Unauthorized",
				schema: {
					example: {
						message: "Unauthorized",
						error: "Unauthorized",
						statusCode: 401,
					},
					properties: {
						status: { type: "number", example: 401 },
						success: { type: "boolean", example: false },
						message: { type: "string", example: "Unauthorized" },
					},
				},
			}),
		);
	}

	if (forbidden) {
		decorators.push(
			ApiForbiddenResponse({
				description: "Forbidden",
				schema: {
					example: {
						message: "Forbidden",
						error: "Forbidden",
						statusCode: 403,
					},
					properties: {
						status: { type: "number", example: 403 },
						success: { type: "boolean", example: false },
						message: { type: "string", example: "Forbidden" },
					},
				},
			}),
		);
	}

	if (internalServerError) {
		decorators.push(
			ApiInternalServerErrorResponse({
				description: "Internal server error",
				schema: {
					example: {
						code: 500,
						success: false,
						message: "Internal Server Error",
						data: null,
					},
					properties: {
						status: { type: "number", example: 500 },
						success: { type: "boolean", example: false },
						message: { type: "string", example: "Internal Server Error" },
						data: { type: "null", example: null },
					},
				},
			}),
		);
	}

	if (serviceUnavailable) {
		decorators.push(
			ApiServiceUnavailableResponse({
				description: "Service Unavailable",
				schema: {
					example: {
						code: 503,
						success: false,
						message: "Service Unavailable",
						data: null,
					},
					properties: {
						status: { type: "number", example: 503 },
						success: { type: "boolean", example: false },
						message: { type: "string", example: "Service Unavailable" },
						data: { type: "null", example: null },
					},
				},
			}),
		);
	}

	return applyDecorators(...decorators);
};

export const ApiSuccessResponse = <T>(
	status: number,
	description: string,
	example: T,
	exampleProperties?: SchemaObject | ReferenceObject,
) => {
	return ApiResponse({
		status,
		description,
		schema: {
			example: {
				code: status,
				success: true,
				message: description,
				data: example,
			},
			properties: {
				status: { type: "number", example: status },
				success: { type: "boolean", example: true },
				message: { type: "string", example: description },
				data: exampleProperties || {},
			},
		},
	});
};

export const DefaultApiNotFoundResponse = (entityName?: string) => {
	return ApiNotFoundResponse({
		description: `${entityName ?? "Entity"} not found`,
		schema: {
			example: {
				message: `${entityName ?? "Entity"} not found`,
				error: "Not Found",
				statusCode: 404,
			},
			properties: {
				status: { type: "number", example: 404 },
				success: { type: "boolean", example: false },
				message: {
					type: "string",
					example: `${entityName ?? "Entity"} not found`,
				},
			},
		},
	});
};

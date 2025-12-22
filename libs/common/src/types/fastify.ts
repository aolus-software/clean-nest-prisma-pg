import { UserInformation } from "@repositories";

declare module "fastify" {
	interface FastifyRequest {
		user: UserInformation;
	}
}

export {};

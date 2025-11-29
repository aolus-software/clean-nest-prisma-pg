import { UserInformation } from "@repositories";

declare module "express" {
	interface Request {
		user: UserInformation;
	}
}

export {};

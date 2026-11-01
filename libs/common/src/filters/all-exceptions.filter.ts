import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { FastifyReply } from "fastify";
import { ResponseHandler } from "../response/response";

/* Guards, pipes and the router throw before a controller's try/catch runs,
   so their errors would otherwise reach Nest's default filter. Routing them
   through ResponseHandler keeps every error in the house envelope. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost): void {
		const res = host.switchToHttp().getResponse<FastifyReply>();
		ResponseHandler.handleError(res, exception);
	}
}

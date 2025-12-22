import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	UnprocessableEntityException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { createWriteStream } from "fs";
import { extname, join } from "path";
import { FastifyRequest } from "fastify";
import { MultipartFile } from "@fastify/multipart";
import { allowedImageMimeTypes, maxUploadFile } from "@utils";

export interface FileUploadOptions {
	destination?: string;
	preserveOriginalName?: boolean;
	maxUploadFile?: number;
	allowedMimeTypes?: string[];
}

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
	constructor(private readonly options: FileUploadOptions = {}) {}

	async intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Promise<Observable<any>> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();

		const file = (await request.file()) as MultipartFile | undefined;

		if (!file) {
			throw new UnprocessableEntityException("File is required");
		}

		const allowed = this.options.allowedMimeTypes?.length
			? this.options.allowedMimeTypes
			: allowedImageMimeTypes;

		if (!allowed.includes(file.mimetype)) {
			throw new UnprocessableEntityException({
				message: "Unsupported file type",
				error: {
					mimeType: [
						`Unsupported ${file.mimetype}, expected: ${allowed.join(", ")}`,
					],
				},
			});
		}

		const uploadDir = this.options.destination || "./uploads";

		const ext = extname(file.filename);
		const name = this.options.preserveOriginalName
			? file.filename.replace(ext, "")
			: file.fieldname;

		const filename = `${name}-${Date.now()}${ext}`;
		const filepath = join(uploadDir, filename);

		await new Promise<void>((resolve, reject) => {
			const stream = createWriteStream(filepath);

			file.file.pipe(stream);

			file.file.on("error", reject);
			stream.on("finish", () => resolve());
		});

		// attach to request for controller use
		(request as any).uploadedFile = {
			filename,
			filepath,
			mimetype: file.mimetype,
		};

		return next.handle();
	}
}

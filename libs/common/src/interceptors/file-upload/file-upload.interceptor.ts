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
import { allowedImageMimeTypes } from "@utils";
export interface UploadedFileInfo {
	filename: string;
	filepath: string;
	mimetype: string;
}

export interface FastifyRequestWithUpload {
	uploadedFile: UploadedFileInfo;
}

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
	): Promise<Observable<unknown>> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();

		const file: MultipartFile | undefined = await request.file();

		if (!file) {
			throw new UnprocessableEntityException("File is required");
		}

		const allowedMimeTypes = this.options.allowedMimeTypes?.length
			? this.options.allowedMimeTypes
			: allowedImageMimeTypes;

		if (!allowedMimeTypes.includes(file.mimetype)) {
			throw new UnprocessableEntityException({
				message: "Unsupported file type",
				error: {
					mimeType: [
						`Unsupported ${file.mimetype}, expected one of: ${allowedMimeTypes.join(
							", ",
						)}`,
					],
				},
			});
		}

		const uploadDir = this.options.destination ?? "./uploads";
		const extension = extname(file.filename);

		const baseName = this.options.preserveOriginalName
			? file.filename.replace(extension, "")
			: file.fieldname;

		const filename = `${baseName}-${Date.now()}${extension}`;
		const filepath = join(uploadDir, filename);

		await new Promise<void>((resolve, reject) => {
			const stream = createWriteStream(filepath);

			file.file.on("error", (err: Error) => reject(err));
			stream.on("error", (err: Error) => reject(err));
			stream.on("finish", () => resolve());

			file.file.pipe(stream);
		});

		const uploadedFile: UploadedFileInfo = {
			filename,
			filepath,
			mimetype: file.mimetype,
		};

		Object.assign(request as FastifyRequest & FastifyRequestWithUpload, {
			uploadedFile,
		});

		return next.handle();
	}
}

import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { CustomValidationPipe } from "@common/pipes/custom-validation/custom-validation.pipe";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, new FastifyAdapter());
	app.useGlobalPipes(new CustomValidationPipe());

	const config = new DocumentBuilder()
		.setTitle(process.env.APP_NAME ?? "clean nest")
		.setDescription("The api docs for " + process.env.APP_NAME)
		.setVersion("1.0")
		.build();

	const document = SwaggerModule.createDocument(app, config);
	app.use(
		"/reference",
		apiReference({
			content: document,
			withFastify: true,
			theme: "bluePlanet",
		}),
	);

	// CORS Configuration=====================
	const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGINS?.split(",") ?? [
		"http://localhost:3000",
	];
	const ALLOWED_METHODS = process.env.ALLOWED_METHODS?.split(",") ?? [
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"OPTIONS",
	];
	const ALLOWED_HEADERS = process.env.ALLOWED_HEADERS?.split(",") ?? [
		"Content-Type",
		"Authorization",
	];

	app.enableCors({
		origin: ALLOWED_ORIGIN,
		methods: ALLOWED_METHODS,
		allowedHeaders: ALLOWED_HEADERS,
		maxAge: 0,
		credentials: false,
	});

	const APP_PORT = process.env.APP_PORT ?? 8001;
	await app.listen(APP_PORT);
}
bootstrap()
	.then(() => {
		// eslint-disable-next-line no-console
		console.log(
			`Application is running on: http://localhost:${process.env.APP_PORT ?? 8001}`,
		);
	})
	.catch((err) => {
		// eslint-disable-next-line no-console
		console.error("Error during app bootstrap:", err);
		process.exit(1);
	});

import { Module } from "@nestjs/common";
import { join } from "path";
import {
	AcceptLanguageResolver,
	HeaderResolver,
	I18nModule as NestI18nModule,
	QueryResolver,
} from "nestjs-i18n";
import { getEnv } from "@config";

/* Configures nestjs-i18n with the en/id catalogs and the request-language
   resolvers (?lang query, x-lang header, Accept-Language).

   disableMiddleware is required on the Fastify adapter: the i18n middleware
   sets the language but its async context does not propagate to the route
   handler under Fastify, which would make I18nContext.current() undefined and
   silently fall back to the default language. With the middleware off, the
   global I18nLanguageInterceptor (registered by NestI18nModule) resolves the
   language and wraps the handler in async context, so translations resolve in
   the controller, the validation pipe (CustomValidationPipe), services,
   guards, and the response handler. */
@Module({
	imports: [
		NestI18nModule.forRoot({
			fallbackLanguage: "en",
			fallbacks: {
				"en-*": "en",
				"id-*": "id",
			},
			disableMiddleware: true,
			loaderOptions: {
				path: join(process.cwd(), "libs", "common", "src", "i18n", "lang"),
				watch: getEnv().NODE_ENV !== "production",
			},
			resolvers: [
				new QueryResolver(["lang", "locale"]),
				new HeaderResolver(["x-lang", "x-custom-lang"]),
				AcceptLanguageResolver,
			],
		}),
	],
})
export class I18nModule {}

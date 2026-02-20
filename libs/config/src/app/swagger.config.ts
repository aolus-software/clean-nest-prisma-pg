import { getEnv } from "@config/env";
import { DocumentBuilder } from "@nestjs/swagger";

export const swaggerConfig = new DocumentBuilder()
	.setTitle(getEnv().APP_NAME)
	.setDescription(`The api docs for ${getEnv().APP_NAME}`)
	.setVersion("1.0")
	.addBearerAuth(
		{
			type: "http",
			scheme: "bearer",
			bearerFormat: "JWT",
			description: `Enter your JWT token in the format **Bearer &lt;token>**. You can get the token from the login endpoint.`,
			name: "Authorization",
			in: "header",
		},
		"Bearer",
	)
	.build();

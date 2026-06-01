---
paths:
  - "src/**/*.service.ts"
  - "libs/common/**/*.ts"
---

# Mail Rules

## Send through `MailService`

Inject `MailService` from `@common` and call `sendMail(...)`. This **enqueues** a BullMQ job (processed by `mail.processor.ts`) — it does not block the request. Use `sendEmailSync(...)` only when the email must be sent inline within the current request.

```ts
await this.mailService.sendMail({
	subject: "Verify your email address",
	to: user.email,
	template: "auth/verify-email",
	context: {
		name: user.name,
		verifyUrl: `${getEnv().FRONTEND_URL}/verify-email?token=${token}`,
	},
});
```

## Templates

`template` is a path (without extension) under the Handlebars templates directory, e.g. `"auth/verify-email"`, `"auth/forgot-password"`. `MailService` automatically injects `appName` and `frontendUrl` into every template context and prefixes the subject with the app name (and `[ENV]` outside production) — do not duplicate those.

## Frontend links

There is a single frontend app — build links from `getEnv().FRONTEND_URL`. Never hardcode a host or read `process.env` directly.

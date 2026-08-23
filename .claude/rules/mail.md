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

## Never enqueue inside a database transaction

`sendMail` pushes a job onto Redis, which shares no transaction with Postgres. Enqueuing inside
`db.transaction` / `prisma.$transaction` lets the worker send a link whose token row has not been
committed yet — the user clicks it and is told the token is invalid — and sends mail at all for a
write that rolled back. Return the token from the transaction and enqueue after it commits:

```ts
const token = await db.transaction(async (tx) => {
	// ... write the user and the token row
	return verificationToken;
});

await this.mailService.sendMail({ /* ... */ });
```

## Retries and failures

The queue is registered with `attempts: 3` and exponential backoff, and the processor carries an
`@OnWorkerEvent("failed")` handler. Without both, a transient SMTP failure silently and permanently
drops a verification or reset email — one attempt, no retry, nothing in the logs. Keep them.

## Templates

`template` is a path (without extension) under the Handlebars templates directory, e.g. `"auth/verify-email"`, `"auth/forgot-password"`. `MailService` automatically injects `appName` and `frontendUrl` into every template context and prefixes the subject with the app name (and `[ENV]` outside production) — do not duplicate those.

## Frontend links

There is a single frontend app — build links from `getEnv().FRONTEND_URL`. Never hardcode a host or read `process.env` directly.

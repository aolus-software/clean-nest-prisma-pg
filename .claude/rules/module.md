---
paths:
  - "src/**/*.module.ts"
---

# Module Rules

## One domain entity per module

A module manages exactly **one** domain entity — one controller and one service. A module registering controllers/services for two unrelated entities violates single responsibility and must be split.

```ts
@Module({
	controllers: [UsersController],
	providers: [UsersService],
	imports: [MailModule],
})
export class UsersModule {}
```

## Imports — only what you inject

The database is a module-level singleton (`prisma` from `@repositories`), **not** a provider you import. Repositories are factory functions called directly. So a module does **not** import a "repositories module" just to query the DB.

`imports` should list only modules whose providers this module actually injects — e.g. `MailModule` (for `MailService`), `CacheModule`, etc. Do not add imports speculatively.

## What counts as a second entity (split it)

- A second controller on a different base route.
- A second service operating on a different primary entity.
- A second set of DTOs scoped to a different entity in the same folder.

Group related single-entity modules under a parent feature module (e.g. `SettingsModule` imports `UsersModule`, `RolesModule`, `PermissionsModule`).

## Cross-entity access

When a service needs another entity's data, do not merge modules. Either:

1. Import the other module and inject its exported service, or
2. Call the other entity's repository factory directly for read-only queries (it uses the shared `prisma`, no DI needed).

## Checklist

- [ ] Exactly one controller and one service registered.
- [ ] Module name matches the entity (`UsersModule` for users).
- [ ] `imports` contains only modules whose providers are injected.
- [ ] No DTOs for a different entity in the same directory.

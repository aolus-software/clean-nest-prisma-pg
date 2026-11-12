---
paths:
  - "prisma/schema.prisma"
  - "prisma/**/*.ts"
---

# Prisma Schema Rules

## File and naming conventions

- The schema lives in a single file: `prisma/schema.prisma`.
- Models are `PascalCase` singular (`User`, `EmailVerification`, `Role`, `Permission`, `UserRole`, `RolePermission`).
- Fields are `camelCase` (`createdAt`, `emailVerifiedAt`, `deletedAt`).
- Define enums in `PascalCase` with `UPPER_CASE` members and reuse the Prisma-generated enum in code:

```prisma
enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  BLOCKED
}
```

## Standard columns

- Primary key: `id String @id @default(uuid()) @db.Uuid`.
- Timestamps: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
- Soft delete: include `deletedAt DateTime?` on entities that are soft-deleted, and add an index covering it (`@@index([deletedAt])`) plus indexes on columns frequently queried together (e.g. `email`).
- Use `@db.*` native type annotations where they matter (`@db.VarChar(255)`, `@db.Uuid`).

## Relations

Declare both sides of each relation. Join tables (`UserRole`, `RolePermission`) carry the foreign keys with `@relation(fields: [...], references: [...])` and are indexed on the lookup columns. The composite unique leads with `userId` / `roleId`, so the second column has its own index (`idx_user_role_role_id`, `idx_role_permission_permission_id`) for "who holds this role" and "which roles grant this permission".

## Indexes in place

- `idx_user_email_live_unique` — a **partial unique index** on `User.email WHERE "deletedAt" IS NULL`, declared with `@@unique([email], map: ..., where: raw(...))` under the `partialIndexes` preview feature. Live emails are unique at the database level and a soft-deleted user's email is reusable. The services' `UserRepository().findByMail` check still runs first, so the caller gets a 422 rather than a constraint error.
- `idx_user_email`, `idx_user_deleted_at` on `User`.
- `idx_email_verification_user_id_used_at`, `idx_reset_password_user_id_used_at` — `(userId, usedAt)` on the token tables, beside the unique `token`.

## Migrations and generation

The schema is the source of truth. After any change:

```bash
make db-migrate-dev      # prisma migrate dev + prisma generate
```

- Run `make db-generate` (`prisma generate`) when you only need to refresh the typed client.
- Never hand-edit generated migration SQL under `prisma/migrations/`.
- Seed data lives in `prisma/seed/` and runs via `make db-seed` (`bun run seed`).

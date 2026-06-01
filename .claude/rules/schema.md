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

Declare both sides of each relation. Join tables (`UserRole`, `RolePermission`) carry the foreign keys with `@relation(fields: [...], references: [...])` and are indexed on the lookup columns.

## Migrations and generation

The schema is the source of truth. After any change:

```bash
make db-migrate-dev      # prisma migrate dev + prisma generate
```

- Run `make db-generate` (`prisma generate`) when you only need to refresh the typed client.
- Never hand-edit generated migration SQL under `prisma/migrations/`.
- Seed data lives in `prisma/seed/` and runs via `make db-seed` (`bun run seed`).

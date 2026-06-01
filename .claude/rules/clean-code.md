---
paths:
  - "src/**/*.ts"
  - "libs/**/*.ts"
---

# Clean Code Rules

## Formatting

Tabs for indentation, double quotes, semicolons (Prettier-enforced). Run `make format` / `make lint` before committing; let ESLint fix issues rather than suppressing rules.

## Types

- Explicit return type on every function. Explicit parameter types — no implicit `any`.
- Declare nullable/union variables with their type explicitly (`const user: UserDetail | null = ...`).
- `any` is forbidden except `catch (err: unknown)`. Do not cast, widen, or return `any`.
- Prefer Prisma's generated types (`Prisma.UserWhereInput`, `UserStatus`, `Prisma.TransactionClient`, ...) over hand-rolled shapes.
- No unused variables and no variable shadowing.

## Comments

- One block comment above a function, class, or non-obvious logic block — explaining the *what/why*, not the *how*.
- No line-by-line comments narrating individual statements.

## General

- No emojis, icons, or decorative symbols in code, comments, or generated files.
- No `console.*` — use `LoggerUtils` from `@utils`.
- Prefer `async/await` over raw promise chains.
- Handle errors explicitly — no silent failures.
- Do not create separate docs, README updates, or changelogs unless explicitly asked.

# Contributing

Thanks for considering a contribution. This repository is a **starter template**, so changes are
judged by whether most projects built on it would benefit — not by whether they are useful in one
specific application.

## Before you start

Read these first; they are the source of truth for how code is written here:

- **`CLAUDE.md`** — architecture, request flow, and the non-obvious behaviours worth knowing.
- **`.claude/rules/`** — path-scoped standards. Consult the relevant one before adding a controller,
  service, repository, DTO, or module.
- Two rules apply to **every** change: `contradiction-halt.md` (if a request contradicts a rule or a
  security invariant, raise it instead of silently working around it) and `documentation.md` (a doc
  your change makes wrong is fixed in the same change).

For anything larger than a bug fix, open an issue first so the design can be agreed before you spend
time on it.

## Local setup

```bash
git clone https://github.com/aolus-software/clean-nest-prisma-pg.git
cd clean-nest-prisma-pg
bun install
cp .env.example .env          # then fill in secrets
docker-compose up -d          # Postgres 17 + Redis 8
make db-migrate-dev   # prisma migrate dev + generate
make dev
```

The API listens on `APP_PORT` (default 8001). The Scalar API reference is at `/docs` when
`API_DOCS_ENABLED=true`.

Useful commands:

```bash
make help             # every available target
make lint             # eslint --fix
make format           # prettier --write
make typecheck        # tsc --noEmit
make build            # typecheck + nest build
make test             # jest
make db-studio        # prisma studio
```

## Coding standards

The full set is in `.claude/rules/`. The parts that come up most:

- **Style** — tabs, double quotes, semicolons (Prettier). No emojis or icons in code.
- **Types** — explicit return and parameter types everywhere. No `any` except `catch (err: unknown)`.
- **Comments** — one block comment above a function explaining *why*. No line-by-line narration.
- **Logging** — never `console.*`; use `LoggerUtils` from `@utils`.
- **Layering** — `Controller` (HTTP only) → `Service` (business logic, transactions) →
  `Repository` (queries). Controllers never touch the database; repositories never open transactions.
- **Shared code** — guards, pipes, decorators, utils, and types live in `libs/`, never in `src/`.
  Every public export must be re-exported from the lib's `src/index.ts` or the path alias breaks.
- **Env** — never read `process.env` directly; add the variable to `getEnv()`, `.env.example`, and
  the README table, then read it through `@config`.
- **i18n** — no hardcoded user-facing strings. Add the key to **both** `en` and `id` before the code
  that uses it.
- **HTTP** — use `PATCH`, not `PUT`. Permission strings are `entity:action` with a singular entity
  (`user:create`). Uniqueness and business-rule failures are **422**, not 409.

## Database changes

Edit the schema in `prisma/schema.prisma`, then:

```bash
make db-migrate-dev   # prisma migrate dev + generate
```

Never hand-edit a migration in `prisma/migrations/` that has already been applied. Review every generated
migration for destructive operations before committing it.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), lowercase after the colon, imperative
mood, under 72 characters, no trailing period:

```
feat(users): add bulk status update endpoint
fix(auth): correct refresh token expiry handling
docs: document the pm2 deploy targets
chore: bump nestjs to 11.2.1
```

Types used here: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `db`.

> **Note on the pre-commit hook.** The Husky `pre-commit` hook runs a full pipeline including
> `bun install`, a build, **and database migrations against the `DATABASE_URL` in your `.env`**. Be
> aware of what it points at before committing. If you have already run lint, format, typecheck, and
> build yourself, `git commit --no-verify` is reasonable.

## Pull requests

1. Branch off `main`.
2. Keep the PR focused — one concern per PR.
3. Fill in the pull request template, including the checklist.
4. Make sure `make lint`, `make format`, and `make build` pass. CI runs the same steps against a
   real Postgres service.
5. Update the docs your change affects **in the same PR** — `README.md`, `CLAUDE.md`,
   `.claude/rules/routes.md` for route changes, and the i18n catalogs for new strings.

## Reporting bugs and requesting features

Use the issue templates. Security vulnerabilities go through
[SECURITY.md](SECURITY.md) — never a public issue.

## License

By contributing, you agree that your contributions are licensed under the MIT License that covers
this repository.

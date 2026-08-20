## What does this change?

<!-- One or two sentences. What is different after this PR that was not true before? -->

## Why?

<!-- The problem being solved. Link the issue if there is one: Closes #123 -->

## Type of change

- [ ] `feat` — new feature, module, or endpoint
- [ ] `fix` — bug fix
- [ ] `refactor` — restructuring, no behaviour change
- [ ] `docs` — documentation only
- [ ] `test` — adding or updating tests
- [ ] `chore` — config, dependencies, tooling
- [ ] `db` — schema or migration change

## Checklist

<!-- The repo's standards live in .claude/rules/. Consult the relevant rule before ticking. -->

- [ ] Commit messages follow Conventional Commits (`.claude/rules/commit.md`).
- [ ] `make lint`, `make format`, and `make build` pass locally.
- [ ] Layering respected: Controller (HTTP only) → Service (logic, transactions) → Repository (queries).
- [ ] No `any` outside `catch (err: unknown)`; explicit return and parameter types.
- [ ] No `console.*` — used `LoggerUtils` from `@utils`.
- [ ] Every new user-facing string added to **both** `en` and `id` catalogs (`.claude/rules/i18n.md`).
- [ ] New endpoints carry `@ApiTags`, `@ApiBearerAuth("Bearer")` if guarded, and
      `@ApiStandardResponses` / `@ApiSuccessResponse` (`.claude/rules/response-codes.md`).
- [ ] New or changed routes gated with `@PermissionAuth` / `@RoleAuth` and recorded in
      `.claude/rules/routes.md`.
- [ ] Any new env var added to `getEnv()`, `.env.example`, and the README table.
- [ ] Docs my change makes wrong are fixed **in this PR** (`.claude/rules/documentation.md`).

## Database changes

<!-- Delete this section if the PR touches no schema. -->

- [ ] Schema edited in `prisma/schema.prisma`.
- [ ] Migration generated and applied with `make db-migrate-dev` — no already-applied migration was hand-edited.
- [ ] Migration reviewed for destructive operations (dropped columns, narrowed types, lost data).

## How was this tested?

<!-- Commands run, endpoints exercised, and what you saw. "It builds" is not testing. -->

## Screenshots or output

<!-- Optional: request/response bodies, Swagger screenshots, logs. -->

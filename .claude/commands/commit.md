---
name: commit-changes
description: "Stage and commit current changes with a Conventional Commit message derived from the diff. A heavy Husky pre-commit hook runs install, format, lint, migrations, typecheck and build against the whole tree."
risk: safe
source: local
---

# Commit Changes

## Steps

1. Run `git status` to see modified, added, and deleted files.
2. Run `git diff` (staged + unstaged) to understand what changed.
3. Run `git log --oneline -5` to match the existing message style.
4. Determine the Conventional Commit type from the diff:

| Type | When to use |
|---|---|
| `feat` | New feature, module, or endpoint |
| `fix` | Bug fix |
| `refactor` | Restructuring with no behaviour change |
| `style` | Formatting/whitespace only, no logic change |
| `docs` | Markdown / README / CLAUDE.md / rules changes |
| `test` | Adding or updating Jest tests |
| `chore` | Config, dependencies, env, tooling |
| `db` | Prisma schema or migration changes |

5. Stage the relevant files with `git add -A`. Never stage `.env`, secrets, or large binaries.
6. Commit using `<type>(<optional-scope>): <short imperative summary>`. Examples:
   - `feat(users): add bulk status update endpoint`
   - `fix(auth): correct refresh token expiry handling`
   - `db(rbac): add role_permissions index`
   - `chore: bump nestjs to 11.1.24`

   The summary must be lowercase after the colon, imperative ("add"/"fix", not "added"/"fixes"), under 72 chars, no trailing period.
7. The Husky pre-commit hook is **not** `lint-staged` — it runs `bun install`, `format`, `lint`, `prisma migrate deploy`, `prisma generate`, `tsc --noEmit`, and `build` against the **whole tree**, so it rewrites unstaged files and applies pending migrations to `DATABASE_URL`. Check `git status` afterwards. If you already ran `make lint`, `make format`, and `make build` this session and they passed, you may `git commit -m "..." --no-verify`.
8. After committing, report the commit hash + message, the files included, and whether lint/format made any auto-fixes.
9. Ask the user whether to push.

## Do NOT

- Do not use `--no-verify` unless allowed by the user or by `.claude/rules/commit.md`.
- Do not amend an existing commit unless explicitly asked.
- Do not commit `.env`, `dist/`, `uploads/`, or `node_modules/`.

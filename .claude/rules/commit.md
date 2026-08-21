---
paths:
  - "/**/*"
---

# Commit Rules

## Pre-commit hook

`.husky/pre-commit` is **not** a `lint-staged` hook — there is no `lint-staged` key in `package.json` and no `lint-staged` dependency. The hook runs these seven commands against the **whole tree**, in order:

```
bun install
bun run format
bun run lint
bunx --bun prisma migrate deploy
bunx --bun prisma generate
bun run tsc --noEmit
bun run build
```

Two consequences that a `lint-staged` hook would not have:

- **`format` and `lint:fix` rewrite files you did not stage.** Check `git status` after the hook and stage or discard what it produced deliberately.
- **It touches the database.** `prisma migrate deploy` applies every pending migration to whatever `DATABASE_URL` points at, and `prisma generate` rewrites the generated client. Committing therefore migrates whichever database your `.env` happens to name.

If you have **already** run `make lint`, `make format`, and `make build` in this session and they passed, you may skip the hook with `git commit -m "..." --no-verify`. Do not use `--no-verify` otherwise unless the user explicitly allows it. If the hook fails, fix the cause and make a **new** commit — never `--amend` over a failed hook.

## Message format

Use Conventional Commits — see the `Commit Changes` workflow in `.claude/commands/commit.md` for the full workflow and type table. Summary must be lowercase after the colon, imperative mood, under 72 chars, no trailing period.

## Never commit

`.env`, secrets, `node_modules/`, `dist/`, `uploads/`, or generated migration noise unrelated to the change.

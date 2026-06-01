---
paths:
  - "/**/*"
---

# Commit Rules

## Pre-commit hook

A Husky `pre-commit` hook runs `lint-staged`, which executes `bun run lint` and `bun run format` on staged `*.{ts,js}` files. Let it run normally.

If you have **already** run `make lint`, `make format`, and `make build` in this session and they passed, you may skip the redundant hook with `git commit -m "..." --no-verify`. Do not use `--no-verify` otherwise unless the user explicitly allows it.

## Message format

Use Conventional Commits — see the `Commit Changes` workflow in `.claude/commands/commit.md` for the full workflow and type table. Summary must be lowercase after the colon, imperative mood, under 72 chars, no trailing period.

## Never commit

`.env`, secrets, `node_modules/`, `dist/`, `uploads/`, or generated migration noise unrelated to the change.

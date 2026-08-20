---
paths:
  - "/**/*"
---

# Documentation Upkeep Rule

## Principle: docs are part of the change, not an afterthought

When a change makes a documentation file wrong, fixing that doc belongs to the **same change** — not
a follow-up, not "later". Code and docs are committed together so the repository never carries
documentation that contradicts the code.

This is not a mandate to rewrite docs on every commit. It is: **if you changed something a doc
describes, update that doc in the same change.** If nothing a doc covers changed, leave it alone.

## Docs that must stay in sync

| Doc | Update it when… |
|---|---|
| `README.md` | setup steps, scripts, env vars, or the high-level architecture change |
| `CLAUDE.md` | a lib / path alias, the request flow, a "non-obvious bit", a convention, or a new module / runtime surface changes |
| `Makefile` | a canonical command is added, renamed, or removed — `CLAUDE.md` quotes it, so both move together |
| `.claude/rules/routes.md` | any route is added, renamed, re-gated, or removed |
| `.claude/rules/*.md` | a coded convention changes, or a new pattern ships with no rule yet — write one |
| `.claude/commands/*.md` | a command's workflow or scope changes |
| `libs/common/src/i18n/lang/{en,id}/*.json` | a user-facing string is added — **both languages, in the same change** (`i18n.md`) |
| `libs/config/src/env/index.ts` | a new env var is read — it is validated there or nowhere, and `README.md` lists it |
| `prisma/schema.prisma` + migration | a model, field, enum, or relation changes — run `make db-migrate-dev`, never hand-edit an applied migration |

## What "up to date" means

- **Exact facts.** Path aliases, route lists, model and field names, env var names, permission
  strings, and commands must match reality. A stale env var name or a renamed helper is a
  documentation bug, not a nitpick.
- **No orphan references.** If you rename, move, or delete a file, function, permission, or rule,
  update every doc that names it. Do not leave pointers to things that no longer exist.
- **New surfaces get docs.** A new queue processor, guard, interceptor, external integration, or
  module that establishes a pattern needs its rule written, not just its code.
- **Swagger is documentation.** A new controller needs `@ApiTags`, `@ApiBearerAuth("Bearer")` if it
  is behind `AuthGuard`, and `@ApiStandardResponses` / `@ApiSuccessResponse` on every method — an
  endpoint that works but is undocumented in `/docs` is an incomplete change. See
  `response-codes.md`.
- **Comment density stays as-is.** One block comment above a function explaining *why*, never
  line-by-line narration. See `clean-code.md`.

## When a doc is wrong but the current task didn't cause it

Per `contradiction-halt.md`, if you notice a doc contradicting the code but fixing it falls outside
the requested task, **report it to the user** — do not silently rewrite unrelated docs. The
"update in the same change" duty covers the docs your own change affects.

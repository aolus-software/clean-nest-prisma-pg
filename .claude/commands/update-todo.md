---
name: update-todo
description: "Reconcile todo.md with the actual codebase state — mark done items, leave pending ones, refresh the date."
risk: safe
source: local
---

Analyze the current codebase state and update `todo.md` to accurately reflect what is done and what is pending. If `todo.md` does not exist, tell the user and stop — do not create one unless asked.

## Steps

### 1. Read current todo.md

Read the full `todo.md` at the project root.

### 2. Inspect codebase state (run in parallel)

```bash
git log --oneline -20
git status
```

Then read relevant sources to verify completion:

- `src/` — implemented feature modules (controllers, services, DTOs)
- `libs/` — shared code, repositories, config
- `prisma/schema.prisma` and `prisma/migrations/` — data model state

### 3. Update todo.md

- Mark items `[x]` only when the implementation actually exists and is complete.
- Leave `[ ]` for not-started or partial items.
- Update the `> Updated: YYYY-MM-DD` line at the top to today's date.
- Do NOT add new items unless the user asks — only reflect actual state.
- Do NOT remove unfinished items.

### 4. Report

Summarize what changed: how many items were marked complete, which ones, and what remains. Do NOT commit unless the user explicitly asks.

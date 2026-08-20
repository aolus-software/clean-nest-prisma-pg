# Skills

This directory holds engineering skills for Claude Code in this repo. The reference project (`aolus-software/clean-nest-drizzle-pg`) symlinks `.claude/skills/` to a managed `.agents/skills/` bundle. You said you'll author your own — below is the suggested set, grouped by purpose. Create one folder per skill, each with a `SKILL.md` (frontmatter `name` + `description`, then the instructions).

## Suggested skills to author

### Workflow & process
- **writing-plans** — break a feature request into a reviewable, step-by-step implementation plan before touching code.
- **test-driven-development** — write the failing Jest spec first, then implement to green, then refactor.
- **systematic-debugging** — reproduce, isolate, form a hypothesis, and verify a fix methodically instead of guessing.
- **code-review** — review a diff against the `.claude/rules/` standards (layering, types, response handling, RBAC).
- **subagent-driven-development** — fan work out to subagents for broad search / parallel implementation, then integrate.

### This codebase (NestJS + Prisma)
- **scaffold-crud-module** — generate a full module (controller + service + DTOs + repository) wired to `prisma`, following `controller-crud.md` / `service-crud.md` / `repository.md`.
- **add-prisma-model** — add a model to `prisma/schema.prisma`, run `make db-migrate-dev`, and surface it through a repository factory.
- **add-rbac-permission** — introduce a new `entity:action` permission, seed it, and gate endpoints with `@PermissionAuth`.
- **write-nestjs-spec** — author a Jest `*.spec.ts` for a service/controller with the testing module and mocked collaborators.
- **add-queued-job** — define a BullMQ queue + processor (mirrors the mail queue pattern) for background work.

### General engineering
- **nestjs-best-practices** — DI, module boundaries, guards/pipes/interceptors, Fastify-adapter specifics.
- **refactoring** — restructure without behaviour change, keeping the `Controller → Service → Repository` layering intact.
- **defense-in-depth** — input validation, sort/filter allow-listing, soft-delete and auth invariants.

## Format

```
.claude/skills/<skill-name>/SKILL.md
```

```markdown
---
name: <skill-name>
description: <one line — when this skill should trigger>
---

# <Skill Name>

<instructions / checklist / examples>
```

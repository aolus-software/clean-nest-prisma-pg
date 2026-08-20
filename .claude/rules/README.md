# Project Rules

Coding rules for the `clean-nest-prisma-pg` codebase. Each file is a focused, enforceable contract —
read the relevant one before writing code in that area.

Rules carry a `paths:` frontmatter block declaring where they apply. Two have none, because they
apply to **every** change regardless of path — read those two first.

## Always in scope

| Rule | Scope |
| ---- | ----- |
| [contradiction-halt.md](./contradiction-halt.md) | A request that contradicts a rule, the architecture, or a security invariant is reported and halted — never silently implemented or worked around |
| [documentation.md](./documentation.md) | A doc your change makes wrong is fixed in the **same** change; lists every doc that must stay in sync |

## Layer rules

| Rule | Applies to |
| ---- | ---------- |
| [nestjs.md](./nestjs.md) | `src/**/*.ts`, `libs/**/*.ts` — layering, DI, reuse-before-you-build, config and logging |
| [controller.md](./controller.md) | `src/**/*.controller.ts` — HTTP only, `ResponseHandler` + Fastify reply, guard wiring |
| [controller-crud.md](./controller-crud.md) | `src/**/*.controller.ts` — the canonical CRUD controller shape |
| [service.md](./service.md) | `src/**/*.service.ts` — business logic, transaction ownership |
| [service-crud.md](./service-crud.md) | `src/**/*.service.ts` — the canonical CRUD service shape, 422 field maps |
| [repository.md](./repository.md) | `libs/repositories/src/repositories/**/*.ts` — factory functions, transaction threading, exported sort/filter allow-lists |
| [module.md](./module.md) | `src/**/*.module.ts` — one domain entity per module |
| [dto.md](./dto.md) | `src/**/*.dto.ts` — class-validator + `i18nValidationMessage`, Swagger properties |
| [schema.md](./schema.md) | `prisma/schema.prisma`, `prisma/**/*.ts` — prisma schema rules |
| [shared-code.md](./shared-code.md) | `libs/**/*.ts` — what belongs in `@common` / `@config` / `@repositories` / `@utils`, and barrel exports |

## Cross-cutting concerns

| Rule | Applies to |
| ---- | ---------- |
| [response-codes.md](./response-codes.md) | `src/**/*.controller.ts` — the `@ApiStandardResponses` flag set, the 422 field-map key, status-code agreement |
| [routes.md](./routes.md) | `src/**/*.controller.ts` — flat resource naming, guard/permission gating, and the live route map |
| [rate-limiting.md](./rate-limiting.md) | `src/**/*.controller.ts`, `libs/common/**/*.ts` — the global throttler and when to override it |
| [i18n.md](./i18n.md) | `src/**/*.ts`, `libs/**/*.ts` — no hardcoded user-facing strings; `en` and `id` move together |
| [mail.md](./mail.md) | `src/**/*.service.ts`, `libs/common/**/*.ts` — queued mail via BullMQ, template context |
| [clean-code.md](./clean-code.md) | `src/**/*.ts`, `libs/**/*.ts` — formatting, typing, comment density, no `console.*` |
| [commit.md](./commit.md) | everything — Conventional Commits, the pre-commit hook, what never gets committed |
| [audit-findings.md](./audit-findings.md) | `docs/audit-findings.md`, `docs/**/*.md` — how a finding is written: five blocks, severity by consequence, CONFIRMED vs SUSPECT |

## How to use

- These rules complement `CLAUDE.md` — they don't replace it.
- When a rule conflicts with `CLAUDE.md`, the **rule file wins** (it is more specific).
- Don't introduce a new pattern without updating the relevant rule first — that is
  [documentation.md](./documentation.md).
- Slash commands that lean on these rules live in [`../commands/`](../commands/): `/commit`,
  `/update-todo`, and `/audit-flow` (which is governed by
  [audit-findings.md](./audit-findings.md)).

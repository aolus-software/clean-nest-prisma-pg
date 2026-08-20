---
paths:
  - "docs/audit-findings.md"
  - "docs/**/*.md"
---

# Audit Findings Writing Rules

How to **write** a finding in `docs/audit-findings.md` or any other report produced by
`/audit-flow`. This rule governs the *writing*, not the *sweeping* — which categories are swept and
how much of the tree is covered live in `.claude/commands/audit-flow.md`.

## Principle: write for the person who has to decide, not for the auditor who found it

A finding is read by someone who was **not** in the audit: the owner deciding whether to spend a day
on it, a developer picking it up three weeks later, a reviewer asking "is this real?". They do not
have the audit's context loaded. They must be able to read one finding **in isolation** and come away
knowing **what the thing is, how it goes wrong, what it costs, and what to do about it** — without
opening the code first.

A finding written as a note-to-self fails this. These are all real shapes to avoid:

> ❌ "`custom-validation.pipe.ts:38` uses `errors` instead of `error`."

That is true, cited, and useless to anyone who does not already know what the pipe does, who consumes
its output, or what actually breaks for a user. **Rewrite until a competent developer who has never
opened that file understands the problem.**

A `file:line` list is raw material, not a finished finding. A subagent's terse notes always get
expanded before they land in the document.

## Every finding has five blocks, in this order

Use these exact bolded inline labels — not `###` sub-headings — so findings scan uniformly:

```markdown
### §7.1 Field-level validation messages never reach the client — 🔴 bug — CONFIRMED

**Where:** `libs/common/src/pipes/custom-validation/custom-validation.pipe.ts:38`,
`libs/common/src/response/response.ts:44-52`,
`libs/common/src/decorators/api-response/api-response.decorator.ts:60-76`

**What this is.** When a request body fails a DTO's class-validator rules, `CustomValidationPipe`
turns those failures into a map of `{ fieldName: ["message", …] }` and throws it as a 422.
`ResponseHandler.handleError` catches that and spreads the thrown payload onto the standard error
envelope verbatim, so whatever key the pipe chose is the key the client receives. The frontend reads
that map to render each message under the input that caused it.

**Why this can happen.** The pipe throws the map under the key `errors` (plural), while every other
part of the contract says `error` (singular): `@ApiStandardResponses` documents a 422 body with
`error`, and a service throwing a uniqueness failure by hand uses `error` (`service-crud.md`). Since
`handleError` does not normalise the key, a DTO-level failure ships one spelling and a service-level
failure ships another, from the same status code on the same endpoint.

**What it costs.** A client parsing the documented contract finds no `error` key on any DTO
validation failure, so it cannot attach the message to a field. Every `@IsEmail`,
`@IsStrongPassword`, and `@IsNotEmpty` message degrades to a form-level banner or vanishes — on
`POST /users` and `POST /auth/register`, the two endpoints where per-field feedback matters most.

**What we should do.** Rename the key to `error` in the pipe's `exceptionFactory` so both producers
of a 422 agree. Roughly an hour including a controller-level test asserting the 422 body shape.
Confirm no consumer is already compensating for `errors` before renaming.
See `.claude/rules/response-codes.md` → "The 422 field map is keyed `error`, never `errors`".
```

### Block-by-block requirements

| Block | Must contain | Must not contain |
|---|---|---|
| **Where** | Every relevant `file:line`. A finding with no location is not a finding. | Vague "in the users module". |
| **What this is** | The mechanism in plain language — what the feature does, who calls it, what the normal path looks like. Assume the reader has never seen this subsystem. | Jargon used before it is explained; a line-by-line restatement of the code. |
| **Why this can happen** | The concrete trigger: who does what, in which order, under what conditions (an expired token, an unauthenticated caller, an empty field, a soft-deleted row). | "Could potentially", "may cause issues", "is not ideal". If you cannot name the trigger, it is a SUSPECT — say so. |
| **What it costs** | The observable damage — what a *user* or *operator* sees. Data exposed to whom, request that 500s, email never delivered, message shown in the wrong place. | Severity restated as a feeling ("this is bad"). |
| **What we should do** | A specific, implementable fix; rough effort; the rule it should follow; other sites with the same shape. | An actual code change — audits are read-only (below). |

Short findings may compress **What it costs** into **Why this can happen**, but never drop **What
this is** or **What we should do** — those two are what make the report usable by anyone other than
the author.

## Plain language rules

- **Expand every abbreviation and pattern name on first use in the document.** "soft delete (the row
  stays, `deletedAt` is stamped, and every read filters it out)", then the short form thereafter.
  Same for RBAC, N+1, TOCTOU, TTL, lost update. The reader may be an owner, not a backend engineer.
- **Prefer the domain word over the code word.** "any logged-in user can trigger a verification email
  for anyone else" beats "`resendVerifyEmail` has no `@PermissionAuth`". Give the code word right
  after, in the same sentence, so it stays greppable.
- **Say who.** Access-control findings must name the caller and the direction: *which* identity gets
  to do *what* to *whose* data. "Missing guard" is not a finding; "any authenticated user can reset
  another user's password" is.
- **Tell it as a sequence when it is a race, a pipeline, or a flow.** "Token issued → user requests a
  second reset → first token still valid" reads instantly; prose describing the same thing does not.
  The email-verification and password-reset flows are sequences — write them as steps.
- **One finding, one problem.** If a paragraph holds two independent defects, split it into two
  numbered findings so each can be fixed, argued, or dismissed on its own.
- **No unexplained numbers.** `paginationLength = 10` means nothing alone — say what it controls and
  why it is wrong here. Same for a TTL: name its unit, since `REDIS_TTL` and `CacheService` do not
  necessarily agree on seconds vs milliseconds.

## Severity — pick the tag from consequence, not from effort

| Tag | Meaning | Test |
|---|---|---|
| 🔴 **bug** | Wrong behaviour reachable today: data exposed to someone who should not see it, wrong data written, a request that fails, a secret in a log. | "Could I write a failing test for this against `main`?" |
| 🟠 **inconsistency / latent risk** | Correct today, but fragile — depends on a condition that could change, or diverges from a rule so the next change lands wrong. | "Does this break the moment someone adds the obvious next feature?" |
| 🟡 **hygiene** | Duplication, dead code, magic values, a misspelled filename. No behavioural consequence. | "Is the only cost developer time?" |
| 📄 **doc** | A doc, rule, or `CLAUDE.md` claim contradicts the code. | See `.claude/rules/documentation.md`. |

Security findings — a missing guard, an ungated route, a password hash or token reaching a log,
response, or Swagger example — are always 🔴 and always sort to the top of "Top priorities", ahead of
data integrity, then correctness, then hygiene/doc.

## Evidence: CONFIRMED vs SUSPECT

Every finding carries one, and the difference is honest:

- **CONFIRMED** — the path was traced end to end in the code and the trigger can be named. All five
  blocks are fillable.
- **SUSPECT** — the shape looks wrong but something is unverified (a guard might be applied
  elsewhere, a caller was not found, the seeded permission was not read). Say **what specifically is
  unverified** and **what would settle it**: "unverified: whether `PermissionGuard` falls back to
  denying when no `@PermissionAuth` metadata is present; reading
  `libs/common/src/guards/permission/permission.guard.ts` settles it."

Never promote a SUSPECT to CONFIRMED to make the report look stronger, and never bury one inside a
CONFIRMED list. A SUSPECT later disproved is marked **refuted**, not deleted.

## Document layout

1. **Header block** — sweep date, what was swept (paths and categories), which files were treated as
   ground truth, the severity legend, and an explicit read-only statement ("nothing below has been
   fixed").
2. **Coverage** — what the sweep actually reached and what it deliberately did not, per
   `.claude/commands/audit-flow.md`. A reader must be able to tell "clean" from "not looked at".
3. **Top priorities** — a numbered list ordered security → data integrity → correctness →
   hygiene/doc, each one line pointing at its section. This is the part the owner actually reads:
   write it last, and write it in the plainest language in the document.
4. **Sections** — one per audit category, numbered stably (`§1`–`§11`). A scoped sweep uses its own
   prefix (e.g. `B1`–`B11`) so numbers never collide across reports.
5. **Verified-correct notes** — where a category came back clean, say so and name what was checked.
   "Clean" with no evidence is indistinguishable from "not audited".

Finding numbers are permanent identifiers — commits, branches, and follow-up conversations cite them.
**Never renumber** an existing finding; new ones append.

## Resolved findings stay, marked

When a finding is fixed, do **not** delete it in the same change that fixes it:

- Append `— ✅ RESOLVED <YYYY-MM-DD>` to its heading.
- Add a short quote block at the top saying what changed and in which branch, and **keep the original
  text below it** under "Original finding follows." The next auditor needs to see the pattern that
  was wrong, not just that it went away.
- Add a one-line entry to the header block's resolved note so the summary stays readable without
  scrolling every section.
- Say plainly when a fix is *partial* or when a related finding survives it.

Pruning long-resolved items into a single "prior sweeps (see git history)" line is fine on a later
sweep, once the document gets unwieldy.

## Audits do not fix things

`/audit-flow` and every audit report are **read-only**. Findings are reported and the user decides
what gets fixed — that is `.claude/rules/contradiction-halt.md`, and it applies with no exceptions
here. "What we should do" *describes* a fix; it does not perform one. The one file an audit writes is
its findings document.

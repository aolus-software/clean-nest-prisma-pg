---
paths:
  - "/**/*"
---

# Contradiction Halt Rule

## Principle: the request can be wrong — surface it, don't silently "fix" it

The user (or a task, plan, or ticket) may ask for something that contradicts these rules, the
established architecture, or that would introduce a bug. **The user may be wrong, and that is
expected.** When you detect such a contradiction, **stop and tell the user, and do nothing else about
it** until they decide.

This applies whether the contradiction is with:

- a rule in `.claude/rules/*.md` or `CLAUDE.md`,
- the documented architecture or an existing pattern in the codebase,
- a latent bug the requested change would create or depend on, or
- a security / access-control invariant — guard coverage, `@PermissionAuth` gating, the soft-delete
  `deletedAt: null` filter, password hashing, token lifetimes, sort/filter allow-listing.

## What "do nothing" means

- **Do not implement the contradicting change**, not even a best-guess partial version.
- **Do not silently work around it** or quietly pick a different approach without saying so.
- **Do not fix the contradicting bug on your own initiative** as part of an unrelated task — report
  it and wait.

## What to do instead

1. State the contradiction plainly: what was requested, which rule / pattern / invariant it conflicts
   with (cite the rule file or `file:line`), and the concrete consequence — bug, data leak, broken
   contract, inconsistency.
2. If you have a compliant alternative, offer it as a recommendation — but still let the user choose.
3. Proceed once the user confirms. If they confirm the original request knowing the trade-off, that
   is their call to make, and you implement it in full.

## Scope

- This is a **halt-and-report** rule, not permission to refuse work. Once the user acknowledges the
  contradiction and decides, follow their decision.
- It does **not** apply to trivial style nits you can just conform to — match the surrounding code
  and move on. It applies to genuine contradictions with rules, architecture, security, or
  correctness.
- It does not license scope creep in the other direction either: noticing an unrelated defect means
  *reporting* it, not fixing it inside the current change.

## Invariants and known sharp edges

Confirmed facts about this repository as it stands. Do not build on any of them without raising it
first:

- **All three guards are global `APP_GUARD` providers, registered in order.** `AuthGuard` first, then
  `PermissionGuard`, then `RoleGuard`. Every route is authenticated by default; `@Public()` is the
  only opt-out. Two things break silently if disturbed: registering the RBAC guards before
  `AuthGuard` makes unauthenticated requests 403 instead of 401 (they run before `request.user`
  exists), and narrowing the guards' `getAllAndOverride([getHandler(), getClass()])` back to
  `getHandler()` alone makes every class-level `@PermissionAuth` / `@RoleAuth` silently inert.
- **`@PermissionAuth` is conjunctive; `@RoleAuth` is disjunctive.** The permission guard uses
  `.every(...)` — two strings mean both are required. The role guard uses `.some(...)` — any one
  suffices. Both short-circuit for `superuser`.
- **The cached `UserInformation` must be invalidated wherever authorization changes.** `AuthStrategy`
  resolves roles and permissions from `user:<id>` in Redis. The user update / delete / status paths
  drop the caller's entry, and the role update / delete paths drop the entry of **every holder** of
  that role. Skipping it leaves a revoked role in force until the entry expires.
- **Cache TTLs are seconds at the call site and milliseconds at the store.** `CacheService.set` takes
  seconds and multiplies; `CacheModule` does the same for its default. Passing a seconds value
  straight to `cache-manager` expires it 1000x too early.
- **There are no tests.** The repository contains zero `*.spec.ts` files, so none of the invariants in
  these rules has a regression test.

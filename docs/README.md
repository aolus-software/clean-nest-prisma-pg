# Documentation

Topic guides for `clean-nest-prisma-pg`. These describe the code as it stands — if one of them contradicts the
code, the code is right and the guide is a bug (see `.claude/rules/documentation.md`).

| Guide | What it covers |
| ----- | -------------- |
| [CONFIGURATION.md](./CONFIGURATION.md) | Every environment variable, its default, and what reads it |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | The response envelope, authentication, the full route map, and list-query parameters |
| [ERROR_HANDLING.md](./ERROR_HANDLING.md) | Which exception maps to which status, and the two error shapes a client can receive |
| [SECURITY.md](./SECURITY.md) | Authentication, RBAC, rate limiting, CORS and headers, password and token handling |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | The PM2 model, the deploy targets, and what each one runs |
| [SHARED_LIBRARIES.md](./SHARED_LIBRARIES.md) | What lives in `@common`, `@config`, `@repositories`, `@utils` |
| [audit-findings.md](./audit-findings.md) | Findings from the read-only audit sweeps, resolved and open |

For coding conventions, see [`.claude/rules/`](../.claude/rules/README.md) — those are contracts for
writing code, while these guides describe behaviour for someone consuming or operating the service.

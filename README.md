# Clean Nest Prisma PG

A production-ready NestJS starter kit using Prisma ORM with PostgreSQL database. This boilerplate provides a clean architecture foundation for building scalable server-side applications.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Database Management](#database-management)
- [Testing](#testing)
- [Deployment](#deployment)
- [Available Scripts](#available-scripts)
- [Make Commands](#make-commands)
- [Conventions and AI Agent Rules](#conventions-and-ai-agent-rules)
- [License](#license)

## Overview

Clean Nest Prisma PG is a starter template that combines NestJS framework with Prisma ORM and PostgreSQL. It follows clean architecture principles with a modular structure, separating concerns into reusable libraries for common utilities, repositories, and shared functionality.

## Features

- **Authentication System**: JWT-based authentication with access and refresh tokens, email verification, and password reset
- **RBAC**: Roles and permissions with `@PermissionAuth("entity:action")` / `@RoleAuth(...)` decorators, resolved per request and cached in Redis
- **Database ORM**: Prisma ORM with PostgreSQL adapter
- **Soft Deletes**: `deletedAt` on user rows — deletes stamp a timestamp, every read filters them out
- **Internationalization**: `nestjs-i18n` with `en` / `id` catalogs covering response messages, exception messages, validation messages, and email copy
- **Caching**: Redis-based caching with cache-manager
- **Queue System**: BullMQ for background job processing
- **Email Service**: Nodemailer integration with Handlebars templating, queued via BullMQ
- **Rate Limiting**: Built-in throttler registered globally for API protection
- **Validation**: Class-validator and class-transformer for request validation, with translated field-level errors
- **Code Quality**: ESLint, Prettier, and Husky for code standards
- **Docker Support**: Docker Compose setup for PostgreSQL and Redis
- **PM2 Deployment**: Per-environment process definitions with one-command deploys

## Tech Stack

- **Runtime**: Bun
- **Framework**: NestJS 11
- **Language**: TypeScript
- **ORM**: Prisma 7
- **Database**: PostgreSQL 17
- **Cache/Queue**: Redis 8
- **Authentication**: Passport.js with JWT strategy
- **Security**: Fastify Helmet
- **API Docs**: Scalar (via `@scalar/nestjs-api-reference`)
- **i18n**: nestjs-i18n
- **Env Validation**: envalid
- **Process Manager**: PM2 (`ecosystem.config.js`)
- **Testing**: Jest

## Project Structure

```
├── src/                    # Application source code
│   ├── auth/               # Authentication module
│   ├── health/             # Health check endpoints
│   ├── settings/           # Users, roles, permissions (RBAC)
│   ├── app.module.ts       # Root application module
│   ├── app.controller.ts   # Root controller
│   └── main.ts             # Application entry point
├── libs/                   # Shared libraries (path-aliased)
│   ├── common/             # @common — guards, pipes, decorators, i18n, mail, cache, throttler, ResponseHandler
│   ├── config/             # @config — env validation, CORS, Helmet, Swagger
│   ├── repositories/       # @repositories — prisma singleton and repository factories
│   └── utils/              # @utils — hashing, JWT, dates, logging, constants
├── prisma/                 # Prisma configuration
│   ├── migrations/         # Database migrations
│   ├── seed/               # Database seeders
│   └── schema.prisma       # Prisma schema definition
├── test/                   # End-to-end test configuration
├── .claude/                # Claude Code rules and slash commands
│   ├── rules/              # Path-scoped coding standards
│   └── commands/           # /commit, /update-todo, /audit-flow
├── docs/                   # Generated documentation (e.g. audit-findings.md)
├── ecosystem.config.js     # PM2 process definitions per environment
└── docker-compose.yml      # Docker services configuration
```

Shared code lives in `libs/` and is imported through the `@common`, `@config`, `@repositories`, and `@utils` aliases. Every public export must be re-exported from the lib's `src/index.ts` or the alias import will not resolve.

## Prerequisites

Before you begin, ensure you have the following installed:

- Bun (v1.0 or higher)
- PostgreSQL 17 (or use Docker)
- Redis 8 (or use Docker)
- Make (optional, for using Makefile commands)
- PM2 (only on deploy targets — `bun add -g pm2`, or run the deploy commands with `PM2='bunx pm2'`)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/aolus-software/clean-nest-prisma-pg.git
   cd clean-nest-prisma-pg
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

```bash
cp .env.example .env
```

4.  **Start the database services (using Docker)**

```bash
docker-compose up -d
```

5. **Run database migrations**

   ```bash
   make db-migrate-dev
   ```

   Or directly:

   ```bash
   bunx --bun prisma migrate dev
   bunx --bun prisma generate
   ```

6. **Seed the database (optional)**

   ```bash
   bun run seed
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Application
APP_NAME="Clean Nest"
APP_VERSION=1.0.0
APP_SECRET=your_secret_key_here
APP_PORT=8001
APP_URL=localhost:8001
APP_TIMEZONE=UTC
NODE_ENV=development

# API Documentation (Scalar UI at /docs)
API_DOCS_ENABLED=true

# Frontend
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db?schema=public"

# JWT Authentication
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
THROTTLER_TTL=60
THROTTLER_LIMIT=60

# CORS (comma-separated, defaults shown)
ALLOWED_ORIGINS="*"
ALLOWED_METHODS="GET,POST,PUT,PATCH,DELETE,OPTIONS"
ALLOWED_HEADERS="Content-Type, Authorization"
MAX_AGE=3600
CREDENTIALS=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# Mail Configuration
MAIL_HOST=
MAIL_PORT=
MAIL_SECURE=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM="noreply@example.com"
MAIL_DEFAULT_SUBJECT="Clean Nest"
```

All environment variables are validated by envalid in `libs/config/src/env/index.ts` and read through `getEnv()`. Never read `process.env` directly — a variable that is not declared there is not available to the app. A missing or invalid required variable exits the process at boot rather than failing later.

`NODE_ENV` accepts `development`, `dev`, `staging`, `production`, or `test`. The `dev` and `staging` values exist for the deployed PM2 apps (see [Deployment](#deployment)).

`API_DOCS_ENABLED` is the single switch for the `/docs` API reference and is independent of `NODE_ENV` — set it to `true` on any environment where the schema should be browsable, and leave it unset or `false` everywhere else. It defaults to `false` so an environment that never sets it cannot expose the schema by accident; `.env.example` turns it on for local development.
### Porting configuration between the sibling templates

This template has three siblings — `clean-nest-drizzle-pg`, `clean-nest-prisma-pg`, `clean-elysia`,
and `clean-elysia-prisma` — and the two families use **different names for the same concepts**. The
names are internally consistent within each family and are deliberately left alone; this table exists
so an `.env` can be carried across without silently losing a setting.

**14 variables are common to all four**: `APP_NAME`, `APP_PORT`, `APP_TIMEZONE`, `APP_URL`,
`DATABASE_URL`, `JWT_SECRET`, `MAIL_FROM`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `NODE_ENV`,
`REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_PORT`.

| Concern | NestJS family | Elysia family |
| ------- | ------------- | ------------- |
| App secret | `APP_SECRET` | `APP_KEY` |
| CORS origin | `ALLOWED_ORIGINS`, `ALLOWED_METHODS`, `ALLOWED_HEADERS`, `MAX_AGE`, `CREDENTIALS` | `ALLOWED_HOST` |
| Front-end URL | `FRONTEND_URL` | `CLIENT_URL` |
| Mail credentials | `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_DEFAULT_SUBJECT` | `MAIL_USER`, `MAIL_PASS` |
| Redis extra | `REDIS_TTL` | `REDIS_DB` |
| JWT | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | `JWT_SECRET` only |

**NestJS-only** (no Elysia equivalent): `API_DOCS_ENABLED`, `THROTTLER_TTL`, `THROTTLER_LIMIT`,
`APP_VERSION`.

**Elysia-only**: `APP_CLUSTER_MODE`, `APP_CLUSTER_WORKERS`, `LOG_LEVEL`, `CLICKHOUSE_HOST`,
`CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE`, and `APP_REUSE_PORT`
(`clean-elysia` only).

Two behaviours do **not** port, because the Elysia family has no equivalent variable:

- `API_DOCS_ENABLED` gates the docs UI here on an explicit flag defaulting to `false`, so an
  environment that never sets it cannot expose the schema. The Elysia family gates `/docs` on
  `APP_ENV !== "production"` instead, publishing it on any non-production deployment.
- `THROTTLER_TTL` / `THROTTLER_LIMIT` drive the throttler from the environment here. The Elysia rate
  limit is hardcoded in its security plugin.

## Running the Application

```bash
# Development mode (with hot-reload)
bun run start:dev

# Production mode
bun run build
bun run start:prod

# Debug mode
bun run start:debug
```

The application will be available at `http://localhost:8001` (or the port specified in your `.env` file).

API documentation is available at `http://localhost:8001/docs` whenever `API_DOCS_ENABLED=true`. The variable defaults to `false`, so a deployment that does not set it serves no documentation route at all.

## Database Management

```bash
# Run migrations in development
bunx --bun prisma migrate dev

# Create a named migration from schema changes
bunx --bun prisma migrate dev --name <name>

# Run migrations in production
bunx --bun prisma migrate deploy

# Generate Prisma client
bunx --bun prisma generate

# Open Prisma Studio (database GUI)
bunx --bun prisma studio

# Reset database (caution: deletes all data)
bunx --bun prisma migrate reset --force

# Run database seeder
bun run seed

# Run specific seed file
bun run seed:file FILE=filename
```

After editing `prisma/schema.prisma`, run `make db-migrate-dev` to create and apply the migration and regenerate the typed client. Run `make db-generate` alone if you only need to refresh the client — a freshly cloned checkout needs it before `bun run typecheck` will pass.

The seeder creates the permission catalog as `{user,role,permission}:{list,create,view,update,delete,restore}`, plus the default roles and a superuser.

## Testing

```bash
# Run unit tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:cov

# Run end-to-end tests
bun run test:e2e

# Debug tests
bun run test:debug
```

> **Note:** the starter ships the Jest configuration but no test files yet — `bun run test` currently matches zero specs. Unit tests are `*.spec.ts` alongside the code they cover; end-to-end tests use `test/jest-e2e.json`.

## Deployment

Deployments are managed with [PM2](https://pm2.keymetrics.io/) using `ecosystem.config.js`, which defines one app per environment:

| App name                          | Mode              | NODE_ENV     | Memory restart |
| --------------------------------- | ----------------- | ------------ | -------------- |
| `clean-nest-prisma-pg-dev`        | fork, 1 instance  | `dev`        | 2G             |
| `clean-nest-prisma-pg-staging`    | fork, 1 instance  | `staging`    | 2G             |
| `clean-nest-prisma-pg-production` | cluster, `max`    | `production` | 4G             |

Deploy with a single command per environment:

```bash
make deploy-dev
make deploy-staging
make deploy-production
```

Each target runs the full sequence — `bun install --frozen-lockfile`, `prisma migrate deploy`, `prisma generate`, `bun run build` — then **reloads** the PM2 app if it is already running (zero-downtime in cluster mode) or starts it from the ecosystem file if not, and finally `pm2 save`.

Managing running processes:

```bash
make pm2-status            # pm2 list
make pm2-logs-dev          # also pm2-logs-staging / pm2-logs-production
make pm2-stop-dev          # also pm2-stop-staging / pm2-stop-production
```

**Notes**

- `pm2` must be on your `PATH`. If it is not installed globally, pass it in: `make deploy-dev PM2='bunx pm2'`.
- Per-environment configuration comes from the `.env` file in the deploy directory (`env_file: ".env"`). The ecosystem file sets only `NODE_ENV`.
- Adding a new environment means adding it to **both** `ecosystem.config.js` and the `NODE_ENV` choices in `libs/config/src/env/index.ts` — envalid rejects an unknown value and the process exits at boot.
- Logs are written to `logs/<env>-out.log` and `logs/<env>-error.log`. The directory is created by the deploy target and is gitignored.
- To rename the apps, change `PM2_APP_PREFIX` in the `Makefile` and the `name` fields in `ecosystem.config.js` together.
- Cluster mode is safe because nothing here runs on a timer. If you add scheduled work, it will run once per instance unless you guard it with a lock.

## Available Scripts

| Script                | Description                               |
| --------------------- | ----------------------------------------- |
| `bun run build`       | Build the application                     |
| `bun run start`       | Start the application                     |
| `bun run start:dev`   | Start in development mode with hot-reload |
| `bun run start:debug` | Start in debug mode                       |
| `bun run start:prod`  | Start in production mode                  |
| `bun run lint`        | Lint and fix code                         |
| `bun run format`      | Format code with Prettier                 |
| `bun run typecheck`   | Run TypeScript type checks                |
| `bun run test`        | Run unit tests                            |
| `bun run test:e2e`    | Run end-to-end tests                      |
| `bun run test:cov`    | Run tests with coverage                   |
| `bun run seed`        | Run database seeders                      |

## Make Commands

For convenience, a Makefile is provided with shortcut commands:

| Command                  | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `make help`              | Display available commands                         |
| `make dev`               | Start development server                           |
| `make start`             | Start the project                                  |
| `make typecheck`         | Run type checks                                    |
| `make build`             | Build the project                                  |
| `make lint`              | Lint the project                                   |
| `make format`            | Format the project                                 |
| `make test`              | Run tests                                          |
| `make test-watch`        | Run tests in watch mode                            |
| `make db-generate`       | Generate the Prisma client                         |
| `make db-format`         | Format `schema.prisma` (run after editing it)      |
| `make db-migrate`        | Run database migrations (production)               |
| `make db-migrate-dev`    | Run database migrations (development) + generate   |
| `make db-seed`           | Run database seeder                                |
| `make db-reset`          | Reset the database                                 |
| `make db-studio`         | Start Prisma Studio                                |
| `make deploy-prep`       | Prepare for deployment (install, migrate, build)   |
| `make deploy-dev`        | Deploy and start/reload the `dev` PM2 app          |
| `make deploy-staging`    | Deploy and start/reload the `staging` PM2 app      |
| `make deploy-production` | Deploy and start/reload the `production` PM2 app   |
| `make pm2-status`        | List PM2 processes                                 |
| `make pm2-logs-<env>`    | Tail logs for `dev`, `staging`, or `production`    |
| `make pm2-stop-<env>`    | Stop `dev`, `staging`, or `production`             |

To install Make on Ubuntu:

```bash
sudo apt update
sudo apt install make
```

## Conventions and AI Agent Rules

Architecture notes and coding standards live alongside the code so both humans and AI coding agents work from the same source of truth:

- **`CLAUDE.md`** — project overview, commands, architecture, and the non-obvious behaviours worth knowing before making a change.
- **`.claude/rules/`** — path-scoped standards applied per file type: `controller.md`, `service.md`, `repository.md`, `dto.md`, `module.md`, `schema.md`, `i18n.md`, `response-codes.md`, `routes.md`, `rate-limiting.md`, `clean-code.md`, `shared-code.md`, and more.
- **`.claude/commands/`** — `/commit` (Conventional Commit workflow), `/update-todo`, and `/audit-flow` (read-only whole-codebase audit that writes explained findings to `docs/audit-findings.md` and never modifies code).

Core conventions at a glance:

- Request flow is **Controller → Service → Repository**. Controllers handle HTTP only, services own business logic and transactions, repositories run Prisma queries.
- Repositories are **factory functions**, not classes: `UserRepository().findOne(id)`. Pass a transaction client to the factory to join a transaction: `UserRepository(tx).findOne(id)`.
- Responses go through `ResponseHandler` and are sent via `res.status(code).send(...)`.
- Permission strings are `entity:action` with a singular entity (`user:create`).
- Use `PATCH`, not `PUT`, for updates.
- Style is tabs, double quotes, semicolons; no `any` except `catch (err: unknown)`.

## License

This project is licensed under the MIT License.

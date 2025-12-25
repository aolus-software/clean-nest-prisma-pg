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
- [Available Scripts](#available-scripts)
- [Make Commands](#make-commands)
- [License](#license)

## Overview

Clean Nest Prisma PG is a starter template that combines NestJS framework with Prisma ORM and PostgreSQL. It follows clean architecture principles with a modular structure, separating concerns into reusable libraries for common utilities, repositories, and shared functionality.

## Features

- **Authentication System**: JWT-based authentication with access and refresh tokens
- **Database ORM**: Prisma ORM with PostgreSQL adapter
- **Caching**: Redis-based caching with cache-manager
- **Queue System**: BullMQ for background job processing
- **Email Service**: Nodemailer integration with Handlebars templating
- **Rate Limiting**: Built-in throttler for API protection
- **Validation**: Class-validator and class-transformer for request validation
- **Code Quality**: ESLint, Prettier, and Husky for code standards
- **Docker Support**: Docker Compose setup for PostgreSQL and Redis

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript
- **ORM**: Prisma 7
- **Database**: PostgreSQL 17
- **Cache/Queue**: Redis 8
- **Authentication**: Passport.js with JWT strategy
- **Testing**: Jest

## Project Structure

```
├── src/                    # Application source code
│   ├── auth/               # Authentication module
│   ├── settings/           # Settings module
│   ├── app.module.ts       # Root application module
│   ├── app.controller.ts   # Root controller
│   └── main.ts             # Application entry point
├── libs/                   # Shared libraries
│   ├── common/             # Common utilities and shared code
│   ├── repositories/       # Database repository patterns
│   └── utils/              # Utility functions
├── prisma/                 # Prisma configuration
│   ├── migrations/         # Database migrations
│   ├── seed/               # Database seeders
│   └── schema. prisma       # Prisma schema definition
├── test/                   # End-to-end tests
├── docs/                   # Documentation
└── docker-compose.yml      # Docker services configuration
```

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher recommended)
- npm or yarn
- PostgreSQL 17 (or use Docker)
- Redis 8 (or use Docker)
- Make (optional, for using Makefile commands)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/aolus-software/clean-nest-prisma-pg.git
   cd clean-nest-prisma-pg
   ```

2. **Install dependencies**

   ```bash
   npm install
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
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Seed the database (optional)**

   ```bash
   npm run seed
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Application
APP_NAME="Clean Nest"
APP_SECRET=your_secret_key_here
APP_PORT=8001
APP_URL=localhost:8001
APP_TIMEZONE=UTC
APP_ENV=development

# Frontend
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/clean_nest? schema=public"

# JWT Authentication
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
THROTTLER_TTL=60
THROTTLER_LIMIT=60

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

## Running the Application

```bash
# Development mode (with hot-reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The application will be available at `http://localhost:8001` (or the port specified in your `.env` file).

## Database Management

```bash
# Run migrations in development
npx prisma migrate dev

# Run migrations in production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (caution: deletes all data)
npx prisma migrate reset --force

# Run database seeder
npm run seed

# Run specific seed file
npm run seed:file FILE=filename
```

## Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run end-to-end tests
npm run test:e2e

# Debug tests
npm run test:debug
```

## Available Scripts

| Script                | Description                               |
| --------------------- | ----------------------------------------- |
| `npm run build`       | Build the application                     |
| `npm run start`       | Start the application                     |
| `npm run start:dev`   | Start in development mode with hot-reload |
| `npm run start:debug` | Start in debug mode                       |
| `npm run start:prod`  | Start in production mode                  |
| `npm run lint`        | Lint and fix code                         |
| `npm run format`      | Format code with Prettier                 |
| `npm run test`        | Run unit tests                            |
| `npm run test:e2e`    | Run end-to-end tests                      |
| `npm run test:cov`    | Run tests with coverage                   |
| `npm run seed`        | Run database seeders                      |

## Make Commands

For convenience, a Makefile is provided with shortcut commands:

| Command               | Description                           |
| --------------------- | ------------------------------------- |
| `make help`           | Display available commands            |
| `make dev`            | Start development server              |
| `make build`          | Build the project                     |
| `make lint`           | Lint the project                      |
| `make format`         | Format the project                    |
| `make test`           | Run tests                             |
| `make test-watch`     | Run tests in watch mode               |
| `make db-migrate`     | Run database migrations (production)  |
| `make db-migrate-dev` | Run database migrations (development) |
| `make db-seed`        | Run database seeder                   |
| `make db-reset`       | Reset the database                    |
| `make db-studio`      | Start Prisma Studio                   |
| `make deploy-prep`    | Prepare for deployment                |

To install Make on Ubuntu:

```bash
sudo apt update
sudo apt install make
```

## License

This project is licensed under the MIT License.

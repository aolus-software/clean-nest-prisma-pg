# Clean Nest

A production-ready NestJS boilerplate with authentication, role-based access control (RBAC), and essential utilities for building scalable backend applications.

## Features

- **Authentication System** - Complete auth flow with JWT tokens, email verification, and password reset
- **Role-Based Access Control** - Flexible RBAC with roles and permissions
- **Caching Layer** - Redis-powered caching with utilities
- **Email Service** - Queue-based email sending with customizable templates
- **Database Management** - Prisma ORM with PostgreSQL and seeding scripts
- **Validation & Error Handling** - Comprehensive validation with custom error responses
- **Utility Libraries** - Date, string, number, hash, and encryption utilities
- **File Upload Support** - Fastify multipart file handling with validation

## Tech Stack

- **Framework:** NestJS with Fastify
- **Database:** PostgreSQL with Prisma ORM
- **Caching:** Redis (with ioredis)
- **Queue:** BullMQ for background jobs
- **Authentication:** JWT with Passport
- **Email:** Nodemailer with Handlebars templates
- **Validation:** class-validator & class-transformer

## Prerequisites

- Bun
- PostgreSQL 17+ (or see docker compose)
- Redis 7+ (or see docker compose)

## Installation

```bash
# Clone the repository
git clone https://github.com/aolus-software/clean-nest-prisma-pg.git
cd clean-nest-prisma-pg

# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Configure your .env file with database and Redis credentials
```

## Database Setup

```bash
# Run migrations
make db-migrate-dev

# Seed database with initial data
make db-seed

# Open Prisma Studio
make db-studio
```

Default seeded users:

- **Superuser:** superuser@example.com / S3crEtP4ssw0rd!
- **Admin:** admin@example.com / S3crEtP4ssw0rd!
- **User:** user@example.com / S3crEtP4ssw0rd!

## Development

```bash
# Start development server
make dev

# Build project
make build

# Run linter
make lint

# Format code
make format

# Run tests
make test
```

## Project Structure

```
clean-nest/
├── libs/
│   ├── common/          # Shared modules (guards, decorators, interceptors)
│   ├── repositories/    # Database repositories and Prisma client
│   └── utils/          # Utility functions (date, string, hash, etc.)
├── prisma/
│   ├── migrations/      # Database migrations
│   ├── seed/           # Database seeders
│   └── schema.prisma   # Prisma schema
└── src/
    ├── auth/           # Authentication module
    └── settings/       # Settings modules (users, roles, permissions)
```

## API Endpoints

Or see folder docs then import to postman

### Authentication

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/verify-email` - Email verification
- `POST /auth/resend-verification-email` - Resend verification email
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `GET /auth/profile` - Get authenticated user profile

### Users (Protected)

- `GET /users` - List users
- `POST /users` - Create user
- `GET /users/:id` - Get user details
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `PATCH /users/:id/status` - Update user status
- `PATCH /users/:id/password` - Update user password (superuser only)

### Roles (Protected)

- `GET /roles` - List roles
- `POST /roles` - Create role
- `GET /roles/:id` - Get role details
- `PATCH /roles/:id` - Update role
- `DELETE /roles/:id` - Delete role

### Permissions (Protected)

- `GET /permissions` - List permissions
- `POST /permissions` - Create permissions
- `GET /permissions/:id` - Get permission details
- `PATCH /permissions/:id` - Update permission
- `DELETE /permissions/:id` - Delete permission

## Environment Variables

Key configuration variables:

```env
APP_NAME="Clean Nest"
APP_PORT=8001
APP_ENV=development
APP_TIMEZONE=UTC

DATABASE_URL="postgresql://user:pass@localhost:5432/db"

JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key

REDIS_HOST=localhost
REDIS_PORT=6379

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_password
```

## RBAC System

The application uses a flexible RBAC system:

- **Roles** - Define user roles (e.g., superuser, admin, user)
- **Permissions** - Granular permissions (e.g., user:create, user:update)
- **Guards** - `@RoleAuth()` and `@PermissionAuth()` decorators for route protection

Example usage:

```typescript
@UseGuards(AuthGuard, RoleGuard)
@RoleAuth('admin', 'superuser')
@Get('protected')
adminOnly() {
  return 'Only admins can see this';
}
```

## Utilities

### Date Utilities

```typescript
DateUtils.now(); // Current date with timezone
DateUtils.addDays(date, 5); // Add days
DateUtils.format(date, "YYYY-MM-DD");
```

### String Utilities

```typescript
StrUtils.random(16); // Generate random string
StrUtils.slug("Hello World"); // "hello-world"
StrUtils.camel("hello-world"); // "helloWorld"
```

### Hash Utilities

```typescript
HashUtils.generateHash(password);
HashUtils.compareHash(password, hash);
```

## Email Templates

Email templates use Handlebars and are located in `libs/common/src/mail/templates/`.

Available templates:

- `auth/verify-email.hbs`
- `auth/forgot-password.hbs`

## Make Commands

Common make commands for development:

```bash
make dev              # Start development server
make build            # Build project
make lint             # Run linter
make format           # Format code
make db-migrate-dev   # Run migrations (dev)
make db-seed          # Seed database
make db-studio        # Open Prisma Studio
make db-reset         # Reset database
```

## Testing

```bash
# Run all tests
make test

# Run tests in watch mode
make test-watch

# Generate coverage report
bun run test:cov
```

## Deployment

```bash
# Prepare for deployment
make deploy-prep

# This will:
# - Install dependencies
# - Run migrations
# - Generate Prisma client
# - Build the application
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions, please open an issue on the repository.

# ========================================
# Makefile for Bun + Prisma Projects
# ========================================

# ===========================
# Help
# ===========================
help:
	@echo ""
	@echo "Available commands:"
	@echo "  make dev             - Start the development server"
	@echo "  make build           - Build the project"
	@echo "  make lint            - Lint the project"
	@echo "  make format          - Format the project"
	@echo "  make test            - Run tests"
	@echo "  make test-watch      - Run tests in watch mode"
	@echo "  make db-generate     - Generate the prisma client"
	@echo "  make db-migrate      - Run database migrations (prod)"
	@echo "  make db-migrate-dev  - Run database migrations (dev)"
	@echo "  make db-seed         - Run database seeder"
	@echo "  make db-reset        - Reset database"
	@echo "  make db-studio       - Start Prisma Studio"
	@echo "  make deploy-prep     - Prepare the project for deployment"
	@echo ""

# ===========================
# Development
# ===========================
dev:
	@echo "Starting development server..."
	bun run start:dev

# ===========================
# Build
# ===========================
build:
	@echo "Building the project..."
	bun run build

# ===========================
# Lint & Format
# ===========================
lint:
	@echo "Linting the project..."
	bun run lint

format:
	@echo "Formatting the project..."
	bun run format

# ===========================
# Tests
# ===========================
test:
	@echo "Running tests..."
	bun run test

test-watch:
	@echo "Running tests in watch mode..."
	bun run test:watch

# ===========================
# Database (Prisma)
# ===========================
db-generate:
	@echo "Generate the prisma client..."
	bunx --bun prisma generate

db-migrate:
	@echo "Running database migrations (production)..."
	bunx --bun prisma migrate deploy

db-migrate-dev:
	@echo "Running database migrations (development)..."
	bunx --bun prisma migrate dev
	bunx --bun prisma generate

db-seed:
	@echo "Running database seeder..."
	bun run seed

db-reset:
	@echo "Resetting the database..."
	bunx --bun prisma migrate reset --force
	bun run seed

db-studio:
	@echo "Starting Prisma Studio..."
	bunx --bun prisma studio

# ===========================
# Deployment
# ===========================
deploy-prep:
	@echo "Preparing for deployment..."
	bun install --frozen-lockfile
	bunx --bun prisma migrate deploy
	bunx --bun prisma generate
	bun run build

# ===========================
# Phony Targets
# ===========================
.PHONY: \
	help dev build lint format test test-watch \
	db-generate db-migrate db-migrate-dev db-seed db-reset db-studio \
	deploy-prep

# ========================================
# Makefile for Node.js + Prisma Projects
# ========================================
#
# What is this file?
# -------------------
# This Makefile defines shortcuts for common development,
# database, and deployment tasks. Instead of running long
# npm or prisma commands manually, you can use simple
# commands like:
#
#   make dev
#   make build
#   make lint
#   make deploy-prep
#
# Why use Make?
# -------------
# - Simplifies common commands
# - Ensures consistency across developers and environments
# - Used by CI/CD pipelines (e.g., GitHub Actions)
#
# How to install Make on Ubuntu:
# ------------------------------
#   sudo apt update
#   sudo apt install make
#
# Verify installation:
#   make --version
#
# After installation, run:
#   make help
#
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
	@echo "  make db-migrate      - Run database migrations"
	@echo "  make db-migrate-dev  - Run database migrations in development"
	@echo "  make db-seed         - Run database seeder"
	@echo "  make db-studio       - Start Prisma Studio"
	@echo "  make deploy-prep     - Prepare the project for deployment"
	@echo ""

# ===========================
# Development
# ===========================
dev:
	@echo "Starting development server..."
	npm run start:dev

# ===========================
# Build
# ===========================
build:
	@echo "Building the project..."
	npm run build

# ===========================
# Lint & Format
# ===========================
lint:
	@echo "Linting the project..."
	npm run lint

format:
	@echo "Formatting the project..."
	npm run format

# ===========================
# Tests
# ===========================
test:
	@echo "Running tests..."
	npm run test

test-watch:
	@echo "Running tests in watch mode..."
	npm run test:watch

# ===========================
# Database (Prisma)
# ===========================
db-migrate:
	@echo "Running database migrations..."
	npx prisma migrate deploy

db-migrate-dev:
	@echo "Running database migrations in development..."
	npx prisma migrate dev

db-seed:
	@echo "Running database seeder..."
	npm run seed

db-studio:
	@echo "Starting Prisma Studio..."
	npx prisma studio

# ===========================
# Deployment
# ===========================
deploy-prep:
	@echo "Preparing for deployment..."
	npm install
	npx prisma migrate deploy
	npx prisma generate
	npm run build

# ===========================
# Phony Targets
# ===========================
.PHONY: \
	help dev build lint format test test-watch \
	db-migrate db-migrate-dev db-seed db-studio \
	deploy-prep
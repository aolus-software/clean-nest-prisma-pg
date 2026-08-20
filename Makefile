# ========================================
# Makefile for Bun + Prisma Projects
# ========================================

# ===========================
# Deployment configuration
# ===========================
# pm2 binary (override with `make deploy-staging PM2=bunx\ pm2`)
PM2 ?= pm2
# pm2 app names in ecosystem.config.js are "<prefix>-<env>"
PM2_APP_PREFIX := clean-nest-prisma-pg
ECOSYSTEM := ecosystem.config.js

# ===========================
# Help
# ===========================
help:
	@echo ""
	@echo "Available commands:"
	@echo "  make dev             - Start the development server"
	@echo "  make start           - Start the project"
	@echo "  make typecheck       - Run type checks"
	@echo "  make build           - Build the project"
	@echo "  make lint            - Lint the project"
	@echo "  make format          - Format the project"
	@echo "  make test            - Run tests"
	@echo "  make test-watch      - Run tests in watch mode"
	@echo "  make db-generate     - Generate the prisma client"
	@echo "  make db-format       - Format the prisma schema (run after editing schema.prisma)"
	@echo "  make db-migrate      - Run database migrations (prod)"
	@echo "  make db-migrate-dev  - Run database migrations (dev)"
	@echo "  make db-seed         - Run database seeder"
	@echo "  make db-reset        - Reset database"
	@echo "  make db-studio       - Start Prisma Studio"
	@echo "  make deploy-prep     - Prepare the project for deployment (install, migrate, build)"
	@echo "  make deploy-dev      - Deploy + (re)start pm2 app $(PM2_APP_PREFIX)-dev"
	@echo "  make deploy-staging  - Deploy + (re)start pm2 app $(PM2_APP_PREFIX)-staging"
	@echo "  make deploy-production - Deploy + (re)start pm2 app $(PM2_APP_PREFIX)-production"
	@echo "  make pm2-status      - List pm2 processes"
	@echo "  make pm2-logs-<env>  - Tail logs for dev | staging | production"
	@echo "  make pm2-stop-<env>  - Stop dev | staging | production"
	@echo ""

# ===========================
# Development
# ===========================
dev:
	@echo "Starting development server..."
	bun run start:dev

# ===========================
# Start
# ===========================
start:
	@echo "Starting the project..."
	bun run start

# ===========================
# Typecheck
# ===========================
typecheck:
	@echo "Running type checks..."
	bun run typecheck

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

db-format:
	@echo "Formatting the Prisma schema..."
	bunx --bun prisma format

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

check-pm2:
	@command -v $(firstword $(PM2)) > /dev/null 2>&1 || { \
		echo "ERROR: '$(firstword $(PM2))' not found. Install it (bun add -g pm2) or run: make <target> PM2='bunx pm2'"; \
		exit 1; \
	}

# $(1) = environment (dev | staging | production)
# Runs the full prep sequence, then reloads the pm2 app if it already exists
# (zero-downtime in cluster mode) or starts it from the ecosystem file if not.
define pm2_deploy
	@echo "==> Deploying $(PM2_APP_PREFIX)-$(1)"
	$(MAKE) check-pm2
	bun install --frozen-lockfile
	bunx --bun prisma migrate deploy
	bunx --bun prisma generate
	bun run build
	@mkdir -p logs
	@if $(PM2) describe $(PM2_APP_PREFIX)-$(1) > /dev/null 2>&1; then \
		echo "==> Reloading pm2 app $(PM2_APP_PREFIX)-$(1)"; \
		$(PM2) reload $(ECOSYSTEM) --only $(PM2_APP_PREFIX)-$(1) --update-env; \
	else \
		echo "==> Starting pm2 app $(PM2_APP_PREFIX)-$(1)"; \
		$(PM2) start $(ECOSYSTEM) --only $(PM2_APP_PREFIX)-$(1); \
	fi
	@$(PM2) save > /dev/null 2>&1 || true
	@echo "==> Done: $(PM2_APP_PREFIX)-$(1)"
endef

deploy-dev:
	$(call pm2_deploy,dev)

deploy-staging:
	$(call pm2_deploy,staging)

deploy-production:
	$(call pm2_deploy,production)

# ===========================
# PM2 helpers
# ===========================
pm2-status: check-pm2
	$(PM2) list

pm2-logs-dev: check-pm2
	$(PM2) logs $(PM2_APP_PREFIX)-dev

pm2-logs-staging: check-pm2
	$(PM2) logs $(PM2_APP_PREFIX)-staging

pm2-logs-production: check-pm2
	$(PM2) logs $(PM2_APP_PREFIX)-production

pm2-stop-dev: check-pm2
	$(PM2) stop $(PM2_APP_PREFIX)-dev

pm2-stop-staging: check-pm2
	$(PM2) stop $(PM2_APP_PREFIX)-staging

pm2-stop-production: check-pm2
	$(PM2) stop $(PM2_APP_PREFIX)-production

# ===========================
# Phony Targets
# ===========================
.PHONY: \
	help dev start typecheck build lint format test test-watch \
	db-generate db-format db-migrate db-migrate-dev db-seed db-reset db-studio \
	deploy-prep check-pm2 deploy-dev deploy-staging deploy-production \
	pm2-status pm2-logs-dev pm2-logs-staging pm2-logs-production \
	pm2-stop-dev pm2-stop-staging pm2-stop-production

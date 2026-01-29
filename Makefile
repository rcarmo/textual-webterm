.PHONY: help install install-dev lint format test coverage check clean clean-all build build-all build-fast bundle bundle-watch bundle-clean typecheck bump-patch push

PYTHON ?= python3
PIP ?= $(PYTHON) -m pip

# Static assets
STATIC_JS_DIR = src/webterm/static/js
TERMINAL_JS = $(STATIC_JS_DIR)/terminal.js
GHOSTTY_WASM = $(STATIC_JS_DIR)/ghostty-vt.wasm

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Full reproducible build
# =============================================================================

build-all: clean-all node_modules build install-dev check ## Full reproducible build (clean + deps + bundle + install)
	@echo "Build complete!"

# =============================================================================
# Python targets
# =============================================================================
# NOTE: Install dev tools (ruff/pytest/etc.) using `pip install --user --break-system-packages`
# from the dev dependency list (pyproject.toml or requirements-dev.txt).

install: ## Install package in editable mode
	$(PIP) install -e .

install-dev: install ## Install with dev dependencies
	$(PIP) install aiohttp uvloop click pydantic importlib-metadata tomli pyyaml pyte
	$(PIP) install pytest pytest-asyncio pytest-cov pytest-timeout ruff

lint: ## Run ruff linter
	ruff check src tests

format: ## Format code with ruff
	ruff format src tests

test: ## Run pytest
	pytest

coverage: ## Run pytest with coverage
	pytest --cov=src/webterm --cov-report=term-missing

check: lint coverage ## Run lint + coverage

# =============================================================================
# Frontend build targets (requires Bun: https://bun.sh)
# =============================================================================

node_modules: package.json
	bun install
	@touch node_modules

typecheck: node_modules ## Run TypeScript type checking
	bun run typecheck

build: node_modules ## Build frontend (typecheck + bundle)
	bun run build

build-fast: node_modules ## Build frontend without typecheck
	bun run build:fast
	@test -f $(GHOSTTY_WASM) || bun run copy-wasm

bundle: build ## Alias for build

bundle-watch: node_modules ## Watch mode for frontend development
	@test -f $(GHOSTTY_WASM) || bun run copy-wasm
	bun run watch

# =============================================================================
# Clean targets
# =============================================================================

clean: ## Remove Python cache files
	rm -rf .pytest_cache .coverage htmlcov .ruff_cache __pycache__ src/**/__pycache__

bundle-clean: ## Remove frontend build artifacts
	rm -rf node_modules bun.lock $(TERMINAL_JS) $(GHOSTTY_WASM)

clean-all: clean bundle-clean ## Remove everything (clean + bundle-clean)

# =============================================================================
# Version management
# =============================================================================

bump-patch: ## Bump patch version and create git tag
	@OLD=$$(grep -Po '(?<=^version = ")[^"]+' pyproject.toml); \
	MAJOR=$$(echo $$OLD | cut -d. -f1); \
	MINOR=$$(echo $$OLD | cut -d. -f2); \
	PATCH=$$(echo $$OLD | cut -d. -f3); \
	NEW="$$MAJOR.$$MINOR.$$((PATCH + 1))"; \
	sed -i "s/^version = \"$$OLD\"/version = \"$$NEW\"/" pyproject.toml; \
	git add pyproject.toml; \
	git commit -m "Bump version to $$NEW"; \
	git tag "v$$NEW"; \
	echo "Bumped version: $$OLD -> $$NEW (tagged v$$NEW)"

push: ## Push commits and tags to origin
	git push origin main --tags

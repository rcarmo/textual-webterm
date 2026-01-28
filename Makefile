.PHONY: help install install-dev lint format test coverage check clean clean-all build build-all bundle bundle-watch bundle-clean bump-patch

PYTHON ?= python3
PIP ?= $(PYTHON) -m pip

# Static assets
STATIC_JS_DIR = src/textual_webterm/static/js
TERMINAL_JS = $(STATIC_JS_DIR)/terminal.js
TERMINAL_TS = $(STATIC_JS_DIR)/terminal.ts
GHOSTTY_WASM = $(STATIC_JS_DIR)/ghostty-vt.wasm

help:
	@echo "Build targets:"
	@echo "  build-all    - Full reproducible build (clean + deps + bundle + install)"
	@echo "  build        - Build frontend only (bundle)"
	@echo "  bundle       - Build terminal.js and copy WASM"
	@echo "  bundle-watch - Watch mode for development"
	@echo ""
	@echo "Python targets:"
	@echo "  install      - Install package in editable mode"
	@echo "  install-dev  - Install with dev dependencies"
	@echo "  lint         - Run ruff linter"
	@echo "  format       - Format code with ruff"
	@echo "  test         - Run pytest"
	@echo "  coverage     - Run pytest with coverage"
	@echo "  check        - Run lint + coverage"
	@echo ""
	@echo "Clean targets:"
	@echo "  clean        - Remove Python cache files"
	@echo "  bundle-clean - Remove frontend build artifacts"
	@echo "  clean-all    - Remove everything (clean + bundle-clean)"

# =============================================================================
# Full reproducible build
# =============================================================================

build-all: clean-all node_modules bundle install-dev check
	@echo "Build complete!"

# =============================================================================
# Python targets
# =============================================================================

install:
	$(PIP) install -e .

install-dev:
	$(PIP) install -e .
	$(PIP) install pytest pytest-asyncio pytest-cov pytest-timeout ruff

lint:
	ruff check src tests

format:
	ruff format src tests

test:
	pytest

coverage:
	pytest --cov=src/textual_webterm --cov-report=term-missing

check: lint coverage

# =============================================================================
# Frontend build targets (requires Bun: https://bun.sh)
# =============================================================================

# Install node dependencies (creates bun.lock if missing)
node_modules: package.json
	bun install
	@touch node_modules

# Build terminal.js from TypeScript
$(TERMINAL_JS): $(TERMINAL_TS) node_modules
	bun build $(TERMINAL_TS) --outfile=$(TERMINAL_JS) --minify --target=browser

# Copy WASM file from node_modules
$(GHOSTTY_WASM): node_modules
	cp node_modules/ghostty-web/ghostty-vt.wasm $(GHOSTTY_WASM)

# Main bundle target - builds JS and copies WASM
bundle: $(TERMINAL_JS) $(GHOSTTY_WASM)

# Alias for bundle
build: bundle

# Watch mode for development
bundle-watch: $(GHOSTTY_WASM)
	bun build $(TERMINAL_TS) --outfile=$(TERMINAL_JS) --watch --target=browser

# =============================================================================
# Clean targets
# =============================================================================

clean:
	rm -rf .pytest_cache .coverage htmlcov .ruff_cache __pycache__ src/**/__pycache__

bundle-clean:
	rm -rf node_modules bun.lock $(TERMINAL_JS) $(GHOSTTY_WASM)

clean-all: clean bundle-clean

# =============================================================================
# Version management
# =============================================================================

# Bump patch version (e.g., 0.5.3 -> 0.5.4)
bump-patch:
	@OLD=$$(grep -Po '(?<=^version = ")[^"]+' pyproject.toml); \
	MAJOR=$$(echo $$OLD | cut -d. -f1); \
	MINOR=$$(echo $$OLD | cut -d. -f2); \
	PATCH=$$(echo $$OLD | cut -d. -f3); \
	NEW="$$MAJOR.$$MINOR.$$((PATCH + 1))"; \
	sed -i "s/^version = \"$$OLD\"/version = \"$$NEW\"/" pyproject.toml; \
	echo "Bumped version: $$OLD -> $$NEW"

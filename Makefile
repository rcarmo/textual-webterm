.PHONY: help install install-dev lint format test coverage check clean bundle bundle-watch bundle-clean

PYTHON ?= python3
PIP ?= $(PYTHON) -m pip

help:
	@echo "Targets: install install-dev lint format test coverage check clean"
	@echo "Frontend: bundle bundle-watch bundle-clean"

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

clean:
	rm -rf .pytest_cache .coverage htmlcov .ruff_cache

# Frontend build targets (requires Bun: https://bun.sh)
node_modules: package.json
	bun install

bundle: node_modules
	bun run build

bundle-watch: node_modules
	bun run copy-wasm
	bun run watch

bundle-clean:
	rm -rf node_modules bun.lock src/textual_webterm/static/js/terminal.js src/textual_webterm/static/js/ghostty-vt.wasm

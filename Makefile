.PHONY: help install install-dev lint format test coverage check clean

PYTHON ?= python3
PIP ?= $(PYTHON) -m pip

help:
	@echo "Targets: install install-dev lint format test coverage check clean"

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

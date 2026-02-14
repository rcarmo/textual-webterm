.PHONY: help install install-dev lint format test race coverage check fuzz build-go build build-fast bundle bundle-watch bundle-clean clean clean-all build-all typecheck

GO_DIR = go
STATIC_JS_DIR = go/webterm/static/js
TERMINAL_TS = $(STATIC_JS_DIR)/terminal.ts
TERMINAL_JS = $(STATIC_JS_DIR)/terminal.js
GHOSTTY_WASM = $(STATIC_JS_DIR)/ghostty-vt.wasm

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Download Go dependencies
	cd $(GO_DIR) && go mod download

install-dev: install node_modules ## Install Go and frontend dependencies

lint: ## Run Go vet
	cd $(GO_DIR) && go vet ./...

format: ## Format Go code
	cd $(GO_DIR) && gofmt -w ./cmd ./internal ./webterm

test: ## Run Go tests
	cd $(GO_DIR) && go test ./...

race: ## Run Go race tests
	cd $(GO_DIR) && go test -race ./...

coverage: ## Run Go coverage for runtime package
	cd $(GO_DIR) && go test ./webterm -coverprofile=coverage.out && go tool cover -func=coverage.out

check: lint test coverage ## Run lint + tests + coverage

fuzz: ## Run all fuzz tests briefly
	cd $(GO_DIR) && go test ./... -run=^$$ -fuzz=Fuzz -fuzztime=1s

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

build-go: ## Build Go CLI binary
	cd $(GO_DIR) && mkdir -p bin && go build -o ./bin/webterm ./cmd/webterm

clean: ## Remove coverage artifacts
	rm -f $(GO_DIR)/coverage.out

bundle-clean: ## Remove frontend dependencies
	rm -rf node_modules bun.lock

clean-all: clean bundle-clean ## Remove all generated artifacts

build-all: clean-all install-dev build check build-go ## Full reproducible build from scratch
	@echo "Build complete!"

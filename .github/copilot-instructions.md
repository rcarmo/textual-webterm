# Copilot Development Instructions

## Makefile Usage (MANDATORY)

Always use the Makefile for development tasks. Never run raw `go test`, `go vet`, or `bun` commands directly.

### Quick Reference

| Task | Command | Description |
|------|---------|-------------|
| Run tests | `make test` | Run Go tests |
| Run linter | `make lint` | Run `go vet` |
| Format code | `make format` | Run `gofmt` |
| Coverage report | `make coverage` | Run Go coverage with `-coverpkg` |
| Full check | `make check` | Run lint + coverage |
| Race tests | `make race` | Run `go test -race` |
| Fuzz smoke run | `make fuzz` | Run all fuzz targets briefly |
| Build frontend | `make build` | TypeScript typecheck + bundle |
| Build Go binary | `make build-go` | Build CLI binary |
| Full rebuild | `make build-all` | Clean + deps + build + checks |
| See all targets | `make help` | Show all available commands |

### Development Workflow

1. **Before changes**: Run `make check` to establish baseline.
2. **After changes**: Run `make check` and `make race`.
3. **Frontend edits**: Run `make build` after changing `go/webterm/static/js/terminal.ts`.
4. **Major validation**: Run `make build-all` for a reproducible full run.

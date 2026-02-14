# Go project instructions

Applies when: this repo has `go.mod`.

## Makefile-first workflow
- CI should run `make check`, and `make race` for concurrency-sensitive paths.
- Put `golangci-lint` and `gosec` wiring behind Make targets when introduced.

## Conventions to implement
- `make test` should run `cd go && go test ./...`.
- Avoid bespoke CI steps when a Make target can encode the same behavior.

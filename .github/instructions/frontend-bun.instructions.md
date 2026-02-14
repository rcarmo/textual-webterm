# Frontend (Bun/Node) instructions

Applies when: this repo has `package.json` and a JS/TS build step.

## Makefile-first workflow
- Expose frontend workflows via Make targets (`typecheck`, `build`, `build-fast`, `bundle-watch`, `bundle-clean`).
- Keep CI invoking those targets (or `make check` if it wraps them).

## Conventions
- Bun is preferred for install/build when available.

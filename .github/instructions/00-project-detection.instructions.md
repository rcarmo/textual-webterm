# Project-type detection

Use these heuristics to decide which other instruction files apply:

- If `go.mod` exists -> apply `go.instructions.md`.
- If `Dockerfile` exists and CI is publishing images -> apply `docker-image.instructions.md`.
- If `package.json` exists (or Bun is referenced) -> apply `frontend-bun.instructions.md`.

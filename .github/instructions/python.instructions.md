# Python project instructions

Applies when: this repo has `pyproject.toml` or `requirements*.txt`.

## Makefile-first workflow
- Prefer `make check` as the default validation gate.
- If you add/change tooling, wire it through Make targets (don't ask users to run raw `pytest`/`ruff`).

## Conventions to implement
- Prefer `ruff` for lint+format.
- Prefer `python -m pytest` (and `--cov` for coverage) via Make targets.
- Keep CI calling Make targets, not raw commands.

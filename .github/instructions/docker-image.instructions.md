# Docker image project instructions

Applies when: this repo builds/publishes a Docker image.

## CI/CD
- Use `.github/workflows/docker.yml` (multi-arch by digest + manifest merge) as the baseline in this repository.
- Tags `v*` are the release boundary.

## Conventions
- Keep Docker build args/env documented in README.
- Prioritize building minimal images, taking advantage of caching and layers to remove build artifacts.
- Prefer reproducible builds (minimize network fetches at runtime; pin versions when practical).

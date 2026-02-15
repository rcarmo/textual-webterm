# webterm

![Icon](docs/icon-256.png)

`webterm` serves terminal sessions over HTTP/WebSocket, with a dashboard mode for multiple sessions and live-updating terminal tiles.

This repository is the Go port of the original Python implementation, which is preserved in the `python` branch.

![Screenshot](docs/screenshot.png)

## Features

- Typeahead find for quickly finding and launching sessions with minimal friction
- Web terminal with reconnect support
- Ghostty WebAssembly terminal engine for fast rendering from [`ghostty-web`](https://github.com/rcarmo/ghostty-web)
- Session dashboard with live SVG screenshots from [`go-te`](https://github.com/rcarmo/go-te)
- Docker watch mode (`webterm-command` / `webterm-theme` labels)
- Docker compose manifest ingestion
- CPU sparkline tiles for compose services
- SSE activity updates for fast dashboard refresh
- Mobile/touch support with virtual keyboard + draggable keybar
- Theme/font controls for terminal rendering

## Install

### Build from source

```bash
git clone https://github.com/rcarmo/webterm.git
cd webterm
mkdir -p bin
go build -o ./bin/webterm ./cmd/webterm
```

The command above produces `bin/webterm`; you can also build it from repo root with `make build-go`.

## Quick start

Run a default shell session:

```bash
go run ./cmd/webterm
```

Run a specific command:

```bash
go run ./cmd/webterm -- htop
```

Then open <http://localhost:8080>.

## Dashboard modes

### Landing manifest

```yaml
- name: Logs
  slug: logs
  command: docker logs -f my-service
  theme: nord
```

```bash
go run ./cmd/webterm -- --landing-manifest ./landing.yaml
```

### Docker watch

```bash
go run ./cmd/webterm -- --docker-watch
```

Containers with these labels become tiles:

- `webterm-command`: command string, or `auto` for Docker exec
- `webterm-theme`: theme name (fallback is `xterm` palette)

### Compose manifest

```bash
go run ./cmd/webterm -- --compose-manifest ./docker-compose.yaml
```

## Environment variables

- `WEBTERM_STATIC_PATH`: override static asset directory
- `WEBTERM_DOCKER_USERNAME`: user for Docker exec sessions
- `WEBTERM_DOCKER_AUTO_COMMAND`: override auto command (`/bin/bash` default)
- `WEBTERM_SCREENSHOT_FORCE_REDRAW`: force redraw before screenshots (`true/1/yes/on`)
- `DOCKER_HOST`: Docker daemon endpoint override

## Development (Makefile-first)

```bash
make install-dev
make check
make race
make test
make bump-patch
```

Frontend bundle tasks:

```bash
make build
make build-fast
make bundle-watch
```

## Docker

```bash
docker build -t webterm .
docker run -v /var/run/docker.sock:/var/run/docker.sock -p 8080:8080 webterm --docker-watch
```

Web assets are embedded in the Go binary by default (you can still override with `WEBTERM_STATIC_PATH`).
The Dockerfile uses a minimal Alpine runtime stage and only installs `ca-certificates` plus `docker-cli`.

# webterm (Go)

![Icon](docs/icon-256.png)

`webterm` serves terminal sessions over HTTP/WebSocket, with a dashboard mode for multiple sessions and Docker-aware tiles.

![Screenshot](docs/screenshot.png)

## Features

- Web terminal with reconnect support
- Session dashboard with live SVG screenshots
- Docker watch mode (`webterm-command` / `webterm-theme` labels)
- Docker compose manifest ingestion
- CPU sparkline tiles for compose services
- SSE activity updates for fast dashboard refresh
- Theme/font controls for terminal rendering

## Install

### Build from source

```bash
git clone https://github.com/rcarmo/webterm.git
cd webterm/go
mkdir -p bin
go build -o ./bin/webterm ./cmd/webterm
```

The command above produces `go/bin/webterm`; you can also build it from repo root with `make build-go`.

## Quick start

Run a default shell session:

```bash
cd go
go run ./cmd/webterm
```

Run a specific command:

```bash
cd go
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
cd go
go run ./cmd/webterm -- --landing-manifest ../landing.yaml
```

### Docker watch

```bash
cd go
go run ./cmd/webterm -- --docker-watch
```

Containers with these labels become tiles:

- `webterm-command`: command string, or `auto` for Docker exec
- `webterm-theme`: theme name (fallback is `xterm` palette)

### Compose manifest

```bash
cd go
go run ./cmd/webterm -- --compose-manifest ../docker-compose.yaml
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

The image sets `WEBTERM_STATIC_PATH=/app/static` and serves assets from `go/webterm/static`.
The Dockerfile uses a minimal Alpine runtime stage and only installs `ca-certificates` plus `docker-cli`.

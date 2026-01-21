# textual-webterm

![Icon](docs/icon-256.png)

Serve terminal sessions and Textual apps over the web with a simple CLI command.

This is heavily based on [textual-web](https://github.com/Textualize/textual-web), but specifically focused on serving a persistent terminal session in a way that you can host behind a reverse proxy (and some form of authentication).

Built on top of [textual-serve](https://github.com/Textualize/textual-serve), this package provides an easy way to expose terminal sessions and Textual applications via HTTP/WebSocket with automatic reconnection support.

## Features

- 🖥️ **Web-based terminal** - Access your terminal from any browser
- 🐍 **Textual app support** - Serve Textual apps directly from Python modules
- 🔄 **Session reconnection** - Refresh the page and reconnect to the same session
- 🎨 **Full terminal emulation** - Colors, cursor, and ANSI codes work correctly
- 📐 **Auto-sizing** - Terminal automatically resizes to fit the browser window
- 🚀 **Simple CLI** - One command to start serving

## Non-Features

- **No Authentication** - this is meant to be used inside a dedicated container, and you should set up an authenticating reverse proxy like `authelia`
- **No Encryption (TLS/HTTPS)** - again, this is meant to be fronted by something like `traefik` or `caddy`

## Quick Start

### Serve a Terminal

Serve your default shell:

```bash
textual-webterm
```

Serve a specific command:

```bash
textual-webterm htop
```

### Serve a Textual App

Serve a Textual app from an installed module:

```bash
textual-webterm --app mypackage.mymodule:MyApp
```

Serve a Textual app from a Python file:

```bash
textual-webterm --app ./calculator.py:CalculatorApp
```

### Options

Specify host and port:

```bash
textual-webterm --host 0.0.0.0 --port 8080 bash
```

Then open http://localhost:8080 in your browser.

## Landing pages

You can serve a landing page with multiple terminal tiles driven by a YAML manifest:

```yaml
- name: My Service
  slug: my-service
  command: docker logs -f my-service
```

Run with:

```bash
textual-webterm --landing-manifest landing.yaml
```

You can also point to a docker-compose file; services with the label `webterm-command`
become tiles. For example:

```yaml
services:
  db:
    image: postgres
    labels:
      webterm-command: docker exec -it db psql
```

Start with:

```bash
textual-webterm --compose-manifest compose.yaml
```

When a landing manifest is provided, the root (`/`) shows the grid; clicking a tile
opens a dedicated terminal session in a new tab. Without a manifest, the server
operates in single-terminal mode.

## CLI Reference

```
Usage: textual-webterm [OPTIONS] [COMMAND]

  Serve a terminal or Textual app over HTTP/WebSocket.

  COMMAND: Shell command to run in terminal (default: $SHELL)

Options:
  -H, --host TEXT               Host to bind to [default: 0.0.0.0]
  -p, --port INTEGER            Port to bind to [default: 8080]
  -a, --app TEXT                Load a Textual app from module:ClassName
                                Examples: 'mymodule:MyApp' or './app.py:MyApp'
  -L, --landing-manifest PATH   YAML manifest describing landing page tiles
                                (slug/name/command).
  -C, --compose-manifest PATH   Docker compose YAML; services with label
                                "webterm-command" become landing tiles.
  --version                     Show the version and exit.
  --help                        Show this message and exit.
```

## Development

### Setup (Makefile-first)

```bash
git clone https://github.com/rcarmo/textual-webterm.git
cd textual-webterm

# Install with dev dependencies via Makefile
make install-dev
```

### Common tasks (use Makefile)

- Lint: `make lint`
- Format: `make format`
- Tests: `make test`
- Coverage (fail_under=80): `make coverage`
- Full check (lint + coverage): `make check`

### Notes

- WebSocket protocol (browser <-> server) is JSON: `["stdin", data]`, `["resize", {"width": w, "height": h}]`, `["ping", data]`.
- Static assets are provided by `textual-serve`; this project does not add custom static files.
- `/screenshot.svg` replays the terminal buffer to SVG via Rich; width can be set with `?width=120` and is clamped for safety.

## Requirements

- Python 3.9+
- Linux or macOS

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related Projects

- [Textual](https://github.com/Textualize/textual) - TUI framework for Python
- [textual-serve](https://github.com/Textualize/textual-serve) - Serve Textual apps on the web
- [Rich](https://github.com/Textualize/rich) - Rich text formatting for terminals

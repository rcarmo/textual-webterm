# Architecture

## Overview

`webterm` is a Go HTTP/WebSocket server that hosts one or more terminal sessions and renders screenshot/telemetry surfaces for a dashboard UI.

```
Browser (terminal.js + ghostty-vt.wasm)
        │
        │ WS / HTTP / SSE
        ▼
go/webterm/server.go (LocalServer)
        │
        ├── session_manager.go      (route/app/session registry)
        ├── terminal_session.go     (PTY-backed local sessions)
        ├── docker_exec_session.go  (Docker exec-backed sessions)
        ├── docker_watcher.go       (container add/remove discovery)
        ├── docker_stats.go         (CPU sampling + sparkline data)
        └── svg_exporter.go         (terminal snapshot -> SVG)
```

## Packages

- `go/cmd/webterm`: CLI entrypoint
- `go/webterm`: server/runtime/domain logic
- `go/internal/terminalstate`: Go terminal emulator wrapper (`go-te`) used for screenshots

## Runtime data flow

1. Browser connects to `/ws/{route_key}`.
2. `SessionManager` resolves or creates a session.
3. Session reads PTY output and updates:
   - live WS stream (`stdout`)
   - replay buffer (reconnect support)
   - terminal-state tracker (`go-te`) for screenshots
4. Dashboard pulls `/screenshot.svg` and listens on `/events` for activity.

## Static assets

Assets live in `go/webterm/static`:

- `js/terminal.ts` source
- `js/terminal.js` bundled client
- `js/ghostty-vt.wasm`
- `monospace.css`, icons, `manifest.json`

The server resolves static files from:

1. `WEBTERM_STATIC_PATH` (if set)
2. local repository-relative fallbacks rooted at `go/webterm/static`

## Docker integration

- **Compose mode** loads services from a compose manifest and creates tiles for services carrying `webterm-command`.
- **Watch mode** subscribes to Docker events and adds/removes tiles at runtime.
- `webterm-theme` controls tile theme; default theme applies if unset.

## Reliability notes

- WebSocket writes are serialized through a sender queue.
- Session-manager maps are lock-protected and race-tested.
- Replay buffers are bounded to avoid unbounded memory growth.

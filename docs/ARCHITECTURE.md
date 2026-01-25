# Architecture

This document describes the internal architecture of textual-webterm.

## Overview

textual-webterm is a web-based terminal server that exposes terminal sessions (or Textual apps) over HTTP and WebSocket. It's designed to run behind a reverse proxy with authentication.

```
┌─────────────┐      ┌──────────────────────────────────────────────────┐
│   Browser   │─────▶│                 local_server.py                  │
│             │◀─────│              (aiohttp web server)                │
└─────────────┘      │                                                  │
       │             │  ┌──────────────┐  ┌──────────────────────────┐  │
       │ WebSocket   │  │ session_     │  │ terminal_session.py      │  │
       └────────────▶│  │ manager.py   │──│ (PTY + pyte emulator)    │  │
                     │  └──────────────┘  └──────────────────────────┘  │
                     │                                                  │
                     │  ┌──────────────┐  ┌──────────────────────────┐  │
                     │  │ poller.py    │  │ docker_stats.py          │  │
                     │  │ (I/O thread) │  │ (CPU metrics via socket) │  │
                     │  └──────────────┘  └──────────────────────────┘  │
                     └──────────────────────────────────────────────────┘
```

## Core Components

### local_server.py

The main HTTP/WebSocket server built on aiohttp. Handles:

- **HTTP routes**: Dashboard, screenshots, sparklines, SSE events, health checks
- **WebSocket connections**: Terminal I/O multiplexing with JSON protocol
- **Screenshot caching**: Time-based and change-based cache invalidation
- **SSE broadcasting**: Real-time activity notifications to dashboard

Key classes:
- `Server`: Main server class managing routes and session lifecycle

### session_manager.py

Manages the mapping between route keys and sessions:

- **TwoWayDict**: Bidirectional mapping of RouteKey ↔ SessionID
- **Session creation**: Creates TerminalSession or AppSession on demand
- **App registry**: Stores app configurations from manifest files

### terminal_session.py

Manages a single terminal session:

- **PTY management**: Fork/exec with pseudo-terminal
- **pyte emulator**: Interprets ANSI escape sequences for screen state
- **Replay buffer**: 64KB ring buffer for reconnection support
- **Resize handling**: Propagates window size changes to PTY

The pyte screen buffer provides character-level access for screenshots.

### poller.py

Background thread for non-blocking PTY I/O:

- **selector-based**: Uses `selectors.DefaultSelector` for efficient I/O
- **Async queues**: Bridges sync I/O thread to async main loop
- **Write queuing**: Handles backpressure for terminal input

### svg_exporter.py

Custom SVG renderer for terminal screenshots:

- **Per-character positioning**: Each character has explicit x coordinate
- **Box-drawing scaling**: Vertical 1.2x scale for line-height alignment
- **Color handling**: ANSI 16-color palette + 256-color + truecolor
- **Wide character support**: Proper column tracking for CJK characters

### docker_stats.py

Collects CPU metrics from Docker containers:

- **Unix socket client**: Direct HTTP-over-Unix-socket to Docker API
- **Compose awareness**: Filters containers by compose project label
- **History buffer**: 180 samples (30 min at 10s intervals)
- **Sparkline SVG**: Renders mini CPU graphs

## Data Flow

### Terminal I/O

```
Browser                    Server                      PTY
   │                          │                          │
   │──["stdin", "ls\n"]──────▶│                          │
   │                          │────write(b"ls\n")───────▶│
   │                          │                          │
   │                          │◀───read(output)──────────│
   │◀─["stdout", "..."]───────│                          │
```

### Screenshot Generation

```
Dashboard ──GET /screenshot.svg──▶ Server
                                      │
                                      ▼
                               TerminalSession
                                      │
                               get_screen_state()
                                      │
                                      ▼
                                 pyte.Screen
                                   .buffer
                                      │
                                      ▼
                               svg_exporter.py
                               render_terminal_svg()
                                      │
                                      ▼
                              <svg>...</svg>
```

### SSE Activity Updates

```
Dashboard ──GET /events──▶ Server (SSE connection held open)
                              │
Terminal activity ───────────▶│
                              │
                              ▼
                          Broadcast to all SSE clients:
                          data: {"route_key": "...", "type": "activity"}
```

## Session Lifecycle

1. **Browser connects** to `/ws/{route_key}`
2. **SessionManager** looks up or creates session for route_key
3. **TerminalSession** forks PTY process, initializes pyte emulator
4. **Poller** registers PTY fd for I/O events
5. **WebSocket handler** bridges browser ↔ PTY via JSON messages
6. **On disconnect**: Session stays alive; browser can reconnect
7. **On reconnect**: Replay buffer restores recent output

## Configuration

### Manifest-based (--landing-manifest)

```yaml
- name: Display Name
  slug: route-key
  command: /path/to/command
```

### Compose-based (--compose-manifest)

Reads docker-compose.yaml, creates tiles for services with `webterm-command` label:

```yaml
services:
  myservice:
    labels:
      webterm-command: docker exec -it myservice bash
```

## WebSocket Protocol

JSON-encoded messages over WebSocket:

| Direction | Message | Description |
|-----------|---------|-------------|
| Client→Server | `["stdin", "data"]` | Terminal input |
| Client→Server | `["resize", {"width": N, "height": M}]` | Window resize |
| Client→Server | `["ping", data]` | Keep-alive |
| Server→Client | `["stdout", "data"]` | Terminal output |
| Server→Client | `["pong", data]` | Keep-alive response |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard HTML or terminal redirect |
| `/ws/{route_key}` | WS | WebSocket terminal connection |
| `/screenshot.svg` | GET | SVG screenshot (query: `route_key`) |
| `/cpu-sparkline.svg` | GET | CPU sparkline (query: `container`) |
| `/events` | GET | SSE stream for activity updates |
| `/health` | GET | Health check |

## Key Design Decisions

### Why bundle xterm.js directly?

We bundle xterm.js 6.0 directly rather than using textual-serve because:

- **Full configuration control** - fontFamily, scrollback, theme are configurable
- **No workarounds needed** - xterm.js uses canvas rendering which ignores CSS fonts
- **Smaller footprint** - No unused fonts or images from textual-serve
- **Latest features** - xterm.js 6.0 includes ligature support, synchronized output, etc.

The pre-built `terminal.js` bundle is committed to the repo so users can `pip install` without needing Node.js/Bun.

### Why custom SVG exporter?

Rich's `export_svg()` had alignment issues with box-drawing characters and varied font rendering across browsers. The custom exporter:

- Positions each character individually for pixel-perfect alignment
- Scales box-drawing characters vertically to fill line height
- Uses explicit x coordinates instead of relying on font metrics

### Why pyte?

pyte provides a pure-Python terminal emulator that tracks screen state character-by-character, enabling:

- Screenshot generation without screen scraping
- Dirty tracking for efficient cache invalidation
- Full ANSI/VT100 escape sequence support

### Why session persistence?

Unlike traditional web terminals, sessions survive page refreshes:

- Replay buffer allows catching up on missed output
- SessionManager keeps sessions alive until explicit close
- Enables dashboard with multiple live terminal thumbnails

## File Structure

```
src/textual_webterm/
├── cli.py              # Click CLI entry point
├── config.py           # Configuration parsing (YAML manifests)
├── local_server.py     # Main HTTP/WebSocket server
├── session_manager.py  # Session registry and routing
├── session.py          # Abstract session interface
├── terminal_session.py # PTY-based terminal session
├── app_session.py      # Textual app session
├── poller.py           # Async I/O polling thread
├── svg_exporter.py     # Terminal→SVG renderer
├── docker_stats.py     # Docker CPU metrics collector
├── exit_poller.py      # Graceful shutdown handling
├── identity.py         # Session ID generation
├── slugify.py          # URL-safe slug generation
├── types.py            # Type aliases
├── constants.py        # Platform constants
└── static/
    ├── monospace.css   # Font stack CSS variables
    ├── css/xterm.css   # xterm.js styles
    └── js/
        ├── terminal.ts # xterm.js client source (TypeScript)
        └── terminal.js # Pre-built bundle (committed)
```

# Roadmap: Migration to xterm.js 6.0 with Bun

This document outlines the plan for bundling xterm.js 6.0 directly, replacing the dependency on textual-serve's bundled `textual.js`.

## Status: ✅ Complete

The migration has been implemented on the `upstream-xterm` branch.

### What Was Done

- [x] **Phase 1: Tooling Setup** - Added `package.json`, `bunfig.toml`, Makefile targets
- [x] **Phase 2: Terminal Client** - Created `terminal.ts` with full WebSocket protocol
- [x] **Phase 3: Server Integration** - Updated HTML template, removed monkey-patch
- [x] **Phase 4: Configuration** - Added `data-scrollback` attribute support
- [x] **Phase 5: Remove Dependency** - Dropped `textual-serve` from pyproject.toml
- [x] **Phase 6: Documentation** - Updated README.md and ARCHITECTURE.md

### Key Outcomes

| Metric | Before | After |
|--------|--------|-------|
| textual-serve dependency | Required | ❌ Removed |
| Scrollback history | 0 (none) | 1000 (configurable) |
| Font configuration | Monkey-patch workaround | Direct configuration |
| Bundle size | 502 KB + 381 KB fonts | 560 KB total |
| xterm.js version | Unknown (5.x?) | 6.0.0 |

### Files Changed

```
Added:
  package.json              # xterm.js 6.0 + addons
  bunfig.toml               # Bun configuration
  src/.../static/js/terminal.ts   # TypeScript source
  src/.../static/js/terminal.js   # Pre-built bundle (committed)
  src/.../static/css/xterm.css    # xterm.js styles

Modified:
  pyproject.toml            # Removed textual-serve dependency
  Makefile                  # Added bundle/bundle-watch targets
  .gitignore                # Added node_modules/
  src/.../local_server.py   # Simplified HTML template
  docs/ARCHITECTURE.md      # Updated file structure
  README.md                 # Added frontend dev instructions
```

### For Users

No action required. The pre-built `terminal.js` bundle is committed to the repo, so:

```bash
pip install git+https://github.com/rcarmo/textual-webterm.git@upstream-xterm
```

Works without needing Node.js or Bun.

### For Developers

To modify the frontend:

```bash
# Install Bun (https://bun.sh)
curl -fsSL https://bun.sh/install | bash

# Install dependencies and build
make bundle

# Or watch for changes during development
make bundle-watch
```

---

## Background Analysis

The sections below document the original analysis that led to this migration.

### What textual-serve Provides

| Asset | Size | What We Use | Required? |
|-------|------|-------------|-----------|
| `static/js/textual.js` | 502 KB | xterm.js + WebSocket client | **Yes** |
| `static/css/xterm.css` | 4.6 KB | Terminal styling | **Yes** |
| `static/fonts/RobotoMono*.ttf` | 381 KB | Roboto Mono font | No (we override font) |
| `static/images/background.png` | 58 KB | Background image | No |
| **Total** | **948 KB** | | |

### What textual.js Bundle Contains

The minified `textual.js` bundles:

```
xterm.js (core terminal)
├── @xterm/addon-fit        (auto-resize to container)
├── @xterm/addon-webgl      (GPU-accelerated rendering)
├── @xterm/addon-canvas     (fallback 2D canvas renderer)
├── @xterm/addon-unicode11  (wide character support)
├── @xterm/addon-web-links  (clickable URLs)
├── @xterm/addon-clipboard  (clipboard integration)
└── WebSocket client wrapper (class w)
```

### Hardcoded Configuration in textual.js

```javascript
new Terminal({
  allowProposedApi: true,
  fontSize: /* from data-font-size attribute */,
  scrollback: 0,           // ❌ No scrollback history
  fontFamily: "'Roboto Mono', Monaco, 'Courier New', monospace"  // ❌ Hardcoded
})
```

### WebSocket Protocol (Fully Compatible)

The protocol is simple JSON arrays. Our server already implements this:

| Direction | Message | Description |
|-----------|---------|-------------|
| Client → Server | `["stdin", "data"]` | Terminal input |
| Client → Server | `["resize", {width: N, height: M}]` | Window resize |
| Client → Server | `["ping", data]` | Keep-alive |
| Server → Client | `["stdout", "data"]` | Terminal output (text) |
| Server → Client | Binary frame | Terminal output (binary) |
| Server → Client | `["pong", data]` | Keep-alive response |

### Current Workarounds

1. **Font override**: Canvas monkey-patch in HTML to replace hardcoded font family
2. **No scrollback**: Users cannot scroll back through terminal history

---

## Tradeoffs Analysis

### Option A: Keep textual-serve Dependency

| Pros | Cons |
|------|------|
| Zero build tooling | Hardcoded font requires workaround |
| Automatic updates via pip | No scrollback (scrollback: 0) |
| Maintained by Textualize | No theme customization |
| | Carries unused fonts/images (381 KB) |
| | Tied to textual-serve release cycle |
| | Unknown xterm.js version (likely 5.x) |

### Option B: Bundle xterm.js 6.0 Directly

| Pros | Cons |
|------|------|
| Full configuration control | Requires Bun toolchain |
| Scrollback history support | ~150-200 KB bundle to maintain |
| Custom themes/colors | Must track xterm.js updates |
| Latest xterm.js 6.0 features | Initial setup effort (2-3 days) |
| Smaller bundle (no unused fonts) | |
| Can drop textual-serve dependency | |

### xterm.js 6.0 Features We'd Gain

| Feature | Benefit |
|---------|---------|
| Synchronized output (DEC 2026) | Smoother rapid output rendering |
| Ligature support | Better programming font rendering |
| Progress addon | Visual progress indicators |
| Shadow DOM support | Better CSS encapsulation |
| ESM support | Modern module loading |
| Performance improvements | Faster search, less memory |
| OSC 52 clipboard | Secure clipboard from terminal |

---

## Implementation Plan (Completed)

### Phase 1: Tooling Setup ✅

**Goal**: Establish Bun-based build pipeline

```
src/textual_webterm/
├── static/
│   ├── js/
│   │   └── terminal.ts      # New: our xterm wrapper
│   ├── css/
│   │   └── xterm.css        # Copied from xterm.js package
│   └── monospace.css        # Existing
├── package.json             # New: npm dependencies
└── bunfig.toml              # New: Bun configuration
```

**Tasks**:
- [x] Create `package.json` with xterm.js 6.0 dependencies
- [x] Create `bunfig.toml` for build configuration
- [x] Add `Makefile` targets: `make bundle`, `make bundle-watch`
- [x] Add `.gitignore` entries for `node_modules/`
- [x] Document Bun installation in README

**package.json** (final):
```json
{
  "name": "textual-webterm-frontend",
  "private": true,
  "type": "module",
  "dependencies": {
    "@xterm/xterm": "^6.0.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-webgl": "^0.18.0",
    "@xterm/addon-canvas": "^0.7.0",
    "@xterm/addon-unicode11": "^0.8.0",
    "@xterm/addon-web-links": "^0.11.0",
    "@xterm/addon-clipboard": "^0.2.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  },
  "scripts": {
    "build": "bun build src/textual_webterm/static/js/terminal.ts --outfile=src/textual_webterm/static/js/terminal.js --minify --target=browser",
    "watch": "bun build src/textual_webterm/static/js/terminal.ts --outfile=src/textual_webterm/static/js/terminal.js --watch --target=browser"
  }
}
```

### Phase 2: Terminal Client Implementation ✅

**Goal**: Create `terminal.ts` that replicates textual.js functionality

**Tasks**:
- [x] Implement Terminal wrapper class
- [x] WebSocket connection with reconnection logic
- [x] Message protocol handling (stdin, resize, ping/pong)
- [x] Addon initialization (fit, webgl, canvas, unicode11, web-links, clipboard)
- [x] Configurable options via data attributes or window config

See `src/textual_webterm/static/js/terminal.ts` for the full implementation (~230 lines).

### Phase 3: Server Integration ✅

**Goal**: Update local_server.py to use new bundle

**Tasks**:
- [x] Update HTML template to load our bundle instead of textual.js
- [x] Remove canvas monkey-patch workaround
- [x] Add data attributes for scrollback, theme configuration
- [x] Copy xterm.css to our static folder
- [x] Update static file routes

### Phase 4: Configuration Support ✅

**Goal**: Make terminal appearance configurable

**Tasks**:
- [x] Pass config to HTML template via data attributes (`data-scrollback`, `data-font-size`)
- [ ] Add terminal config to CLI (--scrollback, --font-family) - *Future enhancement*
- [ ] Add terminal config to TOML manifest files - *Future enhancement*

### Phase 5: Remove textual-serve Dependency ✅

**Goal**: Eliminate dependency once our bundle is stable

**Tasks**:
- [x] Remove `textual-serve` from pyproject.toml dependencies
- [x] Update ARCHITECTURE.md to document new frontend
- [x] Update README.md with build instructions
- [x] Commit pre-built bundle so users don't need Bun

### Phase 6: Testing & Polish

**Goal**: Ensure reliability across browsers

**Tasks**:
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile browser testing (iOS Safari, Chrome Android)
- [x] WebGL fallback to Canvas (implemented in terminal.ts)
- [x] Reconnection logic (implemented with exponential backoff)
- [ ] Performance comparison vs textual.js
- [x] Bundle size: 560 KB (acceptable for full xterm.js + addons)

---

## Build Integration (Reference)

### Makefile Additions

```makefile
# Frontend build
.PHONY: bundle bundle-watch bundle-clean

bundle: node_modules
	bun run build

bundle-watch: node_modules
	bun run watch

bundle-clean:
	rm -rf node_modules src/textual_webterm/static/js/terminal.js

node_modules: package.json
	bun install
```

### Dockerfile Changes

```dockerfile
# Add Bun for frontend build
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Build frontend
COPY package.json bunfig.toml ./
RUN bun install
COPY src/textual_webterm/static/js/terminal.ts src/textual_webterm/static/js/
RUN bun run build
```

### CI/CD Considerations

- Pre-commit hook to verify `terminal.js` matches `terminal.ts`
- Or: commit built bundle to repo (simpler for users without Bun)
- GitHub Actions step to build and verify bundle

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| xterm.js 6.0 breaking changes | Pin exact version, test thoroughly |
| Bun compatibility issues | Fall back to esbuild if needed |
| WebSocket protocol mismatch | Keep protocol identical to textual.js |
| Performance regression | Benchmark before/after, keep WebGL |
| Missing addon features | Test each addon explicitly |

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Tooling Setup | 0.5 days | None |
| Phase 2: Terminal Client | 1-2 days | Phase 1 |
| Phase 3: Server Integration | 0.5 days | Phase 2 |
| Phase 4: Configuration | 0.5 days | Phase 3 |
| Phase 5: Remove Dependency | 0.5 days | Phase 4 |
| Phase 6: Testing | 1 day | Phase 5 |
| **Total** | **4-5 days** | |

---

## Decision Checkpoints

1. **After Phase 2**: Verify terminal.ts works in isolation before integrating
2. **After Phase 3**: Side-by-side comparison with textual.js
3. **After Phase 5**: Confirm no regressions before removing dependency
4. **After Phase 6**: Final sign-off for release

---

## Success Criteria

- [ ] Terminal renders correctly in Chrome, Firefox, Safari
- [x] Scrollback history works (configurable limit)
- [x] Custom fonts load without workarounds
- [x] WebGL rendering enabled with Canvas fallback
- [x] Bundle size: 560 KB (larger than target due to full addon suite, but acceptable)
- [x] No textual-serve dependency in pyproject.toml
- [x] All existing tests pass (302 tests)
- [x] Documentation updated

---
---

# Future: Go Reimplementation

This section analyzes what it would take to reimplement textual-webterm in Go for lighter deployment.

## Status: 📋 Planning

Not yet started. This would be a separate project (`textual-webterm-go`) providing a lightweight alternative.

## Executive Summary

**Most functionality can be reimplemented in Go** with mature libraries. The main challenge is the terminal emulator (pyte equivalent) - GoPyte exists but is less battle-tested than Python's pyte. Benefits would be a single static binary, lower memory footprint, and better concurrency.

---

## Component Mapping

| Python Component | Go Equivalent | Library | Maturity |
|-----------------|---------------|---------|----------|
| **aiohttp** (HTTP/WS server) | net/http + websocket | `gorilla/websocket` or `nhooyr.io/websocket` | ⭐⭐⭐⭐⭐ Excellent |
| **pyte** (terminal emulator) | GoPyte | `github.com/scottpeterman/gopyte` | ⭐⭐⭐ Good |
| **PTY handling** | go-pty | `github.com/aymanbagabas/go-pty` | ⭐⭐⭐⭐ Very Good |
| **asyncio** (concurrency) | goroutines/channels | stdlib | ⭐⭐⭐⭐⭐ Native |
| **SSE** | Custom handler | stdlib `net/http` | ⭐⭐⭐⭐ Simple |
| **Docker stats** | Docker SDK | `github.com/docker/docker/client` | ⭐⭐⭐⭐⭐ Official |
| **SVG generation** | SVGo | `github.com/ajstarks/svgo` | ⭐⭐⭐⭐⭐ Mature |
| **YAML parsing** | yaml.v3 | `gopkg.in/yaml.v3` | ⭐⭐⭐⭐⭐ Standard |
| **CLI** | cobra | `github.com/spf13/cobra` | ⭐⭐⭐⭐⭐ Standard |

---

## pyte vs GoPyte: Thorough Comparison

This section compares the Python **pyte** terminal emulator and the Go **GoPyte** emulator (per their upstream documentation/README). The focus is on feature parity, Unicode handling, performance expectations, and integration risk for textual-webterm.

### Feature Matrix (Detailed)

| Capability | pyte (Python) | GoPyte (Go) | Relevance to terminal capture | Gaps / Risks |
|-----------|---------------|-------------|-------------------------------|--------------|
| **Terminal standards** | VTXXX/ANSI (VT100-style) | VT100/VT220/ANSI (claims) | Core escape parsing for screen state | Verify DEC private modes & OSC support. |
| **Screen buffer** | Screen + HistoryScreen classes | Screen buffer (claims) | Required for SVG snapshot state | Data model differences may affect attributes. |
| **Alt screen** | Supported | Supported (claims) | Full-screen apps (vim/less/htop) | Must validate mode switching correctness. |
| **Scrollback/history** | HistoryScreen (configurable) | Built-in scrollback (claims) | Useful for replay + screenshots | Size/perf tradeoffs; semantics differ. |
| **Resize handling** | Resizes + cursor + dirty state | Resizes + content (claims) | Correct dimensions for SVG | Content preservation on resize is critical. |
| **SGR attributes** | Bold/underline/reverse/color | SGR attrs (claims) | SVG text styling | Verify italics/faint/strikethrough. |
| **Color depth** | ANSI + 256 + (truecolor in practice) | ANSI + 256? (verify) | Accurate screenshots | Truecolor/24-bit must be validated. |
| **Unicode & width** | `wcwidth`-style width | `go-runewidth` | Glyph positioning | Emoji/CJK width divergence is likely. |
| **Combining marks** | Handled via Unicode rules | Depends on runewidth | Accuracy of grapheme clusters | May require additional grapheme handling. |
| **Dirty tracking** | Exposes dirty flag set | Unknown (likely missing) | Screenshot cache invalidation | May need manual diff tracking in Go. |
| **Hyperlinks (OSC 8)** | Not explicit in docs | Unknown | Optional for capture | Lower priority but worth checking. |
| **DEC modes** | Partial (VTXXX scope) | Unknown | Full-screen apps | Validate cursor keys, keypad modes. |
| **Performance** | Python, moderate throughput | Go, claims high throughput | Large-output sessions | Benchmark with 100k+ lines. |
| **API stability** | Mature, widely used | Newer, smaller ecosystem | Maintenance risk | Potential breaking changes. |
| **Test coverage** | Mature test suite | Claims high coverage | Regression risk | Must run our own suite. |

### Unicode & Emoji Handling (Required for Capture Quality)

**pyte**
- Uses Python Unicode + width calculation (via `wcwidth`-style logic).
- Generally robust for wide CJK and emoji, but width edge cases are known across terminals.

**GoPyte**
- Uses `go-runewidth` for width calculation.
- Width differences vs `wcwidth` may cause rendering mismatches in SVG screenshots.

**Impact for textual-webterm**
- Width mismatches affect SVG x-coordinates (misaligned screenshots).
- Emoji sequences (ZWJ, variation selectors) can render as multi-cell in one library and single-cell in another.
- Must test CJK + emoji + combining marks against our SVG exporter.

### Performance & Memory (Capture-Heavy Workloads)

**pyte**
- Pure Python; adequate for typical terminal workloads.
- Performance is predictable but slower than Go for heavy output.

**GoPyte**
- Go implementation; upstream claims high throughput.
- Performance depends heavily on screen model + allocation strategy.

**Action**: Benchmark with real workloads (fast output, scrollback growth, frequent screenshots).

### Maintenance & Maturity

**pyte**
- Long-lived, stable, widely used.
- Well-known behavior and edge cases.

**GoPyte**
- Newer, smaller community.
- Claimed feature set is promising but less battle-tested.

**Action**: Track issue backlog and recent activity before committing.

### Required Features for textual-webterm Capture

We rely on the emulator for **accurate screenshot state**, not just live display. Required features:

- **Stable screen buffer** with per-cell fg/bg/bold/underline/reverse.
- **Accurate cursor position** after control sequences and resizes.
- **Alt screen correctness** for full-screen TUIs.
- **Consistent Unicode width** for precise SVG positioning.
- **Dirty tracking or diffability** to avoid re-rendering unchanged screens.
- **Reliable color mapping** (ANSI 16 + 256 + truecolor).

If any of these are missing or inconsistent, screenshots will be wrong.

### Known Gaps / Validation Checklist

Before relying on GoPyte for parity, verify:

- [ ] Full-screen app behavior (vim, htop, less) with alt screen.
- [ ] SGR coverage: bold/underline/italic/reverse + 256/truecolor.
- [ ] Unicode width parity with pyte (emoji + CJK samples).
- [ ] Cursor state transitions across resize and alternate screen.
- [ ] Scrollback semantics (history vs scrollback buffer model).
- [ ] Performance at high output rates (100k+ lines, low latency).

### Integration Implications for textual-webterm

- **Screen buffer mapping**: GoPyte’s cell structure must map into our SVG exporter schema (fg/bg/bold/underline/reverse).
- **Dirty tracking**: pyte exposes dirty state; GoPyte may need explicit diff tracking for efficient screenshot caching.
- **Color translation**: Ensure SGR parsing aligns with our ANSI palette and truecolor handling.
- **Replay buffer**: Our replay buffer is independent, but needs to coordinate with screen state updates for consistent screenshots.

### Alternatives (Brief)

If GoPyte does not meet parity, consider:

- **govte** (`github.com/cliofy/govte`): Xterm-like parser/buffer; appears more comprehensive but less documented.
- **vito/vt100**: Lightweight VT100 emulator, limited scrollback/alt-screen support.
- **xyproto/vt100**: Focused on TUI canvas; not a drop-in emulator.

These alternatives would still need feature validation for capture parity.

---

## What We'd Gain

| Benefit | Impact |
|---------|--------|
| **Single static binary** | No Python/pip dependency, simpler deployment |
| **Lower memory** | ~10-20MB vs ~50-100MB for Python |
| **Better concurrency** | Goroutines vs asyncio - more intuitive |
| **Faster startup** | Instant vs Python interpreter load |
| **Cross-compilation** | Easy builds for Linux/macOS/Windows/ARM |
| **Smaller Docker image** | ~20MB vs ~200MB+ with Python |

## What We'd Lose

| Loss | Impact |
|------|--------|
| **Textual app support** | Cannot run Python Textual apps directly |
| **Rapid prototyping** | Go requires more boilerplate |
| **pyte maturity** | GoPyte is less proven |

---

## Required Go Dependencies

```go
// go.mod
module github.com/rcarmo/textual-webterm-go

go 1.22

require (
    // HTTP/WebSocket
    github.com/gorilla/websocket v1.5.1
    
    // Terminal emulation
    github.com/scottpeterman/gopyte v0.1.0
    
    // PTY handling
    github.com/aymanbagabas/go-pty v0.2.2
    
    // Docker stats
    github.com/docker/docker v25.0.0
    
    // SVG generation
    github.com/ajstarks/svgo v0.0.0-20211024235047-1546f124cd8b
    
    // CLI
    github.com/spf13/cobra v1.8.0
    
    // YAML parsing
    gopkg.in/yaml.v3 v3.0.1
)
```

---

## Implementation Plan

### Phase 1: Project Setup & Core Server (2 days)

**Goal**: Basic HTTP server with WebSocket support

**Tasks**:
- [ ] Initialize Go module with dependencies
- [ ] Create basic HTTP server with routing
- [ ] Implement WebSocket upgrade handler
- [ ] Port JSON message protocol (stdin, resize, ping/pong)
- [ ] Add graceful shutdown handling

**Files**:
```
cmd/
  webterm/
    main.go           # Entry point
internal/
  server/
    server.go         # HTTP server
    websocket.go      # WebSocket handler
    routes.go         # Route definitions
```

### Phase 2: PTY Session Management (2 days)

**Goal**: Spawn and manage terminal sessions

**Tasks**:
- [ ] Integrate go-pty for PTY creation
- [ ] Implement session lifecycle (create, resize, close)
- [ ] Build session manager with route mapping
- [ ] Add replay buffer for reconnection
- [ ] Handle concurrent session access

**Files**:
```
internal/
  session/
    manager.go        # Session registry
    terminal.go       # PTY session wrapper
    buffer.go         # Replay ring buffer
```

### Phase 3: Terminal Emulation (2 days)

**Goal**: Parse ANSI sequences for screen state

**Tasks**:
- [ ] Integrate GoPyte terminal emulator
- [ ] Feed PTY output through emulator
- [ ] Extract screen buffer for screenshots
- [ ] Implement dirty tracking for cache invalidation
- [ ] Handle resize events

**Files**:
```
internal/
  terminal/
    emulator.go       # GoPyte wrapper
    screen.go         # Screen buffer access
```

### Phase 4: SVG Screenshot Generation (1.5 days)

**Goal**: Generate terminal screenshots as SVG

**Tasks**:
- [ ] Port character positioning logic from Python
- [ ] Implement ANSI color palette (16 + 256 + truecolor)
- [ ] Handle box-drawing character scaling
- [ ] Add screenshot caching with ETag support
- [ ] Implement cache TTL backoff

**Files**:
```
internal/
  screenshot/
    svg.go            # SVG renderer
    colors.go         # ANSI color handling
    cache.go          # Screenshot cache
```

### Phase 5: Dashboard & SSE (1.5 days)

**Goal**: Landing page with live updates

**Tasks**:
- [ ] Embed static assets (HTML, CSS, xterm.js bundle)
- [ ] Implement SSE endpoint for activity notifications
- [ ] Port dashboard HTML template
- [ ] Add tile rendering with screenshots

**Files**:
```
internal/
  dashboard/
    handler.go        # Dashboard HTTP handler
    sse.go            # Server-Sent Events
  static/
    embed.go          # Embedded assets
```

### Phase 6: Docker Stats (1 day)

**Goal**: CPU sparklines for compose mode

**Tasks**:
- [ ] Integrate Docker SDK client
- [ ] Implement container stats polling
- [ ] Calculate CPU percentage from deltas
- [ ] Generate sparkline SVGs
- [ ] Filter by compose project label

**Files**:
```
internal/
  docker/
    stats.go          # Stats collector
    sparkline.go      # SVG sparkline
```

### Phase 7: CLI & Configuration (1 day)

**Goal**: Feature-complete CLI

**Tasks**:
- [ ] Implement Cobra CLI with flags
- [ ] Parse YAML landing manifests
- [ ] Parse Docker Compose manifests
- [ ] Add version command
- [ ] Environment variable support

**Files**:
```
cmd/
  webterm/
    main.go           # CLI entry point
internal/
  config/
    config.go         # Configuration types
    manifest.go       # YAML parsing
```

### Phase 8: Testing & Polish (2 days)

**Goal**: Production-ready release

**Tasks**:
- [ ] Unit tests for core components
- [ ] Integration tests for WebSocket protocol
- [ ] Cross-browser testing
- [ ] Build scripts for multiple platforms
- [ ] Docker image (FROM scratch)
- [ ] Documentation

**Files**:
```
Makefile              # Build targets
Dockerfile            # Multi-stage build
README.md             # Usage docs
```

---

## Effort Summary

| Phase | Component | Days |
|-------|-----------|------|
| 1 | Project Setup & Core Server | 2 |
| 2 | PTY Session Management | 2 |
| 3 | Terminal Emulation | 2 |
| 4 | SVG Screenshot Generation | 1.5 |
| 5 | Dashboard & SSE | 1.5 |
| 6 | Docker Stats | 1 |
| 7 | CLI & Configuration | 1 |
| 8 | Testing & Polish | 2 |
| **Total** | | **13 days** |

---

## File Structure (Final)

```
textual-webterm-go/
├── cmd/
│   └── webterm/
│       └── main.go
├── internal/
│   ├── config/
│   │   ├── config.go
│   │   └── manifest.go
│   ├── dashboard/
│   │   ├── handler.go
│   │   └── sse.go
│   ├── docker/
│   │   ├── sparkline.go
│   │   └── stats.go
│   ├── screenshot/
│   │   ├── cache.go
│   │   ├── colors.go
│   │   └── svg.go
│   ├── server/
│   │   ├── routes.go
│   │   ├── server.go
│   │   └── websocket.go
│   ├── session/
│   │   ├── buffer.go
│   │   ├── manager.go
│   │   └── terminal.go
│   ├── static/
│   │   └── embed.go
│   └── terminal/
│       ├── emulator.go
│       └── screen.go
├── static/
│   ├── css/
│   │   └── xterm.css
│   └── js/
│       └── terminal.js
├── go.mod
├── go.sum
├── Makefile
├── Dockerfile
└── README.md
```

---

## Build & Release

### Makefile Targets

```makefile
.PHONY: build build-all test clean

BINARY := webterm
VERSION := $(shell git describe --tags --always)
LDFLAGS := -s -w -X main.version=$(VERSION)

build:
	go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY) ./cmd/webterm

build-all:
	GOOS=linux GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY)-linux-amd64 ./cmd/webterm
	GOOS=linux GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY)-linux-arm64 ./cmd/webterm
	GOOS=darwin GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY)-darwin-amd64 ./cmd/webterm
	GOOS=darwin GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o bin/$(BINARY)-darwin-arm64 ./cmd/webterm

test:
	go test -v ./...

clean:
	rm -rf bin/
```

### Minimal Docker Image

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags "-s -w" -o webterm ./cmd/webterm

FROM scratch
COPY --from=builder /app/webterm /webterm
ENTRYPOINT ["/webterm"]
```

**Result**: ~15-20MB Docker image vs ~200MB+ for Python version.

---

## Decision Criteria

Proceed with Go reimplementation if:

- [ ] Deployment size is critical (embedded, edge, IoT)
- [ ] No need for Textual app support
- [ ] Want single-binary distribution
- [ ] Memory constraints matter

Keep Python version if:

- [ ] Need Textual app support
- [ ] Rapid iteration is priority
- [ ] Team more familiar with Python
- [ ] Current deployment size is acceptable

---

## References

- GoPyte: https://github.com/scottpeterman/gopyte
- go-pty: https://github.com/aymanbagabas/go-pty
- Gorilla WebSocket: https://github.com/gorilla/websocket
- Docker Go SDK: https://pkg.go.dev/github.com/docker/docker/client
- SVGo: https://github.com/ajstarks/svgo
- Cobra CLI: https://github.com/spf13/cobra

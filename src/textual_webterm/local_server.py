"""Local server implementation for serving terminals over HTTP/WebSocket."""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import json
import logging
import signal
from pathlib import Path
from typing import TYPE_CHECKING

import aiohttp
from aiohttp import WSMsgType, web

from . import constants
from .docker_stats import DockerStatsCollector, render_sparkline_svg
from .exit_poller import ExitPoller
from .identity import generate
from .poller import Poller
from .session import SessionConnector
from .session_manager import SessionManager
from .svg_exporter import render_terminal_svg
from .types import Meta, RouteKey, SessionID

if TYPE_CHECKING:
    from .config import Config

log = logging.getLogger("textual-web")

DEFAULT_TERMINAL_SIZE = (132, 45)

SCREENSHOT_CACHE_SECONDS = 0.3
SCREENSHOT_MAX_CACHE_SECONDS = 20.0
CLEAR_AND_REDRAW_SEQ = "\x0c"  # Ctrl+L: clear and redraw


WEBTERM_STATIC_PATH = Path(__file__).parent / "static"

# Theme background colors - must match terminal.ts THEMES
THEME_BACKGROUNDS: dict[str, str] = {
    "xterm": "#000000",
    "monokai": "#2d2a2e",
    "ristretto": "#2d2525",
    "dark": "#1e1e1e",
    "light": "#ffffff",
    "dracula": "#282a36",
    "catppuccin": "#1e1e2e",
    "nord": "#2e3440",
    "gruvbox": "#282828",
    "solarized": "#002b36",
    "tokyo": "#1a1b26",
}


class LocalClientConnector(SessionConnector):
    """Local connector that handles communication between sessions and local server."""

    def __init__(self, server: LocalServer, session_id: SessionID, route_key: RouteKey) -> None:
        self.server = server
        self.session_id = session_id
        self.route_key = route_key

    async def on_data(self, data: bytes) -> None:
        self.server.mark_route_activity(str(self.route_key))
        await self.server.handle_session_data(self.route_key, data)

    async def on_meta(self, meta: Meta) -> None:
        meta_type = meta.get("type")
        if meta_type == "open_url":
            log.info("App requested to open URL: %s", meta.get("url"))
        elif meta_type == "deliver_file_start":
            log.info("App requested file delivery: %s", meta.get("path"))
        else:
            log.debug("Unknown meta type: %r. Full meta: %r", meta_type, meta)

    async def on_binary_encoded_message(self, payload: bytes) -> None:
        await self.server.handle_binary_message(self.route_key, payload)

    async def on_close(self) -> None:
        await self.server.handle_session_close(self.session_id, self.route_key)


class LocalServer:
    def mark_route_activity(self, route_key: str) -> None:
        now = asyncio.get_event_loop().time()
        self._route_last_activity[route_key] = now
        # Throttle SSE notifications - max once per 250ms per route
        last_notified = self._route_last_sse_notification.get(route_key, 0.0)
        if now - last_notified >= 0.25:
            self._route_last_sse_notification[route_key] = now
            self._notify_activity(route_key)

    def _notify_activity(self, route_key: str) -> None:
        """Notify SSE subscribers that a route has activity."""
        for queue in self._sse_subscribers:
            with contextlib.suppress(asyncio.QueueFull):
                queue.put_nowait(route_key)

    def _get_cached_screenshot_response(
        self, request: web.Request, route_key: str
    ) -> web.Response | None:
        cached = self._screenshot_cache.get(route_key)
        if cached is None:
            return None

        etag = self._screenshot_cache_etag.get(route_key)
        if etag and request.headers.get("If-None-Match") == etag:
            raise web.HTTPNotModified(headers={"ETag": etag, "Cache-Control": "no-cache"})

        headers = {"Cache-Control": "no-cache"}
        if etag:
            headers["ETag"] = etag
        return web.Response(text=cached[1], content_type="image/svg+xml", headers=headers)

    def _get_screenshot_cache_ttl(self, route_key: str, now: float) -> float:
        last_activity = self._route_last_activity.get(route_key, 0.0)
        idle_for = max(0.0, now - last_activity)

        # Active sessions refresh quickly; idle sessions back off aggressively.
        if idle_for < 3.0:
            return SCREENSHOT_CACHE_SECONDS
        if idle_for < 15.0:
            return 2.0
        if idle_for < 120.0:
            return 5.0
        return SCREENSHOT_MAX_CACHE_SECONDS

    """Manages local Textual apps and terminals without Ganglion server."""

    def __init__(
        self,
        config_path: str,
        config: Config,
        host: str = "0.0.0.0",
        port: int = 8080,
        exit_on_idle: int = 0,
        landing_apps: list | None = None,
        compose_mode: bool = False,
        compose_project: str | None = None,
        theme: str = "xterm",
        font_family: str | None = None,
        font_size: int = 16,
    ) -> None:
        self.host = host
        self.port = port
        self.theme = theme
        self.font_family = font_family
        self.font_size = font_size

        abs_path = Path(config_path).absolute()
        path = abs_path if abs_path.is_dir() else abs_path.parent
        self.config = config
        self._websocket_server: aiohttp.web.WebSocketResponse | None = None
        self._poller = Poller()
        self.session_manager = SessionManager(self._poller, path, config.apps)
        self.exit_event = asyncio.Event()
        self._task: asyncio.Task | None = None
        self._shutdown_task: asyncio.Task | None = None
        self._shutdown_started = False
        self._loop: asyncio.AbstractEventLoop | None = None
        self._exit_poller = ExitPoller(self, idle_wait=exit_on_idle)

        self._websocket_connections: dict[RouteKey, web.WebSocketResponse] = {}
        self._landing_apps = landing_apps or []
        self._compose_mode = compose_mode
        self._compose_project = compose_project

        self._screenshot_cache: dict[str, tuple[float, str]] = {}
        self._screenshot_cache_etag: dict[str, str] = {}
        self._screenshot_locks: dict[str, asyncio.Lock] = {}
        self._route_last_activity: dict[str, float] = {}
        self._route_last_sse_notification: dict[str, float] = {}

        # SSE subscribers for activity notifications
        self._sse_subscribers: list[asyncio.Queue[str]] = []

        # Docker stats collector (only used in compose mode)
        self._docker_stats: DockerStatsCollector | None = None
        self._slug_to_service: dict[str, str] = {}

    @property
    def app_count(self) -> int:
        return len(self.session_manager.apps)

    def add_app(self, name: str, command: str, slug: str = "") -> None:
        slug = slug or generate().lower()
        self.session_manager.add_app(name, command, slug=slug)

    def add_terminal(self, name: str, command: str, slug: str = "") -> None:
        if constants.WINDOWS:
            log.warning("Sorry, textual-web does not currently support terminals on Windows")
            return
        slug = slug or generate().lower()
        self.session_manager.add_app(name, command, slug=slug, terminal=True)

    async def run(self) -> None:
        try:
            await self._run()
        finally:
            self._exit_poller.stop()
            if not constants.WINDOWS:
                with contextlib.suppress(Exception):
                    self._poller.exit()

    def on_keyboard_interrupt(self) -> None:
        print("\r\033[F")
        log.info("Exit requested")

        if self._shutdown_started:
            self.exit_event.set()
            return
        self._shutdown_started = True

        # Ensure we shut down sessions and websockets before stopping the server.
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop is not None:
            if self._shutdown_task is None or self._shutdown_task.done():
                self._shutdown_task = asyncio.create_task(self._shutdown())
            return

        if self._loop is not None and self._loop.is_running():
            if self._shutdown_task is None or self._shutdown_task.done():

                def _schedule() -> None:
                    self._shutdown_task = asyncio.create_task(self._shutdown())

                self._loop.call_soon_threadsafe(_schedule)
            return

        self.exit_event.set()

    async def _run(self) -> None:
        loop = asyncio.get_event_loop()
        self._loop = loop

        if constants.WINDOWS:

            def exit_handler(_sig, _frame) -> None:
                self.on_keyboard_interrupt()

            signal.signal(signal.SIGINT, exit_handler)
        else:
            loop.add_signal_handler(signal.SIGINT, self.on_keyboard_interrupt)
            self._poller.set_loop(loop)
            self._poller.start()

        self._task = asyncio.create_task(self._run_local_server())
        self._exit_poller.start()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task

    def _build_routes(self) -> list[web.AbstractRouteDef]:
        routes: list[web.AbstractRouteDef] = [
            web.get("/ws/{route_key}", self._handle_websocket),
            web.get("/screenshot.svg", self._handle_screenshot),
            web.get("/cpu-sparkline.svg", self._handle_cpu_sparkline),
            web.get("/events", self._handle_sse),
            web.get("/health", self._handle_health_check),
            web.get("/", self._handle_root),
        ]

        if WEBTERM_STATIC_PATH.exists():
            routes.append(web.static("/static", WEBTERM_STATIC_PATH))
            log.info("Static assets served from: %s", WEBTERM_STATIC_PATH)
        else:
            log.error("Static assets not found at %s - terminal UI will not work", WEBTERM_STATIC_PATH)

        return routes

    async def _shutdown(self) -> None:
        # Set exit event first so main loop exits immediately
        self.exit_event.set()

        # Clean up resources with timeout (best effort, don't block exit)
        async def cleanup() -> None:
            for ws in list(self._websocket_connections.values()):
                with contextlib.suppress(Exception):
                    await ws.close()
            with contextlib.suppress(Exception):
                await self.session_manager.close_all()

        try:
            await asyncio.wait_for(cleanup(), timeout=3.0)
        except TimeoutError:
            log.warning("Shutdown timed out, forcing exit")

    async def _run_local_server(self) -> None:
        app = web.Application()
        app.add_routes(self._build_routes())

        runner = web.AppRunner(app)
        async with contextlib.AsyncExitStack() as stack:
            await runner.setup()
            stack.push_async_callback(runner.cleanup)

            # Start Docker stats collector in compose mode
            if self._compose_mode and self._landing_apps:
                self._docker_stats = DockerStatsCollector(
                    compose_project=self._compose_project
                )
                if self._docker_stats.available:
                    # Pass service names (not slugs) for Docker matching
                    service_names = [app.name for app in self._landing_apps]
                    self._docker_stats.start(service_names)
                    # Create slug->name mapping for lookups
                    self._slug_to_service = {
                        app.slug: app.name for app in self._landing_apps
                    }
                    log.info("Slug to service mapping: %s", self._slug_to_service)
                    stack.push_async_callback(self._docker_stats.stop)

            site = web.TCPSite(runner, self.host, self.port)
            await site.start()

            log.info("Local server started on %s:%s", self.host, self.port)
            log.info("Available apps: %s", ", ".join(app.name for app in self.session_manager.apps))

            await self.exit_event.wait()

    async def _handle_stdin(
        self, envelope: list, route_key: str, _ws: web.WebSocketResponse
    ) -> None:
        self.mark_route_activity(route_key)
        data = envelope[1] if len(envelope) > 1 else ""
        session_process = self.session_manager.get_session_by_route_key(RouteKey(route_key))
        if session_process:
            await session_process.send_bytes(data.encode("utf-8"))

    async def _handle_resize(
        self, envelope: list, route_key: str, _ws: web.WebSocketResponse
    ) -> bool:
        """Handle resize message. Returns True if a new session was created."""
        self.mark_route_activity(route_key)
        size_data = envelope[1] if len(envelope) > 1 else {}
        width = max(1, min(500, int(size_data.get("width", 80))))
        height = max(1, min(500, int(size_data.get("height", 24))))

        session_process = self.session_manager.get_session_by_route_key(RouteKey(route_key))
        if session_process is None:
            await self._create_terminal_session(route_key, width, height)
            return True
        await session_process.set_terminal_size(width, height)
        # Invalidate screenshot cache on resize - content needs to re-render
        self._screenshot_cache.pop(route_key, None)
        self._screenshot_cache_etag.pop(route_key, None)
        return False

    async def _handle_ping(
        self, envelope: list, _route_key: str, ws: web.WebSocketResponse
    ) -> None:
        data = envelope[1] if len(envelope) > 1 else ""
        await ws.send_json(["pong", data])

    async def _dispatch_ws_message(
        self,
        envelope: list,
        route_key: str,
        ws: web.WebSocketResponse,
        session_created: bool,
    ) -> bool:
        msg_type = envelope[0]

        if msg_type == "stdin":
            await self._handle_stdin(envelope, route_key, ws)
        elif msg_type == "resize":
            if not session_created:
                session_created = await self._handle_resize(envelope, route_key, ws)
            else:
                await self._handle_resize(envelope, route_key, ws)
        elif msg_type == "ping":
            await self._handle_ping(envelope, route_key, ws)

        return session_created

    async def _handle_websocket(self, request: web.Request) -> web.WebSocketResponse:
        route_key = request.match_info["route_key"]
        ws = web.WebSocketResponse(heartbeat=30.0, max_msg_size=64 * 1024)
        await ws.prepare(request)

        log.info("WebSocket connection established for route %s", route_key)
        self._websocket_connections[route_key] = ws

        session_id = self.session_manager.routes.get(RouteKey(route_key))
        session = None
        if session_id is not None:
            session = self.session_manager.get_session(session_id)
            if session is None or not session.is_running():
                self.session_manager.on_session_end(session_id)
                session_id = None
                session = None
            else:
                # Force terminal redraw on reconnect to avoid blank screen
                if hasattr(session, 'force_redraw'):
                    await session.force_redraw()
                if hasattr(session, 'send_bytes'):
                    await session.send_bytes(CLEAR_AND_REDRAW_SEQ.encode('utf-8'))


        session_created = session_id is not None

        if session_created and session is not None and hasattr(session, 'get_replay_buffer'):
            replay = await session.get_replay_buffer()
            if replay:
                await ws.send_bytes(replay)

        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    try:
                        envelope = json.loads(msg.data)
                        if not isinstance(envelope, list) or len(envelope) < 1:
                            continue
                        session_created = await self._dispatch_ws_message(
                            envelope, route_key, ws, session_created
                        )
                    except json.JSONDecodeError as e:
                        log.warning("Invalid JSON in WebSocket message: %s", e)
                    except (TypeError, KeyError, ValueError) as e:
                        log.warning("Malformed WebSocket message: %s", e)
                    except OSError as e:
                        log.error("I/O error processing WebSocket message: %s", e)
                elif msg.type == WSMsgType.ERROR:
                    log.error("WebSocket connection error for route %s", route_key)
                    break
        finally:
            log.info("WebSocket connection closed for route %s", route_key)
            self._websocket_connections.pop(route_key, None)

        return ws

    def _select_app_for_route(self, route_key: str):
        """Pick the app matching the route key, or fall back to default."""
        app = self.session_manager.apps_by_slug.get(route_key)
        return app or self.session_manager.get_default_app()

    async def _create_terminal_session(self, route_key: str, width: int, height: int) -> None:
        available_app = self._select_app_for_route(route_key)
        if available_app is None:
            log.error("No app available for route %s", route_key)
            ws = self._websocket_connections.get(route_key)
            if ws:
                await ws.send_json(["error", "No app configured"])
            return

        session_id = SessionID(generate())
        log.info(
            "Creating %s session %s for route %s (%sx%s)",
            "terminal" if available_app.terminal else "app",
            session_id,
            route_key,
            width,
            height,
        )

        session_process = await self.session_manager.new_session(
            available_app.slug,
            session_id,
            RouteKey(route_key),
            size=(width, height),
        )

        if session_process is None:
            log.error("Failed to create session for route %s", route_key)
            ws = self._websocket_connections.get(route_key)
            if ws:
                await ws.send_json(["error", "Failed to create session"])
            return

        connector = LocalClientConnector(self, session_id, RouteKey(route_key))
        await session_process.start(connector)

    async def _handle_screenshot(self, request: web.Request) -> web.Response:
        route_key = request.query.get("route_key")
        if route_key is None:
            running = self.session_manager.get_first_running_session()
            if running:
                route_key = str(running[0])

        if route_key is None:
            raise web.HTTPNotFound(text="No running session")

        session_process = self.session_manager.get_session_by_route_key(RouteKey(route_key))
        if session_process is None and route_key in self.session_manager.apps_by_slug:
            # Create session with default dimensions
            await self._create_terminal_session(
                route_key,
                width=DEFAULT_TERMINAL_SIZE[0],
                height=DEFAULT_TERMINAL_SIZE[1],
            )
            session_process = self.session_manager.get_session_by_route_key(RouteKey(route_key))
            # Give the session a moment to start and produce initial output
            if session_process is not None:
                await asyncio.sleep(0.5)

        if session_process is None or not hasattr(session_process, "get_screen_state"):
            raise web.HTTPNotFound(text="Session not found")

        # Get the actual screen state from the terminal session's pyte screen
        # Use a lightweight dirty check first to avoid clearing dirty flags unnecessarily.
        has_changes = await session_process.get_screen_has_changes()  # type: ignore[union-attr]
        cached = self._screenshot_cache.get(route_key)
        if not has_changes and cached is not None:
            cached_response = self._get_cached_screenshot_response(request, route_key)
            if cached_response is not None:
                return cached_response

        screen_width, screen_height, screen_buffer, _ = await session_process.get_screen_state()  # type: ignore[union-attr]

        now = asyncio.get_event_loop().time()
        ttl = self._get_screenshot_cache_ttl(route_key, now)

        # Also check time-based cache for recently rendered screenshots
        if cached is not None and (now - cached[0]) < ttl:
            cached_response = self._get_cached_screenshot_response(request, route_key)
            if cached_response is not None:
                return cached_response

        lock = self._screenshot_locks.get(route_key)
        if lock is None:
            lock = asyncio.Lock()
            self._screenshot_locks[route_key] = lock

        async with lock:
            # Another request may have refreshed the cache while we waited.
            ttl = self._get_screenshot_cache_ttl(route_key, now)
            cached = self._screenshot_cache.get(route_key)
            if cached is not None and (now - cached[0]) < ttl:
                cached_response = self._get_cached_screenshot_response(request, route_key)
                if cached_response is not None:
                    return cached_response

            def _render_svg() -> str:
                # Use custom SVG exporter - simpler and more reliable than Rich
                return render_terminal_svg(
                    screen_buffer,
                    width=screen_width,
                    height=screen_height,
                    title="textual-webterm",
                )

            svg = await asyncio.to_thread(_render_svg)
            etag = hashlib.sha1(svg.encode("utf-8"), usedforsecurity=False).hexdigest()
            self._screenshot_cache[route_key] = (asyncio.get_event_loop().time(), svg)
            self._screenshot_cache_etag[route_key] = etag
            headers = {"Cache-Control": "no-cache", "ETag": etag}
            return web.Response(text=svg, content_type="image/svg+xml", headers=headers)

    async def _handle_cpu_sparkline(self, request: web.Request) -> web.Response:
        """Return CPU sparkline SVG for a container."""
        container = request.query.get("container", "")
        if not container:
            raise web.HTTPBadRequest(text="Missing container parameter")

        # Get dimensions from query params
        try:
            width = int(request.query.get("width", "100"))
        except ValueError:
            width = 100
        width = max(50, min(300, width))

        try:
            height = int(request.query.get("height", "20"))
        except ValueError:
            height = 20
        height = max(10, min(100, height))

        # Get CPU history - map slug to service name if needed
        values: list[float] = []
        if self._docker_stats:
            # Container param is slug, but stats are stored by service name
            service_name = self._slug_to_service.get(container, container)
            values = self._docker_stats.get_cpu_history(service_name)

        svg = render_sparkline_svg(values, width=width, height=height)
        headers = {"Cache-Control": "no-cache, max-age=0"}
        return web.Response(text=svg, content_type="image/svg+xml", headers=headers)

    async def _handle_sse(self, request: web.Request) -> web.StreamResponse:
        """Server-Sent Events endpoint for activity notifications."""
        response = web.StreamResponse(
            status=200,
            reason="OK",
            headers={
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )
        await response.prepare(request)

        # Create queue for this subscriber
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
        self._sse_subscribers.append(queue)

        try:
            while True:
                try:
                    # Wait for activity with timeout for keepalive
                    route_key = await asyncio.wait_for(queue.get(), timeout=30.0)
                    # Send activity event
                    await response.write(f"event: activity\ndata: {route_key}\n\n".encode())
                except asyncio.TimeoutError:
                    # Send keepalive comment
                    await response.write(b": keepalive\n\n")
                except (ConnectionResetError, ConnectionAbortedError, aiohttp.ClientConnectionError):
                    break
        finally:
            self._sse_subscribers.remove(queue)

        return response

    async def _handle_health_check(self, _request: web.Request) -> web.Response:
        return web.Response(text="Local server is running")

    def _get_ws_url_from_request(self, request: web.Request, route_key: str) -> str:
        """Build WebSocket URL honoring reverse proxies and port mapping."""
        # Extract forwarded headers (take first value if comma-separated)
        def first_header(name: str) -> str:
            return request.headers.get(name, "").split(",")[0].strip().lower()

        forwarded_proto = first_header("X-Forwarded-Proto")
        forwarded_host = first_header("X-Forwarded-Host")
        forwarded_port = first_header("X-Forwarded-Port")

        # Determine WebSocket protocol
        if forwarded_proto in ("https", "wss"):
            ws_proto = "wss"
        elif forwarded_proto in ("http", "ws"):
            ws_proto = "ws"
        else:
            ws_proto = "wss" if request.secure else "ws"

        # Determine host and port (priority: forwarded > Host header > server config)
        ws_host, ws_port = "", ""
        for candidate in (forwarded_host, request.headers.get("Host", "")):
            if candidate:
                ws_host, _, ws_port = candidate.rpartition(":")
                if not ws_host:  # No colon found, entire string is host
                    ws_host, ws_port = candidate, ""
                break

        if not ws_host:
            ws_host = "localhost" if self.host == "0.0.0.0" else self.host
            ws_port = str(self.port)

        ws_port = ws_port or forwarded_port

        # Include port in URL only for non-standard ports
        if ws_port and ws_port not in ("80", "443"):
            return f"{ws_proto}://{ws_host}:{ws_port}/ws/{route_key}"
        if not ws_port and self.port not in (80, 443):
            return f"{ws_proto}://{ws_host}:{self.port}/ws/{route_key}"
        return f"{ws_proto}://{ws_host}/ws/{route_key}"

    async def _handle_root(self, request: web.Request) -> web.Response:
        route_key_param = request.query.get("route_key")

        if self._landing_apps and not route_key_param:
            tiles = [
                {"slug": app.slug, "name": app.name, "command": app.command}
                for app in self._landing_apps
            ]
            tiles_json = json.dumps(tiles)
            compose_mode_js = "true" if self._compose_mode else "false"
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>Session Dashboard</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 16px; background: #0f172a; color: #e2e8f0; }}
        h1 {{ margin-bottom: 8px; }}
        .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }}
        .tile {{ background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.4); }}
        .tile-header {{ padding: 10px 12px; font-weight: bold; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }}
        .tile-title {{ display: flex; align-items: center; gap: 8px; }}
        .sparkline {{ opacity: 0.9; }}
        .tile-body {{ padding: 0; }}
        .thumb {{ width: 100%; height: 180px; object-fit: contain; background: #0b1220; display: block; }}
        .meta {{ padding: 8px 12px; color: #94a3b8; font-size: 12px; }}
        a {{ color: inherit; text-decoration: none; }}
    </style>
</head>
<body>
    <h1>Sessions</h1>
    <div class=\"grid\" id=\"grid\"></div>
    <script>
        const tiles = {tiles_json};
        const composeMode = {compose_mode_js};
        function makeTile(tile) {{
            const card = document.createElement('div');
            card.className = 'tile';
            const header = document.createElement('div');
            header.className = 'tile-header';
            const titleSpan = document.createElement('div');
            titleSpan.className = 'tile-title';
            titleSpan.innerHTML = `<span>${{tile.name}}</span>`;
            header.appendChild(titleSpan);
            if (composeMode) {{
                const sparkline = document.createElement('img');
                sparkline.className = 'sparkline';
                sparkline.width = 80;
                sparkline.height = 16;
                sparkline.alt = 'CPU';
                header.appendChild(sparkline);
                card.sparkline = sparkline;
            }}
            const body = document.createElement('div');
            body.className = 'tile-body';
            const img = document.createElement('img');
            img.className = 'thumb';
            img.alt = tile.name;
            const meta = document.createElement('div');
            meta.className = 'meta';
            meta.innerText = tile.command;
            body.appendChild(img);
            card.appendChild(header);
            card.appendChild(body);
            card.appendChild(meta);
            card.onclick = () => {{
                // Use tile slug as window name to reuse the same tab for each tile
                window.open(`/?route_key=${{encodeURIComponent(tile.slug)}}`, `webterm-${{tile.slug}}`);
            }};
            card.img = img;
            return card;
        }}
        const grid = document.getElementById('grid');
        const cards = tiles.map(makeTile);
        const cardsBySlug = {{}};
        cards.forEach((c, i) => {{
            grid.appendChild(c);
            cardsBySlug[tiles[i].slug] = c;
        }});

        // Refresh a single tile's screenshot
        function refreshTile(slug) {{
            const card = cardsBySlug[slug];
            if (!card) return;
            card.img.src = `/screenshot.svg?route_key=${{encodeURIComponent(slug)}}&_t=${{Date.now()}}`;
        }}

        // Refresh all screenshots (initial load)
        function refreshAll() {{
            for (const tile of tiles) {{
                const card = cardsBySlug[tile.slug];
                card.img.src = `/screenshot.svg?route_key=${{encodeURIComponent(tile.slug)}}`;
            }}
        }}

        // Refresh sparklines periodically (CPU stats don't need SSE)
        function refreshSparklines() {{
            if (!composeMode) return;
            for (const tile of tiles) {{
                const card = cardsBySlug[tile.slug];
                if (card.sparkline) {{
                    card.sparkline.src = `/cpu-sparkline.svg?container=${{encodeURIComponent(tile.slug)}}&width=80&height=16&_t=${{Date.now()}}`;
                }}
            }}
        }}

        // SSE connection for real-time screenshot updates
        let eventSource = null;
        let sparklineTimer = null;
        // Debounce tracking per tile
        const pendingRefresh = {{}};
        const lastRefresh = {{}};
        const REFRESH_DEBOUNCE_MS = 500;  // Min 0.5s between refreshes per tile

        function scheduleRefreshTile(slug) {{
            const now = Date.now();
            const last = lastRefresh[slug] || 0;
            // If we refreshed recently, schedule for later
            if (now - last < REFRESH_DEBOUNCE_MS) {{
                if (!pendingRefresh[slug]) {{
                    pendingRefresh[slug] = setTimeout(() => {{
                        pendingRefresh[slug] = null;
                        refreshTile(slug);
                    }}, REFRESH_DEBOUNCE_MS - (now - last));
                }}
                return;
            }}
            refreshTile(slug);
            lastRefresh[slug] = now;
        }}

        function startSSE() {{
            if (eventSource) return;
            eventSource = new EventSource('/events');
            eventSource.addEventListener('activity', (e) => {{
                scheduleRefreshTile(e.data);
            }});
            eventSource.onerror = () => {{
                // Reconnect on error
                eventSource.close();
                eventSource = null;
                setTimeout(startSSE, 2000);
            }};
            // Initial load of all screenshots
            refreshAll();
            // Start sparkline polling (every 30s since it's 30min history)
            if (composeMode && !sparklineTimer) {{
                refreshSparklines();
                sparklineTimer = setInterval(refreshSparklines, 30000);
            }}
        }}

        function stopSSE() {{
            if (eventSource) {{
                eventSource.close();
                eventSource = null;
            }}
            if (sparklineTimer) {{
                clearInterval(sparklineTimer);
                sparklineTimer = null;
            }}
        }}

        document.addEventListener('visibilitychange', () => {{
            if (document.hidden) stopSSE();
            else startSSE();
        }});

        if (!document.hidden) startSSE();
    </script>
</body>
</html>"""
            return web.Response(text=html_content, content_type="text/html")

        available_app = None
        if route_key_param:
            available_app = self.session_manager.apps_by_slug.get(route_key_param)
        if available_app is None:
            available_app = self.session_manager.get_default_app()
        if available_app is None:
            html_content = """<!DOCTYPE html>
<html>
<head>
    <title>Textual Web Terminal Server</title>
</head>
<body>
    <h2>No Apps Available</h2>
    <p>No terminal or Textual applications are configured.</p>
</body>
</html>"""
            return web.Response(text=html_content, content_type="text/html")

        route_key: RouteKey | None = None
        if route_key_param:
            route_key = RouteKey(route_key_param)
        else:
            running = self.session_manager.get_first_running_session()
            if running:
                route_key = running[0]

        if route_key is None:
            route_key = RouteKey(generate().lower())

        ws_url = self._get_ws_url_from_request(request, route_key)
        page_title = available_app.name if available_app else "Textual Web Terminal"

        # Build data attributes for terminal configuration
        data_attrs = f'data-session-websocket-url="{ws_url}" data-font-size="{self.font_size}" data-scrollback="1000" data-theme="{self.theme}"'
        if self.font_family:
            # Escape quotes for HTML attribute
            escaped_font = self.font_family.replace('"', "&quot;")
            data_attrs += f' data-font-family="{escaped_font}"'

        # Get theme background color (fallback to black if unknown theme)
        theme_bg = THEME_BACKGROUNDS.get(self.theme.lower(), "#000000")

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>{page_title}</title>
    <link rel=\"stylesheet\" href=\"/static/monospace.css\">
    <style>
      html, body {{ width: 100%; height: 100%; }}
      body {{ background: {theme_bg}; margin: 0; padding: 0; overflow: hidden; }}
      .textual-terminal {{ width: 100%; height: 100%; display: block; overflow: hidden; }}
    </style>
</head>
<body>
    <div id=\"terminal\" class=\"textual-terminal\" {data_attrs}></div>
    <script type=\"module\" src=\"/static/js/terminal.js\"></script>
</body>
</html>"""
        return web.Response(text=html_content, content_type="text/html")

    async def handle_session_data(self, route_key: RouteKey, data: bytes) -> None:
        self.mark_route_activity(str(route_key))
        ws = self._websocket_connections.get(route_key)
        if ws is None:
            return
        await ws.send_bytes(data)

    async def handle_binary_message(self, route_key: RouteKey, payload: bytes) -> None:
        self.mark_route_activity(str(route_key))
        ws = self._websocket_connections.get(route_key)
        if ws is None:
            return
        await ws.send_bytes(payload)

    async def handle_session_close(self, session_id: SessionID, route_key: RouteKey) -> None:
        self.session_manager.on_session_end(session_id)
        ws = self._websocket_connections.get(route_key)
        if ws is not None:
            with contextlib.suppress(Exception):
                await ws.close()

    def force_exit(self) -> None:
        self.exit_event.set()

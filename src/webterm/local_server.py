"""Local server implementation for serving terminals over HTTP/WebSocket."""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import json
import logging
import re
import signal
import time
from pathlib import Path
from typing import TYPE_CHECKING

import aiohttp
from aiohttp import WSMsgType, web

from . import constants
from .docker_stats import DockerStatsCollector, render_sparkline_svg
from .docker_watcher import AUTO_COMMAND_SENTINEL
from .exit_poller import ExitPoller
from .identity import generate
from .poller import Poller
from .session import SessionConnector
from .session_manager import SessionManager
from .svg_exporter import render_terminal_svg
from .types import Meta, RouteKey, SessionID

# Pattern to filter terminal device attribute responses (DA1/DA2/DA3) from replay buffer.
# These responses can appear as visible text like "1;10;0c" if split across reads.
# Matches: \x1b[?...c (DA1), \x1b[>...c (DA2 from tmux), \x1b[=...c (DA3)
# See docker_exec_session.py and terminal_session.py for main filtering.
DA_RESPONSE_PATTERN = re.compile(rb"\x1b\[[?>=][\d;]*c")

if TYPE_CHECKING:
    from .config import Config

log = logging.getLogger("webterm")

DEFAULT_TERMINAL_SIZE = (132, 45)

SCREENSHOT_CACHE_SECONDS = 0.3
SCREENSHOT_MAX_CACHE_SECONDS = 20.0
WS_SEND_QUEUE_MAX = 256
WS_SEND_TIMEOUT = 2.0


WEBTERM_STATIC_PATH = Path(__file__).parent / "static"

# Theme background colors - must match terminal.ts THEMES
THEME_BACKGROUNDS: dict[str, str] = {
    "tango": "#000000",
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

# Theme palettes - must match terminal.ts THEMES
THEME_PALETTES: dict[str, dict[str, str]] = {
    "tango": {
        "background": "#000000",
        "foreground": "#d3d7cf",
        "black": "#2e3436",
        "red": "#cc0000",
        "green": "#4e9a06",
        "yellow": "#c4a000",
        "blue": "#3465a4",
        "magenta": "#75507b",
        "cyan": "#06989a",
        "white": "#d3d7cf",
        "brightblack": "#555753",
        "brightred": "#ef2929",
        "brightgreen": "#8ae234",
        "brightyellow": "#fce94f",
        "brightblue": "#729fcf",
        "brightmagenta": "#ad7fa8",
        "brightcyan": "#34e2e2",
        "brightwhite": "#eeeeec",
    },
    "xterm": {
        "background": "#000000",
        "foreground": "#e5e5e5",
        "black": "#000000",
        "red": "#cd0000",
        "green": "#00cd00",
        "yellow": "#cdcd00",
        "blue": "#0000cd",
        "magenta": "#cd00cd",
        "cyan": "#00cdcd",
        "white": "#e5e5e5",
        "brightblack": "#4d4d4d",
        "brightred": "#ff0000",
        "brightgreen": "#00ff00",
        "brightyellow": "#ffff00",
        "brightblue": "#0000ff",
        "brightmagenta": "#ff00ff",
        "brightcyan": "#00ffff",
        "brightwhite": "#ffffff",
    },
    "monokai": {
        "background": "#2d2a2e",
        "foreground": "#fcfcfa",
        "black": "#403e41",
        "red": "#ff6188",
        "green": "#a9dc76",
        "yellow": "#ffd866",
        "blue": "#fc9867",
        "magenta": "#ab9df2",
        "cyan": "#78dce8",
        "white": "#fcfcfa",
        "brightblack": "#727072",
        "brightred": "#ff6188",
        "brightgreen": "#a9dc76",
        "brightyellow": "#ffd866",
        "brightblue": "#fc9867",
        "brightmagenta": "#ab9df2",
        "brightcyan": "#78dce8",
        "brightwhite": "#fcfcfa",
    },
    "ristretto": {
        "background": "#2d2525",
        "foreground": "#fff1f3",
        "black": "#2c2525",
        "red": "#fd6883",
        "green": "#adda78",
        "yellow": "#f9cc6c",
        "blue": "#f38d70",
        "magenta": "#a8a9eb",
        "cyan": "#85dacc",
        "white": "#f9f8f5",
        "brightblack": "#655761",
        "brightred": "#fd6883",
        "brightgreen": "#adda78",
        "brightyellow": "#f9cc6c",
        "brightblue": "#f38d70",
        "brightmagenta": "#a8a9eb",
        "brightcyan": "#85dacc",
        "brightwhite": "#f9f8f5",
    },
    "dark": {
        "background": "#1e1e1e",
        "foreground": "#d4d4d4",
        "black": "#000000",
        "red": "#cd3131",
        "green": "#0dbc79",
        "yellow": "#e5e510",
        "blue": "#2472c8",
        "magenta": "#bc3fbc",
        "cyan": "#11a8cd",
        "white": "#e5e5e5",
        "brightblack": "#666666",
        "brightred": "#f14c4c",
        "brightgreen": "#23d18b",
        "brightyellow": "#f5f543",
        "brightblue": "#3b8eea",
        "brightmagenta": "#d670d6",
        "brightcyan": "#29b8db",
        "brightwhite": "#ffffff",
    },
    "light": {
        "background": "#ffffff",
        "foreground": "#383a42",
        "black": "#000000",
        "red": "#e45649",
        "green": "#50a14f",
        "yellow": "#c18401",
        "blue": "#4078f2",
        "magenta": "#a626a4",
        "cyan": "#0184bc",
        "white": "#a0a1a7",
        "brightblack": "#5c6370",
        "brightred": "#e06c75",
        "brightgreen": "#98c379",
        "brightyellow": "#d19a66",
        "brightblue": "#61afef",
        "brightmagenta": "#c678dd",
        "brightcyan": "#56b6c2",
        "brightwhite": "#ffffff",
    },
    "dracula": {
        "background": "#282a36",
        "foreground": "#f8f8f2",
        "black": "#21222c",
        "red": "#ff5555",
        "green": "#50fa7b",
        "yellow": "#f1fa8c",
        "blue": "#bd93f9",
        "magenta": "#ff79c6",
        "cyan": "#8be9fd",
        "white": "#f8f8f2",
        "brightblack": "#6272a4",
        "brightred": "#ff6e6e",
        "brightgreen": "#69ff94",
        "brightyellow": "#ffffa5",
        "brightblue": "#d6acff",
        "brightmagenta": "#ff92df",
        "brightcyan": "#a4ffff",
        "brightwhite": "#ffffff",
    },
    "catppuccin": {
        "background": "#1e1e2e",
        "foreground": "#cdd6f4",
        "black": "#45475a",
        "red": "#f38ba8",
        "green": "#a6e3a1",
        "yellow": "#f9e2af",
        "blue": "#89b4fa",
        "magenta": "#f5c2e7",
        "cyan": "#94e2d5",
        "white": "#bac2de",
        "brightblack": "#585b70",
        "brightred": "#f38ba8",
        "brightgreen": "#a6e3a1",
        "brightyellow": "#f9e2af",
        "brightblue": "#89b4fa",
        "brightmagenta": "#f5c2e7",
        "brightcyan": "#94e2d5",
        "brightwhite": "#a6adc8",
    },
    "nord": {
        "background": "#2e3440",
        "foreground": "#d8dee9",
        "black": "#3b4252",
        "red": "#bf616a",
        "green": "#a3be8c",
        "yellow": "#ebcb8b",
        "blue": "#81a1c1",
        "magenta": "#b48ead",
        "cyan": "#88c0d0",
        "white": "#e5e9f0",
        "brightblack": "#4c566a",
        "brightred": "#bf616a",
        "brightgreen": "#a3be8c",
        "brightyellow": "#ebcb8b",
        "brightblue": "#81a1c1",
        "brightmagenta": "#b48ead",
        "brightcyan": "#8fbcbb",
        "brightwhite": "#eceff4",
    },
    "gruvbox": {
        "background": "#282828",
        "foreground": "#ebdbb2",
        "black": "#282828",
        "red": "#cc241d",
        "green": "#98971a",
        "yellow": "#d79921",
        "blue": "#458588",
        "magenta": "#b16286",
        "cyan": "#689d6a",
        "white": "#a89984",
        "brightblack": "#928374",
        "brightred": "#fb4934",
        "brightgreen": "#b8bb26",
        "brightyellow": "#fabd2f",
        "brightblue": "#83a598",
        "brightmagenta": "#d3869b",
        "brightcyan": "#8ec07c",
        "brightwhite": "#ebdbb2",
    },
    "solarized": {
        "background": "#002b36",
        "foreground": "#839496",
        "black": "#073642",
        "red": "#dc322f",
        "green": "#859900",
        "yellow": "#b58900",
        "blue": "#268bd2",
        "magenta": "#d33682",
        "cyan": "#2aa198",
        "white": "#eee8d5",
        "brightblack": "#586e75",
        "brightred": "#cb4b16",
        "brightgreen": "#586e75",
        "brightyellow": "#657b83",
        "brightblue": "#839496",
        "brightmagenta": "#6c71c4",
        "brightcyan": "#93a1a1",
        "brightwhite": "#fdf6e3",
    },
    "tokyo": {
        "background": "#1a1b26",
        "foreground": "#a9b1d6",
        "black": "#15161e",
        "red": "#f7768e",
        "green": "#9ece6a",
        "yellow": "#e0af68",
        "blue": "#7aa2f7",
        "magenta": "#bb9af7",
        "cyan": "#7dcfff",
        "white": "#a9b1d6",
        "brightblack": "#414868",
        "brightred": "#f7768e",
        "brightgreen": "#9ece6a",
        "brightyellow": "#e0af68",
        "brightblue": "#7aa2f7",
        "brightmagenta": "#bb9af7",
        "brightcyan": "#7dcfff",
        "brightwhite": "#c0caf5",
    },
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


def _format_command_label(command: str) -> str:
    """Format command for display in UI, replacing sentinel with readable label."""
    if command == AUTO_COMMAND_SENTINEL:
        return ""
    return command


class LocalServer:
    def mark_route_activity(self, route_key: str) -> None:
        try:
            now = asyncio.get_running_loop().time()
        except RuntimeError:
            now = time.monotonic()
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

    """Manages local terminal sessions without Ganglion server."""

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
        docker_watch_mode: bool = False,
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
        self._ws_send_queues: dict[RouteKey, asyncio.Queue[bytes | None]] = {}
        self._ws_send_tasks: dict[RouteKey, asyncio.Task] = {}
        self._landing_apps = landing_apps or []
        self._compose_mode = compose_mode
        self._compose_project = compose_project
        self._docker_watch_mode = docker_watch_mode

        self._screenshot_cache: dict[str, tuple[float, str]] = {}
        self._screenshot_cache_etag: dict[str, str] = {}
        self._screenshot_locks: dict[str, asyncio.Lock] = {}
        self._route_last_activity: dict[str, float] = {}
        self._route_last_sse_notification: dict[str, float] = {}

        # SSE subscribers for activity notifications
        self._sse_subscribers: list[asyncio.Queue[str]] = []

        # Docker stats collector (only used in compose mode)
        self._docker_stats: DockerStatsCollector | None = None
        # Docker watcher (only used in docker watch mode)
        self._docker_watcher = None
        self._slug_to_service: dict[str, str] = {}

    @property
    def app_count(self) -> int:
        return len(self.session_manager.apps)

    def add_app(self, name: str, command: str, slug: str = "", theme: str | None = None) -> None:
        slug = slug or generate().lower()
        self.session_manager.add_app(name, command, slug=slug, theme=theme)

    def add_terminal(
        self, name: str, command: str, slug: str = "", theme: str | None = None
    ) -> None:
        if constants.WINDOWS:
            log.warning("Sorry, webterm does not currently support terminals on Windows")
            return
        slug = slug or generate().lower()
        self.session_manager.add_app(name, command, slug=slug, terminal=True, theme=theme)

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
            web.get("/tiles", self._handle_tiles),
            web.get("/", self._handle_root),
        ]

        if WEBTERM_STATIC_PATH.exists():
            routes.append(web.static("/static", WEBTERM_STATIC_PATH))
            log.info("Static assets served from: %s", WEBTERM_STATIC_PATH)
        else:
            log.error(
                "Static assets not found at %s - terminal UI will not work", WEBTERM_STATIC_PATH
            )

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

            # Start Docker stats collector in compose mode or docker watch mode
            if (self._compose_mode and self._landing_apps) or self._docker_watch_mode:
                self._docker_stats = DockerStatsCollector(compose_project=self._compose_project)
                if self._docker_stats.available:
                    # Pass service names (not slugs) for Docker matching
                    service_names = [
                        app.name
                        for app in (
                            self._landing_apps if self._compose_mode else self.session_manager.apps
                        )
                    ]
                    self._docker_stats.start(service_names)
                    # Create slug->name mapping for lookups
                    self._slug_to_service = {
                        app.slug: app.name
                        for app in (
                            self._landing_apps if self._compose_mode else self.session_manager.apps
                        )
                    }
                    log.info("Slug to service mapping: %s", self._slug_to_service)
                    stack.push_async_callback(self._docker_stats.stop)

            # Start Docker watcher in docker watch mode
            if self._docker_watch_mode:
                from .docker_watcher import DockerWatcher

                self._docker_watcher = DockerWatcher(
                    self.session_manager,
                    on_container_added=self._on_docker_container_added,
                    on_container_removed=self._on_docker_container_removed,
                )
                await self._docker_watcher.start()
                stack.push_async_callback(self._docker_watcher.stop)

            site = web.TCPSite(runner, self.host, self.port)
            await site.start()

            log.info("Local server started on %s:%s", self.host, self.port)
            if self._docker_watch_mode:
                log.info("Docker watch mode: sessions added dynamically from labeled containers")
            else:
                log.info(
                    "Available apps: %s", ", ".join(app.name for app in self.session_manager.apps)
                )

            await self.exit_event.wait()

    def _on_docker_container_added(self, slug: str, name: str, command: str) -> None:
        """Callback when a Docker container is added."""
        log.info("Container added to dashboard: %s -> %s", name, slug)
        # Update slug-to-service mapping for sparklines
        self._slug_to_service[slug] = name
        # Register new service with stats collector so it starts polling
        if self._docker_stats:
            self._docker_stats.add_service(name)
            log.debug("Added sparkline mapping: %s -> %s", slug, name)
        # Notify SSE subscribers about dashboard change
        self._notify_activity("__dashboard__")

    def _on_docker_container_removed(self, slug: str) -> None:
        """Callback when a Docker container is removed."""
        log.info("Container removed from dashboard: %s", slug)
        # Remove from stats collector and slug mapping
        service_name = self._slug_to_service.pop(slug, None)
        if self._docker_stats and service_name:
            self._docker_stats.remove_service(service_name)
        # Invalidate any cached screenshots
        self._screenshot_cache.pop(slug, None)
        self._screenshot_cache_etag.pop(slug, None)
        # Notify SSE subscribers about dashboard change
        self._notify_activity("__dashboard__")

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
        queue: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=WS_SEND_QUEUE_MAX)
        self._ws_send_queues[route_key] = queue
        self._ws_send_tasks[route_key] = asyncio.create_task(self._ws_sender(route_key, ws, queue))

        session_id = self.session_manager.routes.get(RouteKey(route_key))
        session = None
        if session_id is not None:
            session = self.session_manager.get_session(session_id)
            if session is None or not session.is_running():
                self.session_manager.on_session_end(session_id)
                session_id = None
                session = None

        session_created = session_id is not None

        if session_created and session is not None and hasattr(session, "get_replay_buffer"):
            replay = await session.get_replay_buffer()
            if replay:
                # Filter out any DA1/DA2 responses that may have been captured
                # in the replay buffer before filtering was added to session classes
                replay = DA_RESPONSE_PATTERN.sub(b"", replay)
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
            await self._stop_ws_sender(route_key)

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

        if session_process is None or not hasattr(session_process, "get_screen_snapshot"):
            raise web.HTTPNotFound(text="Session not found")

        # Get the actual screen state from the terminal session's pyte screen
        cached = self._screenshot_cache.get(route_key)

        lock = self._screenshot_locks.get(route_key)
        if lock is None:
            lock = asyncio.Lock()
            self._screenshot_locks[route_key] = lock

        async with lock:
            now = asyncio.get_event_loop().time()
            ttl = self._get_screenshot_cache_ttl(route_key, now)
            cached = self._screenshot_cache.get(route_key)
            if cached is not None and (now - cached[0]) < ttl:
                cached_response = self._get_cached_screenshot_response(request, route_key)
                if cached_response is not None:
                    return cached_response

            # Use non-mutating snapshot method to avoid affecting terminal state
            (
                screen_width,
                screen_height,
                screen_buffer,
                has_changes,
            ) = await session_process.get_screen_snapshot()  # type: ignore[union-attr]

            if not has_changes and cached is not None:
                cached_response = self._get_cached_screenshot_response(request, route_key)
                if cached_response is not None:
                    return cached_response

            app = self.session_manager.apps_by_slug.get(route_key)
            theme_name = app.theme.lower() if app is not None and app.theme else self.theme.lower()

            palette = THEME_PALETTES.get(theme_name)
            if palette is None:
                palette = THEME_PALETTES.get("xterm")

            background = palette.get("background", THEME_BACKGROUNDS.get("xterm", "#000000"))
            foreground = palette.get("foreground", "#e5e5e5")

            def _render_svg() -> str:
                # Use custom SVG exporter - simpler and more reliable than Rich
                return render_terminal_svg(
                    screen_buffer,
                    width=screen_width,
                    height=screen_height,
                    title="webterm",
                    background=background,
                    foreground=foreground,
                    palette=palette,
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
                except (
                    ConnectionResetError,
                    ConnectionAbortedError,
                    aiohttp.ClientConnectionError,
                ):
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

    async def _handle_tiles(self, request: web.Request) -> web.Response:
        """Return current tiles as JSON (for dynamic dashboard updates)."""
        if self._docker_watch_mode:
            apps_for_dashboard = self.session_manager.apps
        else:
            apps_for_dashboard = self._landing_apps

        tiles = [
            {"slug": app.slug, "name": app.name, "command": _format_command_label(app.command)}
            for app in apps_for_dashboard
        ]
        return web.json_response(tiles)

    async def _handle_root(self, request: web.Request) -> web.Response:
        route_key_param = request.query.get("route_key")

        # Show dashboard if we have landing apps, are in docker watch mode, or explicitly have apps
        show_dashboard = (self._landing_apps or self._docker_watch_mode) and not route_key_param

        if show_dashboard:
            # In docker watch mode, use session_manager.apps (dynamically updated)
            # Otherwise use landing_apps
            if self._docker_watch_mode:
                apps_for_dashboard = self.session_manager.apps
            else:
                apps_for_dashboard = self._landing_apps

            tiles = [
                {"slug": app.slug, "name": app.name, "command": _format_command_label(app.command)}
                for app in apps_for_dashboard
            ]
            tiles_json = json.dumps(tiles)
            # Show CPU sparklines in both compose mode and docker watch mode
            compose_mode_js = "true" if (self._compose_mode or self._docker_watch_mode) else "false"
            docker_watch_js = "true" if self._docker_watch_mode else "false"
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>Session Dashboard</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 16px; background: #0f172a; color: #e2e8f0; }}
        h1 {{ margin-bottom: 8px; }}
        .subtitle {{ color: #64748b; font-size: 14px; margin-bottom: 16px; }}
        .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }}
        .tile {{ background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.4); cursor: pointer; transition: border-color 0.15s; }}
        .tile:hover {{ border-color: #475569; }}
        .tile.selected {{ border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.3); }}
        .tile-header {{ padding: 10px 12px; font-weight: bold; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }}
        .tile-title {{ display: flex; align-items: center; gap: 8px; }}
        .sparkline {{ opacity: 0.9; }}
        .tile-body {{ padding: 0; }}
        .thumb {{ width: 100%; height: 180px; object-fit: contain; background: #0b1220; display: block; }}
        .meta {{ padding: 8px 12px; color: #94a3b8; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
        a {{ color: inherit; text-decoration: none; }}
        .empty {{ color: #64748b; text-align: center; padding: 40px; }}
        /* Floating search results panel */
        .floating-results {{ position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; max-width: 90vw; max-height: 70vh; overflow-y: auto; background: #1e293b; border: 1px solid #475569; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); padding: 16px; z-index: 1000; }}
        .floating-results.hidden {{ display: none; }}
        .floating-results .search-header {{ margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 8px; }}
        .floating-results .search-query {{ font-size: 18px; font-weight: bold; color: #3b82f6; }}
        .floating-results .result-item {{ display: flex; align-items: center; gap: 12px; padding: 12px; margin: 6px 0; border: 1px solid #334155; border-radius: 6px; cursor: pointer; transition: all 0.15s; }}
        .floating-results .result-item:hover, .floating-results .result-item.active {{ background: #334155; border-color: #3b82f6; }}
        .floating-results .result-thumb {{ width: 96px; height: 72px; flex: 0 0 auto; border-radius: 4px; border: 1px solid #334155; background: #0b1220; object-fit: contain; }}
        .floating-results .result-content {{ display: flex; flex-direction: column; gap: 2px; }}
        .floating-results .result-title {{ font-weight: bold; margin-bottom: 4px; }}
        .floating-results .result-meta {{ font-size: 12px; color: #94a3b8; }}
        .floating-results .no-results {{ color: #64748b; text-align: center; padding: 20px; }}
        /* Keyboard indicator */
        .key-indicator {{ position: fixed; bottom: 16px; left: 16px; display: flex; gap: 4px; z-index: 1000; }}
        .key-box {{ display: inline-flex; align-items: center; justify-content: center; background: #334155; color: #e2e8f0; font-size: 12px; font-weight: bold; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); opacity: 1; transition: opacity 0.3s; }}
        .key-box.square {{ width: 28px; height: 28px; }}
        .key-box.rectangle {{ padding: 4px 8px; }}
        .key-box.fade-out {{ opacity: 0; }}
        /* Help hint */
        .help-hint {{ position: fixed; bottom: 16px; right: 16px; color: #64748b; font-size: 12px; }}
    </style>
</head>
<body>
    <h1>Sessions</h1>
    <div class="subtitle" id="subtitle"></div>
    <div class=\"grid\" id=\"grid\"></div>
    <div class=\"floating-results hidden\" id=\"floating-results\"></div>
    <div class=\"key-indicator\" id=\"key-indicator\"></div>
    <div class=\"help-hint\">Type to search \u2022 \u2191\u2193 to navigate \u2022 Enter to open \u2022 Esc to clear</div>
    <script>
        let tiles = {tiles_json};
        const composeMode = {compose_mode_js};
        const dockerWatchMode = {docker_watch_js};
        let cardsBySlug = {{}};

        // Typeahead search state
        let searchQuery = '';
        let activeResultIndex = -1;
        let filteredResults = [];
        const floatingResultsEl = document.getElementById('floating-results');
        const keyIndicatorEl = document.getElementById('key-indicator');
        const thumbnailCache = {{}};
        const THUMBNAIL_TTL_MS = 5000;

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
            meta.title = tile.command;
            body.appendChild(img);
            card.appendChild(header);
            card.appendChild(body);
            card.appendChild(meta);
            card.onclick = () => {{
                openTile(tile);
            }};
            card.img = img;
            return card;
        }}

        const grid = document.getElementById('grid');
        const subtitle = document.getElementById('subtitle');

        function renderTiles() {{
            grid.innerHTML = '';
            cardsBySlug = {{}};
            if (tiles.length === 0) {{
                grid.innerHTML = '<div class="empty">No containers found. Start containers with the webterm-command label.</div>';
                subtitle.textContent = dockerWatchMode ? 'Watching for containers with webterm-command label...' : '';
                return;
            }}
            subtitle.textContent = dockerWatchMode ? `${{tiles.length}} container(s) found` : '';
            tiles.forEach(tile => {{
                const card = makeTile(tile);
                grid.appendChild(card);
                cardsBySlug[tile.slug] = card;
            }});
            refreshAll();
        }}

        // Initial render
        renderTiles();

        // Typeahead search functions
        function openTile(tile) {{
            if (!tile || !tile.slug) return;
            const url = `/?route_key=${{encodeURIComponent(tile.slug)}}`;
            const target = `webterm-${{tile.slug}}`;
            let win = window.open(url, target);
            if (!win) {{
                window.location.href = url;
                return;
            }}
            if (win.closed) {{
                win = window.open(url, target);
            }}
            if (win) {{
                if (typeof win.focus === 'function') {{
                    win.focus();
                }}
                win.location.href = url;
            }} else {{
                window.location.href = url;
            }}
            // Dismiss typeahead after launching from floating results.
            searchQuery = '';
            activeResultIndex = -1;
            renderFloatingResults();
        }}

        function normalizeText(value) {{
            return (value || '').toString().toLowerCase();
        }}

        function getTileTitle(tile) {{
            return tile.name || tile.slug || 'Unknown';
        }}

        function getTileCommand(tile) {{
            return tile.command || '';
        }}

        function getThumbnailSrc(tile) {{
            const slug = tile.slug || '';
            if (!slug) return '';
            const now = Date.now();
            const existing = thumbnailCache[slug];
            if (!existing || (now - existing.updatedAt) > THUMBNAIL_TTL_MS) {{
                const src = `/screenshot.svg?route_key=${{encodeURIComponent(slug)}}&_t=${{now}}`;
                thumbnailCache[slug] = {{ src, updatedAt: now }};
                return src;
            }}
            return existing.src;
        }}

        function renderFloatingResults() {{
            floatingResultsEl.innerHTML = '';
            if (searchQuery === '') {{
                floatingResultsEl.classList.add('hidden');
                activeResultIndex = -1;
                filteredResults = [];
                // Clear tile selection
                Object.values(cardsBySlug).forEach(c => c.classList.remove('selected'));
                return;
            }}

            const query = normalizeText(searchQuery);
            filteredResults = tiles.filter(t => {{
                if (!t) return false;
                const name = normalizeText(t.name);
                const command = normalizeText(t.command);
                const slug = normalizeText(t.slug);
                return name.includes(query) || command.includes(query) || slug.includes(query);
            }});

            // Build header
            const header = document.createElement('div');
            header.className = 'search-header';
            header.innerHTML = `<span>Search:</span><span class="search-query">${{searchQuery}}</span>`;
            floatingResultsEl.appendChild(header);

            if (filteredResults.length === 0) {{
                const noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.textContent = 'No matches found';
                floatingResultsEl.appendChild(noResults);
            }} else {{
                // Auto-select first (or only) result
                if (activeResultIndex < 0 || activeResultIndex >= filteredResults.length) {{
                    activeResultIndex = 0;
                }}
                filteredResults.forEach((tile, index) => {{
                    const item = document.createElement('div');
                    item.className = 'result-item' + (index === activeResultIndex ? ' active' : '');
                    const thumb = document.createElement('img');
                    thumb.className = 'result-thumb';
                    const title = getTileTitle(tile);
                    const command = getTileCommand(tile);
                    const thumbSrc = getThumbnailSrc(tile);
                    thumb.alt = title;
                    if (thumbSrc) {{
                        thumb.src = thumbSrc;
                    }} else {{
                        thumb.style.display = 'none';
                    }}
                    const content = document.createElement('div');
                    content.className = 'result-content';
                    content.innerHTML = `<div class="result-title">${{title}}</div><div class="result-meta">${{command}}</div>`;
                    item.appendChild(thumb);
                    item.appendChild(content);
                    item.onclick = () => openTile(tile);
                    floatingResultsEl.appendChild(item);
                }});
            }}
            floatingResultsEl.classList.remove('hidden');
            updateTileSelection();
        }}

        function updateTileSelection() {{
            // Clear all selections
            Object.values(cardsBySlug).forEach(c => c.classList.remove('selected'));
            // Highlight selected tile in main grid
            if (filteredResults.length > 0 && activeResultIndex >= 0) {{
                const selected = filteredResults[activeResultIndex];
                if (selected && selected.slug) {{
                    const card = cardsBySlug[selected.slug];
                    if (card) card.classList.add('selected');
                }}
            }}
        }}

        function showKeyIndicator(key) {{
            const arrowKeyMap = {{ ArrowLeft: '\u2190', ArrowRight: '\u2192', ArrowUp: '\u2191', ArrowDown: '\u2193' }};
            const keyDisplay = arrowKeyMap[key] || key;
            const keyBox = document.createElement('div');
            keyBox.className = 'key-box ' + (key.length > 1 ? 'rectangle' : 'square');
            keyBox.textContent = keyDisplay;
            keyIndicatorEl.appendChild(keyBox);
            setTimeout(() => {{
                keyBox.classList.add('fade-out');
                setTimeout(() => keyBox.remove(), 300);
            }}, 1500);
        }}

        function handleKeydown(event) {{
            // Don't interfere with input fields
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

            showKeyIndicator(event.key);

            if (event.key === 'Escape') {{
                searchQuery = '';
                activeResultIndex = -1;
                renderFloatingResults();
                return;
            }}

            if (event.key === 'Backspace') {{
                searchQuery = searchQuery.slice(0, -1);
                renderFloatingResults();
                return;
            }}

            if (event.key === 'ArrowUp') {{
                event.preventDefault();
                if (filteredResults.length > 0) {{
                    activeResultIndex = (activeResultIndex - 1 + filteredResults.length) % filteredResults.length;
                    renderFloatingResults();
                }}
                return;
            }}

            if (event.key === 'ArrowDown') {{
                event.preventDefault();
                if (filteredResults.length > 0) {{
                    activeResultIndex = (activeResultIndex + 1) % filteredResults.length;
                    renderFloatingResults();
                }}
                return;
            }}

            if (event.key === 'Enter') {{
                if (filteredResults.length > 0 && activeResultIndex >= 0) {{
                    openTile(filteredResults[activeResultIndex]);
                }} else if (filteredResults.length === 1) {{
                    openTile(filteredResults[0]);
                }}
                return;
            }}

            // Regular character input
            if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {{
                searchQuery += event.key.toLowerCase();
                renderFloatingResults();
            }}
        }}

        document.addEventListener('keydown', handleKeydown);

        // Ensure dashboard regains focus when the tab becomes active
        window.addEventListener('focus', () => {{
            window.focus();
        }});
        document.addEventListener('visibilitychange', () => {{
            if (!document.hidden) {{
                window.focus();
            }}
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
                if (card) card.img.src = `/screenshot.svg?route_key=${{encodeURIComponent(tile.slug)}}`;
            }}
        }}

        // Fetch updated tiles list from server
        async function refreshTilesList() {{
            try {{
                const resp = await fetch('/tiles');
                const newTiles = await resp.json();
                // Check if tiles changed
                const oldSlugs = tiles.map(t => t.slug).sort().join(',');
                const newSlugs = newTiles.map(t => t.slug).sort().join(',');
                if (oldSlugs !== newSlugs) {{
                    tiles = newTiles;
                    renderTiles();
                }}
            }} catch (e) {{
                console.error('Failed to refresh tiles:', e);
            }}
        }}

        // Refresh sparklines periodically (CPU stats don't need SSE)
        function refreshSparklines() {{
            if (!composeMode) return;
            for (const tile of tiles) {{
                const card = cardsBySlug[tile.slug];
                if (card && card.sparkline) {{
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
                const slug = e.data;
                // Special event for dashboard changes (container added/removed)
                if (slug === '__dashboard__') {{
                    refreshTilesList();
                }} else {{
                    scheduleRefreshTile(slug);
                }}
            }});
            eventSource.onerror = () => {{
                // Reconnect on error
                eventSource.close();
                eventSource = null;
                setTimeout(startSSE, 2000);
            }};
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
    <title>Webterm Server</title>
</head>
<body>
    <h2>No Apps Available</h2>
    <p>No terminal applications are configured.</p>
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
        page_title = available_app.name if available_app else "Webterm"

        # Build data attributes for terminal configuration
        theme = available_app.theme or self.theme
        data_attrs = (
            f'data-session-websocket-url="{ws_url}" data-font-size="{self.font_size}" '
            f'data-scrollback="1000" data-theme="{theme}"'
        )
        font_family = self.font_family or "var(--webterm-mono)"
        # Escape quotes for HTML attribute
        escaped_font = font_family.replace('"', "&quot;")
        data_attrs += f' data-font-family="{escaped_font}"'

        # Get theme background color (fallback to black if unknown theme)
        theme_bg = THEME_BACKGROUNDS.get(theme.lower(), "#000000")

        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>{page_title}</title>
    <link rel=\"stylesheet\" href=\"/static/monospace.css\">
    <style>
      html, body {{ width: 100%; height: 100%; }}
      body {{ background: {theme_bg}; margin: 0; padding: 0; overflow: hidden; font-family: var(--webterm-mono); }}
      .webterm-terminal {{ width: 100%; height: 100%; display: block; overflow: hidden; }}
    </style>
</head>
<body>
    <div id=\"terminal\" class=\"webterm-terminal\" {data_attrs}></div>
    <script type=\"module\" src=\"/static/js/terminal.js\"></script>
</body>
</html>"""
        return web.Response(text=html_content, content_type="text/html")

    async def handle_session_data(self, route_key: RouteKey, data: bytes) -> None:
        self.mark_route_activity(str(route_key))
        self._enqueue_ws_data(route_key, data)

    async def handle_binary_message(self, route_key: RouteKey, payload: bytes) -> None:
        self.mark_route_activity(str(route_key))
        self._enqueue_ws_data(route_key, payload)

    async def handle_session_close(self, session_id: SessionID, route_key: RouteKey) -> None:
        self.session_manager.on_session_end(session_id)
        await self._stop_ws_sender(route_key)
        ws = self._websocket_connections.get(route_key)
        if ws is not None:
            with contextlib.suppress(Exception):
                await ws.close()

    def force_exit(self) -> None:
        self.exit_event.set()

    def _enqueue_ws_data(self, route_key: RouteKey, data: bytes) -> None:
        queue = self._ws_send_queues.get(route_key)
        if queue is None:
            return
        try:
            queue.put_nowait(data)
        except asyncio.QueueFull:
            # Drop oldest data to avoid blocking terminal sessions on slow clients.
            with contextlib.suppress(asyncio.QueueEmpty):
                queue.get_nowait()
            try:
                queue.put_nowait(data)
            except asyncio.QueueFull:
                log.warning("WebSocket send queue full for route %s; dropping output", route_key)

    async def _ws_sender(
        self,
        route_key: RouteKey,
        ws: web.WebSocketResponse,
        queue: asyncio.Queue[bytes | None],
    ) -> None:
        try:
            while True:
                data = await queue.get()
                if data is None:
                    break
                try:
                    await asyncio.wait_for(ws.send_bytes(data), timeout=WS_SEND_TIMEOUT)
                except asyncio.TimeoutError:
                    log.warning("WebSocket send timeout for route %s; closing", route_key)
                    break
                except (
                    ConnectionResetError,
                    ConnectionAbortedError,
                    aiohttp.ClientConnectionError,
                ) as exc:
                    log.warning("WebSocket send failed for route %s: %s", route_key, exc)
                    break
        finally:
            if not ws.closed:
                with contextlib.suppress(Exception):
                    await ws.close()

    async def _stop_ws_sender(self, route_key: RouteKey) -> None:
        queue = self._ws_send_queues.pop(route_key, None)
        if queue is not None:
            with contextlib.suppress(asyncio.QueueFull):
                queue.put_nowait(None)
        task = self._ws_send_tasks.pop(route_key, None)
        if task is not None:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

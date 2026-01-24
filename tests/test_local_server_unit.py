"""Tests for local_server module - unit tests for helper functions."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from aiohttp import web

from textual_webterm.config import App, Config
from textual_webterm.local_server import (
    LocalClientConnector,
    LocalServer,
    _rewrite_svg_fonts,
)


class TestGetStaticPath:
    """Tests for static path function."""

    def test_static_path_exists(self):
        """Test that static path exists."""
        from textual_webterm.local_server import _get_static_path

        path = _get_static_path()
        assert path is not None and path.exists()

    def test_static_path_has_js(self):
        """Test that static path has JS directory."""
        from textual_webterm.local_server import _get_static_path

        path = _get_static_path()
        assert path is not None
        assert (path / "js").exists()

    def test_static_path_has_css(self):
        """Test that static path has CSS directory."""
        from textual_webterm.local_server import _get_static_path

        path = _get_static_path()
        assert path is not None
        assert (path / "css").exists()


class TestLocalServer:
    """Tests for LocalServer class."""

    @pytest.fixture
    def config(self):
        """Create a test config."""
        return Config(
            apps=[
                App(name="Test", slug="test", path="./", command="echo test", terminal=True),
            ],
        )

    @pytest.fixture
    def server(self, config, tmp_path):
        """Create a test server."""
        config_file = tmp_path / "config.toml"
        config_file.write_text("")
        return LocalServer(
            config_path=str(config_file),
            config=config,
            host="localhost",
            port=8080,
        )

    def test_init(self, server):
        """Test LocalServer initialization."""
        assert server.host == "localhost"
        assert server.port == 8080
        assert server.session_manager is not None

    def test_add_app(self, server):
        """Test adding an app."""
        server.add_app("New App", "python app.py", "newapp")
        assert "newapp" in server.session_manager.apps_by_slug

    def test_add_terminal(self, server):
        """Test adding a terminal."""
        server.add_terminal("Terminal", "bash", "term")
        assert "term" in server.session_manager.apps_by_slug
        app = server.session_manager.apps_by_slug["term"]
        assert app.terminal is True

    @pytest.mark.asyncio
    async def test_create_terminal_session_uses_slug_and_starts_session(self, server, monkeypatch):
        from textual_webterm import local_server

        monkeypatch.setattr(local_server, "generate", lambda: "fixed-session")

        session = MagicMock()
        session.start = AsyncMock()
        monkeypatch.setattr(server.session_manager, "new_session", AsyncMock(return_value=session))

        await server._create_terminal_session("test", 80, 24)

        server.session_manager.new_session.assert_awaited_once_with(
            "test",
            "fixed-session",
            "test",
            size=(80, 24),
        )
        session.start.assert_awaited_once()
        connector = session.start.call_args.args[0]
        assert connector.session_id == "fixed-session"
        assert connector.route_key == "test"


class TestLocalServerHelpers:
    """Tests for LocalServer helper methods."""

    @pytest.mark.asyncio
    async def test_keyboard_interrupt_closes_sessions_and_websockets(self, server, monkeypatch):
        ws1 = MagicMock()
        ws1.close = AsyncMock()
        ws2 = MagicMock()
        ws2.close = AsyncMock()
        server._websocket_connections["a"] = ws1
        server._websocket_connections["b"] = ws2

        monkeypatch.setattr(server.session_manager, "close_all", AsyncMock())

        server.on_keyboard_interrupt()
        assert server._shutdown_task is not None
        await server._shutdown_task

        ws1.close.assert_awaited_once()
        ws2.close.assert_awaited_once()
        server.session_manager.close_all.assert_awaited_once()
        assert server.exit_event.is_set()

    @pytest.mark.asyncio
    async def test_ws_resize_creates_session_when_slug_exists(self, server, monkeypatch):
        server.session_manager.apps_by_slug["slug"] = App(
            name="Known",
            slug="slug",
            path="./",
            command="echo ok",
            terminal=True,
        )
        monkeypatch.setattr(server, "_create_terminal_session", AsyncMock())

        ws = MagicMock()
        session_created = await server._dispatch_ws_message(
            ["resize", {"width": 100, "height": 40}],
            "slug",
            ws,
            session_created=False,
        )

        assert session_created is True
        server._create_terminal_session.assert_awaited_once_with("slug", 100, 40)

    @pytest.mark.asyncio
    async def test_ws_resize_sends_error_if_no_apps(self, server):
        ws = MagicMock()
        ws.send_json = AsyncMock()
        server._websocket_connections["rk"] = ws

        session_created = await server._dispatch_ws_message(
            ["resize", {"width": 80, "height": 24}],
            "rk",
            ws,
            session_created=False,
        )

        assert session_created is True
        ws.send_json.assert_awaited_once_with(["error", "No app configured"])

    @pytest.mark.asyncio
    async def test_resize_on_disconnect_calls_set_terminal_size(self, server, monkeypatch):
        session = MagicMock()
        session.set_terminal_size = AsyncMock()

        monkeypatch.setattr(server.session_manager, "get_session_by_route_key", lambda _rk: session)

        await server._resize_on_disconnect("rk")

        session.set_terminal_size.assert_called_once_with(132, 45)

    @pytest.mark.asyncio
    async def test_create_terminal_session_sends_error_if_no_apps(self, server):
        ws = MagicMock()
        ws.send_json = AsyncMock()
        server._websocket_connections["rk"] = ws

        await server._create_terminal_session("rk", 80, 24)

        ws.send_json.assert_awaited_once_with(["error", "No app configured"])

    @pytest.mark.asyncio
    async def test_screenshot_svg_handler_returns_svg(self, server, monkeypatch, capsys):
        request = MagicMock()
        request.query = {"route_key": "rk"}

        # Mock screen state: width=80, height=2, buffer with "hello" on first line
        screen_buffer = [
            [{"data": c, "fg": "default", "bg": "default", "bold": False, "italics": False, "underscore": False, "reverse": False} for c in "hello" + " " * 75],
            [{"data": " ", "fg": "default", "bg": "default", "bold": False, "italics": False, "underscore": False, "reverse": False}] * 80,
        ]
        session = MagicMock()
        session.get_screen_state = AsyncMock(return_value=(80, 2, screen_buffer))

        monkeypatch.setattr(server.session_manager, "get_session_by_route_key", lambda _rk: session)

        response = await server._handle_screenshot(request)
        assert response.content_type == "image/svg+xml"
        assert "<svg" in response.text

        out = capsys.readouterr()
        assert out.out == ""
        assert out.err == ""

    @pytest.mark.asyncio
    async def test_screenshot_creates_session_for_known_slug(self, server, monkeypatch):
        request = MagicMock()
        request.query = {"route_key": "known"}

        # Mock screen state
        screen_buffer = [
            [{"data": c, "fg": "default", "bg": "default", "bold": False, "italics": False, "underscore": False, "reverse": False} for c in "world" + " " * 75],
            [{"data": " ", "fg": "default", "bg": "default", "bold": False, "italics": False, "underscore": False, "reverse": False}] * 80,
        ]
        session = MagicMock()
        session.get_screen_state = AsyncMock(return_value=(80, 2, screen_buffer))

        # Pretend app exists for slug "known"
        server.session_manager.apps_by_slug["known"] = App(
            name="Known",
            slug="known",
            path="./",
            command="echo world",
            terminal=True,
        )

        created = {}

        async def create_session(route_key, width, height):
            created["called"] = (route_key, width, height)
            server.session_manager.routes["known"] = "sid"

        monkeypatch.setattr(server, "_create_terminal_session", create_session)
        monkeypatch.setattr(
            server.session_manager,
            "get_session_by_route_key",
            lambda _rk: session if created else None,
        )

        response = await server._handle_screenshot(request)
        assert response.content_type == "image/svg+xml"
        assert "<svg" in response.text
        assert "ui-monospace" in response.text
        assert "cdnjs.cloudflare.com" not in response.text
        assert created["called"][0] == "known"
        assert created["called"][1:] == (132, 45)

    @pytest.mark.asyncio
    async def test_screenshot_returns_404_for_unknown_slug(self, server, monkeypatch):
        request = MagicMock()
        request.query = {"route_key": "unknown"}

        monkeypatch.setattr(server.session_manager, "get_session_by_route_key", lambda _rk: None)

        with pytest.raises(web.HTTPNotFound) as exc:
            await server._handle_screenshot(request)

        assert exc.value.status == 404

    @pytest.mark.asyncio
    async def test_root_click_route_key_redirects(self, server):
        request = MagicMock()
        request.query = {}
        server._landing_apps = [
            App(name="Known", slug="known", path="./", command="echo world", terminal=True)
        ]
        response = await server._handle_root(request)
        assert "/?route_key=${encodeURIComponent(tile.slug)}" in response.text
        assert "visibilitychange" in response.text

    @pytest.fixture
    def config(self):
        """Create a test config."""
        return Config(
            apps=[],
        )

    @pytest.fixture
    def server(self, config, tmp_path):
        """Create a test server."""
        config_file = tmp_path / "config.toml"
        config_file.write_text("")
        return LocalServer(
            config_path=str(config_file),
            config=config,
            host="localhost",
            port=8080,
        )

    def test_get_ws_url_basic(self, server):
        """Test basic WebSocket URL generation."""
        request = MagicMock()
        request.headers = {"Host": "localhost:8080"}
        request.secure = False

        url = server._get_ws_url_from_request(request, "test-route")
        assert "ws://" in url
        assert "test-route" in url

    def test_get_ws_url_secure(self, server):
        """Test secure WebSocket URL generation."""
        request = MagicMock()
        request.headers = {"Host": "localhost:8080", "X-Forwarded-Proto": "https"}
        request.secure = True

        url = server._get_ws_url_from_request(request, "test-route")
        assert "wss://" in url

    def test_get_ws_url_forwarded_host(self, server):
        """Test WebSocket URL with forwarded host."""
        request = MagicMock()
        request.headers = {
            "Host": "localhost:8080",
            "X-Forwarded-Host": "example.com",
            "X-Forwarded-Proto": "https",
        }
        request.secure = False

        url = server._get_ws_url_from_request(request, "test-route")
        assert "example.com" in url

    def test_get_ws_url_forwarded_port(self, server):
        """Test WebSocket URL with forwarded port."""
        request = MagicMock()
        request.headers = {
            "Host": "localhost:8080",
            "X-Forwarded-Host": "example.com",
            "X-Forwarded-Port": "9000",
        }
        request.secure = False

        url = server._get_ws_url_from_request(request, "test-route")
        assert "9000" in url

    def test_get_ws_url_standard_port_omitted(self, server):
        """Test that standard ports are omitted from URL."""
        request = MagicMock()
        request.headers = {
            "Host": "example.com",
            "X-Forwarded-Port": "443",
            "X-Forwarded-Proto": "https",
        }
        request.secure = True

        url = server._get_ws_url_from_request(request, "test-route")
        # Port 443 should be omitted
        assert ":443" not in url or url == "wss://example.com/ws/test-route"


class TestWebSocketProtocol:
    """Tests for WebSocket protocol message formats."""

    def test_stdin_message_format(self):
        """Test stdin message format."""
        msg = ["stdin", "hello"]
        assert msg[0] == "stdin"
        assert msg[1] == "hello"

    def test_resize_message_format(self):
        """Test resize message format."""
        msg = ["resize", {"width": 80, "height": 24}]
        assert msg[0] == "resize"
        assert msg[1]["width"] == 80
        assert msg[1]["height"] == 24

    def test_ping_pong_format(self):
        """Test ping/pong message format."""
        ping = ["ping", "1234567890"]
        pong = ["pong", "1234567890"]
        assert ping[0] == "ping"
        assert pong[0] == "pong"
        assert ping[1] == pong[1]


class TestLocalServerMoreCoverage:
    @pytest.fixture
    def server_with_no_apps(self, tmp_path):
        config = Config(apps=[])
        config_file = tmp_path / "config.toml"
        config_file.write_text("")
        return LocalServer(config_path=str(config_file), config=config, host="localhost", port=8080)

    @pytest.mark.asyncio
    async def test_handle_health_check(self, server_with_no_apps):
        resp = await server_with_no_apps._handle_health_check(MagicMock())
        assert resp.text == "Local server is running"

    def test_select_app_for_route_picks_default(self, server_with_no_apps, monkeypatch):
        default_app = App(name="D", slug="d", path=".", command="echo d", terminal=True)
        monkeypatch.setattr(server_with_no_apps.session_manager, "get_default_app", lambda: default_app)
        assert server_with_no_apps._select_app_for_route("missing") == default_app

    @pytest.mark.asyncio
    async def test_handle_session_data_no_ws_noop(self, server_with_no_apps):
        await server_with_no_apps.handle_session_data("rk", b"data")

    @pytest.mark.asyncio
    async def test_handle_session_data_sends_bytes(self, server_with_no_apps):
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        server_with_no_apps._websocket_connections["rk"] = ws
        await server_with_no_apps.handle_session_data("rk", b"data")
        ws.send_bytes.assert_awaited_once_with(b"data")

    @pytest.mark.asyncio
    async def test_handle_binary_message_sends_bytes(self, server_with_no_apps):
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        server_with_no_apps._websocket_connections["rk"] = ws
        await server_with_no_apps.handle_binary_message("rk", b"bin")
        ws.send_bytes.assert_awaited_once_with(b"bin")

    @pytest.mark.asyncio
    async def test_handle_session_close_ends_session_and_closes_ws(self, server_with_no_apps, monkeypatch):
        ws = MagicMock()
        ws.close = AsyncMock()
        server_with_no_apps._websocket_connections["rk"] = ws
        monkeypatch.setattr(server_with_no_apps.session_manager, "on_session_end", MagicMock())
        await server_with_no_apps.handle_session_close("sid", "rk")
        server_with_no_apps.session_manager.on_session_end.assert_called_once_with("sid")
        ws.close.assert_awaited_once()

    def test_force_exit_sets_event(self, server_with_no_apps):
        assert not server_with_no_apps.exit_event.is_set()
        server_with_no_apps.force_exit()
        assert server_with_no_apps.exit_event.is_set()

    def test_get_static_path_import_error_returns_none(self, monkeypatch):
        import builtins

        from textual_webterm.local_server import _get_static_path

        real_import = builtins.__import__

        def fake_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name == "textual_serve":
                raise ImportError("nope")
            return real_import(name, globals, locals, fromlist, level)

        monkeypatch.setattr(builtins, "__import__", fake_import)
        assert _get_static_path() is None

    def test_add_terminal_windows_noop(self, server_with_no_apps, monkeypatch):
        from textual_webterm import constants as constants_mod

        monkeypatch.setattr(constants_mod, "WINDOWS", True)
        server_with_no_apps.add_terminal("T", "cmd", "slug")
        assert "slug" not in server_with_no_apps.session_manager.apps_by_slug

    @pytest.mark.asyncio
    async def test_handle_screenshot_404_when_no_running_session(self, server_with_no_apps, monkeypatch):
        request = MagicMock()
        request.query = {}
        monkeypatch.setattr(server_with_no_apps.session_manager, "get_first_running_session", lambda: None)
        with pytest.raises(web.HTTPNotFound):
            await server_with_no_apps._handle_screenshot(request)

    @pytest.mark.asyncio
    async def test_handle_screenshot_404_when_session_missing_buffer(self, server_with_no_apps, monkeypatch):
        request = MagicMock()
        request.query = {"route_key": "rk"}
        monkeypatch.setattr(server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: object())
        with pytest.raises(web.HTTPNotFound):
            await server_with_no_apps._handle_screenshot(request)

    @pytest.mark.asyncio
    async def test_get_ws_url_falls_back_when_no_host_header(self, server_with_no_apps):
        request = MagicMock()
        request.headers = {}
        request.secure = False
        url = server_with_no_apps._get_ws_url_from_request(request, "rk")
        assert url.startswith("ws://")

    @pytest.mark.asyncio
    async def test_root_terminal_page_includes_assets_and_dataset(self, server_with_no_apps, monkeypatch):
        server_with_no_apps.session_manager.apps_by_slug["rk"] = App(
            name="Known",
            slug="rk",
            path=".",
            command="echo",
            terminal=True,
        )
        request = MagicMock()
        request.query = {"route_key": "rk"}
        request.headers = {"Host": "localhost:8080"}
        request.secure = False

        resp = await server_with_no_apps._handle_root(request)
        assert "/static/css/xterm.css" in resp.text
        assert "/static-webterm/monospace.css" in resp.text
        assert "data-session-websocket-url" in resp.text
        assert "data-font-size" in resp.text
        assert "<title>Known</title>" in resp.text

    def test_rewrite_svg_fonts_removes_font_face_and_forces_stack(self):
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg">'
            '<style>@font-face{src:url(https://cdnjs.cloudflare.com/x);} text{font-family:Fira Code;}</style>'
            '<text>hi</text>'
            '</svg>'
        )
        out = _rewrite_svg_fonts(svg)
        assert "@font-face" not in out
        assert "cdnjs.cloudflare.com" not in out
        assert "ui-monospace" in out

    def test_rewrite_svg_fonts_injects_style_if_missing(self):
        svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>hi</text></svg>'
        out = _rewrite_svg_fonts(svg)
        assert "ui-monospace" in out

    @pytest.mark.asyncio
    async def test_cached_screenshot_etag_returns_304(self, server_with_no_apps):
        request = MagicMock()
        request.headers = {"If-None-Match": "abc"}
        server_with_no_apps._screenshot_cache["rk"] = (0.0, "<svg></svg>")
        server_with_no_apps._screenshot_cache_etag["rk"] = "abc"

        with pytest.raises(web.HTTPNotModified):
            server_with_no_apps._get_cached_screenshot_response(request, "rk")

    @pytest.mark.asyncio
    async def test_cached_screenshot_etag_sets_headers(self, server_with_no_apps):
        request = MagicMock()
        request.headers = {}
        server_with_no_apps._screenshot_cache["rk"] = (0.0, "<svg></svg>")
        server_with_no_apps._screenshot_cache_etag["rk"] = "abc"

        resp = server_with_no_apps._get_cached_screenshot_response(request, "rk")
        assert resp is not None
        assert resp.headers.get("ETag") == "abc"

    def test_screenshot_cache_ttl_backs_off(self, server_with_no_apps, monkeypatch):
        # Drive each tier by controlling now and last_activity.
        server_with_no_apps._route_last_activity["rk"] = 99.0
        assert server_with_no_apps._get_screenshot_cache_ttl("rk", now=100.0) == 1.0
        assert server_with_no_apps._get_screenshot_cache_ttl("rk", now=110.0) == 5.0
        assert server_with_no_apps._get_screenshot_cache_ttl("rk", now=200.0) == 15.0
        assert server_with_no_apps._get_screenshot_cache_ttl("rk", now=1000.0) == 60.0

    @pytest.mark.asyncio
    async def test_handle_screenshot_uses_cache_when_no_new_activity(self, server_with_no_apps, monkeypatch):
        request = MagicMock()
        request.query = {"route_key": "rk"}
        request.headers = {}

        session = MagicMock()
        session.get_screen_state = AsyncMock(return_value=(80, 2, []))
        monkeypatch.setattr(server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: session)

        server_with_no_apps._screenshot_cache["rk"] = (0.0, "<svg>cached</svg>")
        server_with_no_apps._screenshot_cache_etag["rk"] = "etag"
        server_with_no_apps._route_last_activity["rk"] = 5.0
        server_with_no_apps._screenshot_last_rendered_activity["rk"] = 5.0

        resp = await server_with_no_apps._handle_screenshot(request)
        assert "cached" in resp.text
        session.get_screen_state.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_handle_screenshot_renders_screen_state(self, server_with_no_apps, monkeypatch):
        request = MagicMock()
        request.query = {"route_key": "rk"}
        request.headers = {}

        # Mock screen state with some content
        screen_buffer = [
            [{"data": c, "fg": "default", "bg": "default", "bold": False, "italics": False, "underscore": False, "reverse": False} for c in "hello" + " " * 75],
            [{"data": " ", "fg": "default", "bg": "default", "bold": False, "italics": False, "underscore": False, "reverse": False}] * 80,
        ]
        session = MagicMock()
        session.get_screen_state = AsyncMock(return_value=(80, 2, screen_buffer))
        monkeypatch.setattr(server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: session)

        resp = await server_with_no_apps._handle_screenshot(request)
        assert resp.content_type == "image/svg+xml"
        assert "<svg" in resp.text

    @pytest.mark.asyncio
    async def test_handle_root_no_apps_available(self, server_with_no_apps):
        request = MagicMock()
        request.query = {}
        resp = await server_with_no_apps._handle_root(request)
        assert "No Apps Available" in resp.text

    @pytest.mark.asyncio
    async def test_dispatch_ws_message_ping_sends_pong(self, server_with_no_apps):
        ws = MagicMock()
        ws.send_json = AsyncMock()
        created = await server_with_no_apps._dispatch_ws_message(["ping", "x"], "rk", ws, False)
        assert created is False
        ws.send_json.assert_awaited_once_with(["pong", "x"])

    @pytest.mark.asyncio
    async def test_dispatch_ws_message_stdin_sends_bytes_to_session(self, server_with_no_apps, monkeypatch):
        session = MagicMock()
        session.send_bytes = AsyncMock()
        monkeypatch.setattr(server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: session)

        ws = MagicMock()
        created = await server_with_no_apps._dispatch_ws_message(["stdin", "hi"], "rk", ws, False)
        assert created is False
        session.send_bytes.assert_awaited_once_with(b"hi")

    @pytest.mark.asyncio
    async def test_connector_methods_forward_to_server(self):
        server = MagicMock()
        server.mark_route_activity = MagicMock()
        server.handle_session_data = AsyncMock()
        server.handle_binary_message = AsyncMock()
        server.handle_session_close = AsyncMock()

        connector = LocalClientConnector(server, "sid", "rk")
        await connector.on_data(b"data")
        server.mark_route_activity.assert_called_once_with("rk")
        server.handle_session_data.assert_awaited_once_with("rk", b"data")

        await connector.on_meta({"type": "open_url", "url": "https://example.com"})
        await connector.on_meta({"type": "deliver_file_start", "path": "/tmp/x"})
        await connector.on_meta({"type": "unknown"})

        await connector.on_binary_encoded_message(b"bin")
        server.handle_binary_message.assert_awaited_once_with("rk", b"bin")

        await connector.on_close()
        server.handle_session_close.assert_awaited_once_with("sid", "rk")

    @pytest.mark.asyncio
    async def test_run_stops_exit_poller_and_exits_poller(self, server_with_no_apps, monkeypatch):
        async def boom():
            raise RuntimeError("boom")

        monkeypatch.setattr(server_with_no_apps, "_run", boom)
        server_with_no_apps._exit_poller.stop = MagicMock()
        server_with_no_apps._poller.exit = MagicMock()

        with pytest.raises(RuntimeError):
            await server_with_no_apps.run()

        server_with_no_apps._exit_poller.stop.assert_called_once()
        server_with_no_apps._poller.exit.assert_called_once()

    def test_on_keyboard_interrupt_sets_event_when_already_shutting_down(self, server_with_no_apps):
        server_with_no_apps._shutdown_started = True
        assert not server_with_no_apps.exit_event.is_set()
        server_with_no_apps.on_keyboard_interrupt()
        assert server_with_no_apps.exit_event.is_set()

    @pytest.mark.asyncio
    async def test_on_keyboard_interrupt_schedules_shutdown_in_running_loop(self, server_with_no_apps):
        called = {"shutdown": False}

        async def shutdown():
            called["shutdown"] = True
            server_with_no_apps.exit_event.set()

        server_with_no_apps._shutdown = shutdown  # type: ignore[method-assign]
        server_with_no_apps.on_keyboard_interrupt()

        assert server_with_no_apps._shutdown_task is not None
        await server_with_no_apps._shutdown_task
        assert called["shutdown"] is True

    def test_on_keyboard_interrupt_uses_call_soon_threadsafe_when_loop_running(
        self, server_with_no_apps, monkeypatch
    ):
        async def shutdown():
            return None

        server_with_no_apps._shutdown = shutdown  # type: ignore[method-assign]

        fake_loop = MagicMock()
        fake_loop.is_running = MagicMock(return_value=True)
        server_with_no_apps._loop = fake_loop

        created = {"called": False}

        def fake_create_task(coro):
            created["called"] = True
            coro.close()
            return MagicMock()

        monkeypatch.setattr("textual_webterm.local_server.asyncio.create_task", fake_create_task)

        server_with_no_apps.on_keyboard_interrupt()
        assert fake_loop.call_soon_threadsafe.called

        schedule = fake_loop.call_soon_threadsafe.call_args.args[0]
        schedule()
        assert created["called"] is True

    def test_build_routes_logs_error_when_static_path_missing(self, server_with_no_apps, monkeypatch):
        from unittest.mock import MagicMock

        from textual_webterm import local_server

        # Create a mock path that returns False for exists()
        fake_path = MagicMock()
        fake_path.exists.return_value = False

        monkeypatch.setattr(local_server, "STATIC_PATH", fake_path)
        monkeypatch.setattr(local_server.log, "error", MagicMock())

        server_with_no_apps._build_routes()
        local_server.log.error.assert_called()

    @pytest.mark.asyncio
    async def test_dispatch_ws_message_stdin_without_payload_sends_empty(self, server_with_no_apps, monkeypatch):
        session = MagicMock()
        session.send_bytes = AsyncMock()
        monkeypatch.setattr(server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: session)

        ws = MagicMock()
        created = await server_with_no_apps._dispatch_ws_message(["stdin"], "rk", ws, False)
        assert created is False
        session.send_bytes.assert_awaited_once_with(b"")

    @pytest.mark.asyncio
    async def test_dispatch_ws_message_resize_updates_existing_session(self, server_with_no_apps, monkeypatch):
        session = MagicMock()
        session.set_terminal_size = AsyncMock()
        monkeypatch.setattr(server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: session)

        ws = MagicMock()
        created = await server_with_no_apps._dispatch_ws_message(
            ["resize", {"width": 100, "height": 50}], "rk", ws, True
        )
        assert created is True
        session.set_terminal_size.assert_awaited_once_with(100, 50)

    @pytest.mark.asyncio
    async def test_dispatch_ws_message_resize_no_session_noop(self, server_with_no_apps, monkeypatch):
        monkeypatch.setattr(server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: None)

        ws = MagicMock()
        created = await server_with_no_apps._dispatch_ws_message(
            ["resize", {"width": 100, "height": 50}], "rk", ws, True
        )
        assert created is True

    @pytest.mark.asyncio
    async def test_handle_screenshot_uses_screen_state(self, server_with_no_apps, monkeypatch):
        """Test that screenshot uses get_screen_state for rendering."""
        request = MagicMock()
        request.query = {"route_key": "rk"}
        request.headers = {}

        # Mock screen state
        screen_buffer = [
            [{"data": c, "fg": "default", "bg": "default", "bold": False, "italics": False, "underscore": False, "reverse": False} for c in "line1" + " " * 75],
            [{"data": c, "fg": "default", "bg": "default", "bold": False, "italics": False, "underscore": False, "reverse": False} for c in "line2" + " " * 75],
        ]
        session = MagicMock()
        session.get_screen_state = AsyncMock(return_value=(80, 2, screen_buffer))
        monkeypatch.setattr(server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: session)

        server_with_no_apps._route_last_activity["rk"] = 1.0

        resp = await server_with_no_apps._handle_screenshot(request)
        assert resp.content_type == "image/svg+xml"
        assert "<svg" in resp.text
        session.get_screen_state.assert_awaited_once()

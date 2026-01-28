"""Tests for local_server module - unit tests for helper functions."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from aiohttp import web

from textual_webterm.config import App, Config
from textual_webterm.local_server import (
    LocalServer,
)


class TestGetStaticPath:
    """Tests for static path."""

    def test_static_path_exists(self):
        """Test that static path exists."""
        from textual_webterm.local_server import WEBTERM_STATIC_PATH

        assert WEBTERM_STATIC_PATH is not None and WEBTERM_STATIC_PATH.exists()

    def test_static_path_has_js(self):
        """Test that static path has JS directory."""
        from textual_webterm.local_server import WEBTERM_STATIC_PATH

        assert WEBTERM_STATIC_PATH is not None
        assert (WEBTERM_STATIC_PATH / "js").exists()

    def test_static_path_has_wasm(self):
        """Test that static path has WASM file."""
        from textual_webterm.local_server import WEBTERM_STATIC_PATH

        assert WEBTERM_STATIC_PATH is not None
        assert (WEBTERM_STATIC_PATH / "js" / "ghostty-vt.wasm").exists()


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
        session.get_screen_has_changes = AsyncMock(return_value=False)
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
    async def test_create_terminal_session_sends_error_if_no_apps(self, server):
        ws = MagicMock()
        ws.send_json = AsyncMock()
        server._websocket_connections["rk"] = ws

        await server._create_terminal_session("rk", 80, 24)

        ws.send_json.assert_awaited_once_with(["error", "No app configured"])

    @pytest.mark.asyncio
    async def test_screenshot_svg_handler_returns_svg(
        self, server, monkeypatch, capsys, screen_buffer_factory, mock_session, mock_request
    ):
        request = mock_request
        request.query = {"route_key": "rk"}

        screen_buffer = screen_buffer_factory(["hello", ""])
        mock_session.get_screen_state = AsyncMock(return_value=(80, 2, screen_buffer, True))

        monkeypatch.setattr(
            server.session_manager, "get_session_by_route_key", lambda _rk: mock_session
        )

        response = await server._handle_screenshot(request)
        assert response.content_type == "image/svg+xml"
        assert "<svg" in response.text

        out = capsys.readouterr()
        assert out.out == ""
        assert out.err == ""

    @pytest.mark.asyncio
    async def test_screenshot_creates_session_for_known_slug(
        self, server, monkeypatch, screen_buffer_factory, mock_session, mock_request
    ):
        request = mock_request
        request.query = {"route_key": "known"}

        screen_buffer = screen_buffer_factory(["world", ""])
        mock_session.get_screen_state = AsyncMock(return_value=(80, 2, screen_buffer, True))

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
            lambda _rk: mock_session if created else None,
        )

        response = await server._handle_screenshot(request)
        assert response.content_type == "image/svg+xml"
        assert "<svg" in response.text
        assert "ui-monospace" in response.text  # Custom exporter uses ui-monospace font
        assert created["called"][0] == "known"
        assert created["called"][1:] == (132, 45)

    @pytest.mark.asyncio
    async def test_screenshot_returns_404_for_unknown_slug(self, server, monkeypatch, mock_request):
        request = mock_request
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

    @pytest.mark.parametrize(
        ("headers", "secure", "expected_parts", "forbidden_parts"),
        [
            ({"Host": "localhost:8080"}, False, ("ws://", "test-route"), ()),
            ({"Host": "localhost:8080", "X-Forwarded-Proto": "https"}, True, ("wss://",), ()),
            (
                {
                    "Host": "localhost:8080",
                    "X-Forwarded-Host": "example.com",
                    "X-Forwarded-Proto": "https",
                },
                False,
                ("example.com",),
                (),
            ),
            (
                {
                    "Host": "localhost:8080",
                    "X-Forwarded-Host": "example.com",
                    "X-Forwarded-Port": "9000",
                },
                False,
                ("9000",),
                (),
            ),
            (
                {
                    "Host": "example.com",
                    "X-Forwarded-Port": "443",
                    "X-Forwarded-Proto": "https",
                },
                True,
                ("wss://example.com/ws/test-route",),
                (":443",),
            ),
        ],
    )
    def test_get_ws_url_variants(
        self, server, mock_request, headers, secure, expected_parts, forbidden_parts
    ):
        """Test WebSocket URL generation variants."""
        request = mock_request
        request.headers = headers
        request.secure = secure

        url = server._get_ws_url_from_request(request, "test-route")
        for part in expected_parts:
            assert part in url
        for part in forbidden_parts:
            assert part not in url


class TestWebSocketProtocol:
    """Tests for WebSocket protocol message formats."""

    @pytest.mark.parametrize(
        ("msg_type", "payload", "assertions"),
        [
            ("stdin", "hello", lambda msg: msg[1] == "hello"),
            ("resize", {"width": 80, "height": 24}, lambda msg: msg[1]["width"] == 80),
            ("ping", "1234567890", lambda msg: msg[0] == "ping"),
        ],
    )
    def test_message_format(self, msg_type, payload, assertions):
        """Test message formats."""
        msg = [msg_type, payload]
        assert msg[0] == msg_type
        assert assertions(msg)


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
        monkeypatch.setattr(
            server_with_no_apps.session_manager, "get_default_app", lambda: default_app
        )
        assert server_with_no_apps._select_app_for_route("missing") == default_app

    @pytest.mark.asyncio
    async def test_handle_session_data_no_ws_noop(self, server_with_no_apps):
        await server_with_no_apps.handle_session_data("rk", b"data")

    @pytest.mark.asyncio
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        ("handler", "payload"),
        [
            ("handle_session_data", b"data"),
            ("handle_binary_message", b"bin"),
        ],
    )
    async def test_handle_message_sends_bytes(self, server_with_no_apps, handler, payload):
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        server_with_no_apps._websocket_connections["rk"] = ws
        await getattr(server_with_no_apps, handler)("rk", payload)
        ws.send_bytes.assert_awaited_once_with(payload)

    @pytest.mark.asyncio
    async def test_handle_session_close_ends_session_and_closes_ws(
        self, server_with_no_apps, monkeypatch
    ):
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

    def test_add_terminal_windows_noop(self, server_with_no_apps, monkeypatch):
        from textual_webterm import constants as constants_mod

        monkeypatch.setattr(constants_mod, "WINDOWS", True)
        server_with_no_apps.add_terminal("T", "cmd", "slug")
        assert "slug" not in server_with_no_apps.session_manager.apps_by_slug

    @pytest.mark.asyncio
    async def test_handle_screenshot_404_when_no_running_session(
        self, server_with_no_apps, monkeypatch
    ):
        request = MagicMock()
        request.query = {}
        monkeypatch.setattr(
            server_with_no_apps.session_manager, "get_first_running_session", lambda: None
        )
        with pytest.raises(web.HTTPNotFound):
            await server_with_no_apps._handle_screenshot(request)

    @pytest.mark.asyncio
    async def test_handle_screenshot_404_when_session_missing_buffer(
        self, server_with_no_apps, monkeypatch
    ):
        request = MagicMock()
        request.query = {"route_key": "rk"}
        monkeypatch.setattr(
            server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: object()
        )
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
    async def test_root_terminal_page_includes_assets_and_dataset(
        self, server_with_no_apps, monkeypatch
    ):
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
        assert "/static/monospace.css" in resp.text
        assert "/static/js/terminal.js" in resp.text
        assert "data-session-websocket-url" in resp.text
        assert "data-font-size" in resp.text
        assert "data-scrollback" in resp.text
        assert "<title>Known</title>" in resp.text

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
        server_with_no_apps._route_last_activity["rk"] = 99.0
        assert server_with_no_apps._get_screenshot_cache_ttl("rk", now=100.0) == 0.3

        server_with_no_apps._route_last_activity["rk"] = 90.0
        assert server_with_no_apps._get_screenshot_cache_ttl("rk", now=100.0) == 2.0

        server_with_no_apps._route_last_activity["rk"] = 40.0
        assert server_with_no_apps._get_screenshot_cache_ttl("rk", now=100.0) == 5.0

        server_with_no_apps._route_last_activity["rk"] = -100.0
        assert server_with_no_apps._get_screenshot_cache_ttl("rk", now=100.0) == 20.0

    def test_on_keyboard_interrupt_sets_event_when_already_shutting_down(self, server_with_no_apps):
        server_with_no_apps._shutdown_started = True
        assert not server_with_no_apps.exit_event.is_set()
        server_with_no_apps.on_keyboard_interrupt()
        assert server_with_no_apps.exit_event.is_set()

    @pytest.mark.asyncio
    async def test_on_keyboard_interrupt_schedules_shutdown_in_running_loop(
        self, server_with_no_apps
    ):
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

    def test_build_routes_logs_error_when_static_path_missing(
        self, server_with_no_apps, monkeypatch
    ):
        from unittest.mock import MagicMock

        from textual_webterm import local_server

        # Create a mock path that returns False for exists()
        fake_path = MagicMock()
        fake_path.exists.return_value = False

        monkeypatch.setattr(local_server, "WEBTERM_STATIC_PATH", fake_path)
        monkeypatch.setattr(local_server.log, "error", MagicMock())

        server_with_no_apps._build_routes()
        local_server.log.error.assert_called()

    @pytest.mark.asyncio
    async def test_dispatch_ws_message_stdin_without_payload_sends_empty(
        self, server_with_no_apps, monkeypatch
    ):
        session = MagicMock()
        session.get_screen_has_changes = AsyncMock(return_value=False)
        session.send_bytes = AsyncMock()
        monkeypatch.setattr(
            server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: session
        )

        ws = MagicMock()
        created = await server_with_no_apps._dispatch_ws_message(["stdin"], "rk", ws, False)
        assert created is False
        session.send_bytes.assert_awaited_once_with(b"")

    @pytest.mark.asyncio
    @pytest.mark.asyncio
    async def test_dispatch_ws_message_resize_existing_session_flag_false(
        self, server_with_no_apps, monkeypatch
    ):
        session = MagicMock()
        session.get_screen_has_changes = AsyncMock(return_value=False)
        session.set_terminal_size = AsyncMock()
        monkeypatch.setattr(
            server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: session
        )

        ws = MagicMock()
        created = await server_with_no_apps._dispatch_ws_message(
            ["resize", {"width": 100, "height": 50}], "rk", ws, False
        )
        assert created is False
        session.set_terminal_size.assert_awaited_once_with(100, 50)

    async def test_dispatch_ws_message_resize_updates_existing_session(
        self, server_with_no_apps, monkeypatch
    ):
        session = MagicMock()
        session.get_screen_has_changes = AsyncMock(return_value=False)
        session.set_terminal_size = AsyncMock()
        monkeypatch.setattr(
            server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: session
        )

        ws = MagicMock()
        created = await server_with_no_apps._dispatch_ws_message(
            ["resize", {"width": 100, "height": 50}], "rk", ws, True
        )
        assert created is True
        session.set_terminal_size.assert_awaited_once_with(100, 50)

    @pytest.mark.asyncio
    async def test_dispatch_ws_message_resize_no_session_noop(
        self, server_with_no_apps, monkeypatch
    ):
        monkeypatch.setattr(
            server_with_no_apps.session_manager, "get_session_by_route_key", lambda _rk: None
        )

        ws = MagicMock()
        created = await server_with_no_apps._dispatch_ws_message(
            ["resize", {"width": 100, "height": 50}], "rk", ws, True
        )
        assert created is True

    @pytest.mark.asyncio
    async def test_handle_screenshot_uses_cached_when_no_changes(
        self, server_with_no_apps, monkeypatch, mock_request, mock_session
    ):
        mock_session.get_screen_state = AsyncMock(return_value=(80, 24, [], False))
        monkeypatch.setattr(
            server_with_no_apps.session_manager,
            "get_session_by_route_key",
            lambda _rk: mock_session,
        )

        request = mock_request
        request.query = {"route_key": "rk"}

        # Seed cache
        server_with_no_apps._screenshot_cache["rk"] = (0.0, "<svg></svg>")
        server_with_no_apps._screenshot_cache_etag["rk"] = "abc"

        resp = await server_with_no_apps._handle_screenshot(request)
        assert resp.text == "<svg></svg>"
        mock_session.get_screen_state.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_handle_screenshot_uses_screen_state(
        self, server_with_no_apps, monkeypatch, screen_buffer_factory, mock_request, mock_session
    ):
        """Test that screenshot uses get_screen_state for rendering."""
        request = mock_request
        request.query = {"route_key": "rk"}

        screen_buffer = screen_buffer_factory(["line1", "line2"])
        mock_session.get_screen_state = AsyncMock(return_value=(80, 2, screen_buffer, True))
        monkeypatch.setattr(
            server_with_no_apps.session_manager,
            "get_session_by_route_key",
            lambda _rk: mock_session,
        )

        server_with_no_apps._route_last_activity["rk"] = 1.0

        resp = await server_with_no_apps._handle_screenshot(request)
        assert resp.content_type == "image/svg+xml"
        assert "<svg" in resp.text
        mock_session.get_screen_state.assert_awaited_once()

    def test_notify_activity_pushes_to_subscribers(self, server_with_no_apps):
        """Test that activity notifications are pushed to SSE subscribers."""
        import asyncio

        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=10)
        server_with_no_apps._sse_subscribers.append(queue)

        server_with_no_apps._notify_activity("test-route")

        assert not queue.empty()
        assert queue.get_nowait() == "test-route"

    def test_notify_activity_handles_full_queue(self, server_with_no_apps):
        """Test that full queues don't cause errors."""
        import asyncio

        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=1)
        queue.put_nowait("existing")
        server_with_no_apps._sse_subscribers.append(queue)

        # Should not raise even though queue is full
        server_with_no_apps._notify_activity("test-route")

        # Only the original item should be there
        assert queue.get_nowait() == "existing"

    @pytest.mark.asyncio
    async def test_handle_session_data_marks_activity(self, server_with_no_apps, monkeypatch):
        ws = MagicMock()
        ws.send_bytes = AsyncMock()
        server_with_no_apps._websocket_connections["rk"] = ws
        server_with_no_apps._route_last_activity["rk"] = 0.0

        await server_with_no_apps.handle_session_data("rk", b"data")
        assert server_with_no_apps._route_last_activity["rk"] > 0.0
        ws.send_bytes.assert_awaited_once_with(b"data")

    def test_mark_route_activity_triggers_notification(self, server_with_no_apps):
        """Test that mark_route_activity triggers SSE notification."""
        import asyncio

        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=10)
        server_with_no_apps._sse_subscribers.append(queue)

        server_with_no_apps.mark_route_activity("my-route")

        assert not queue.empty()
        assert queue.get_nowait() == "my-route"

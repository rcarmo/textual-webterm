"""Tests for local_server module - unit tests for helper functions."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from aiohttp import web

from textual_webterm.config import App, Config
from textual_webterm.local_server import LocalServer, _apply_carriage_returns


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

    def test_apply_carriage_returns_overwrites_line(self):
        text = "hello\rworld\nnext"
        assert _apply_carriage_returns(text) == ["world", "next"]

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
        request.query = {"route_key": "rk", "width": "80"}

        session = MagicMock()
        session.get_replay_buffer = AsyncMock(return_value=b"hello\r\n")

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
        request.query = {"route_key": "known", "width": "90"}

        session = MagicMock()
        session.get_replay_buffer = AsyncMock(return_value=b"world\r\n")

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

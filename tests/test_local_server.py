"""Tests for LocalServer."""

from __future__ import annotations

from textual_webterm.config import App, Config
from textual_webterm.local_server import STATIC_PATH, LocalServer


class TestLocalServer:
    """Tests for LocalServer."""

    def test_static_path_exists(self) -> None:
        """Test that static path is set from textual-serve."""
        assert STATIC_PATH is not None
        assert STATIC_PATH.exists()

    def test_static_path_has_required_files(self) -> None:
        """Test that static path contains required assets."""
        assert STATIC_PATH is not None
        assert (STATIC_PATH / "js" / "textual.js").exists()
        assert (STATIC_PATH / "css" / "xterm.css").exists()

    def test_create_server(self, tmp_path) -> None:
        """Test creating a LocalServer instance."""
        app = App(name="Test", slug="test", terminal=True, command="echo test")
        config = Config(apps=[app])

        server = LocalServer(
            str(tmp_path),
            config,
            host="127.0.0.1",
            port=8080,
        )

        assert server.host == "127.0.0.1"
        assert server.port == 8080
        assert server.app_count == 1

    def test_add_app(self, tmp_path) -> None:
        """Test adding an app to the server."""
        config = Config(apps=[])
        server = LocalServer(str(tmp_path), config, host="127.0.0.1", port=8080)

        assert server.app_count == 0
        server.add_app("New App", "echo hello", slug="new-app")
        assert server.app_count == 1


class TestWebSocketProtocol:
    """Tests for WebSocket protocol handling."""

    def test_stdin_message_format(self) -> None:
        """Test that stdin messages use correct format."""
        import json

        msg = json.dumps(["stdin", "hello"])
        parsed = json.loads(msg)
        assert parsed[0] == "stdin"
        assert parsed[1] == "hello"

    def test_resize_message_format(self) -> None:
        """Test that resize messages use correct format."""
        import json

        msg = json.dumps(["resize", {"width": 80, "height": 24}])
        parsed = json.loads(msg)
        assert parsed[0] == "resize"
        assert parsed[1]["width"] == 80
        assert parsed[1]["height"] == 24

    def test_ping_pong_format(self) -> None:
        """Test ping/pong message format."""
        import json

        ping = json.dumps(["ping", "12345"])
        parsed = json.loads(ping)
        assert parsed[0] == "ping"

        pong = json.dumps(["pong", "12345"])
        parsed = json.loads(pong)
        assert parsed[0] == "pong"

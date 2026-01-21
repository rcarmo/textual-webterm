"""Tests for session_manager module."""

import platform
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from textual_webterm.config import App
from textual_webterm.session_manager import SessionManager
from textual_webterm.types import RouteKey, SessionID


class TestSessionManager:
    """Tests for SessionManager class."""

    @pytest.fixture
    def mock_poller(self):
        """Create a mock poller."""
        return MagicMock()

    @pytest.fixture
    def mock_path(self, tmp_path):
        """Create a mock path."""
        return tmp_path

    @pytest.fixture
    def sample_apps(self):
        """Create sample apps."""
        return [
            App(name="Test Terminal", slug="terminal", path="./", command="bash", terminal=True),
            App(name="Test App", slug="app", path="./", command="python app.py", terminal=False),
        ]

    def test_init(self, mock_poller, mock_path, sample_apps):
        """Test SessionManager initialization."""
        manager = SessionManager(mock_poller, mock_path, sample_apps)

        assert manager.poller == mock_poller
        assert manager.path == mock_path
        assert len(manager.apps) == 2
        assert "terminal" in manager.apps_by_slug
        assert "app" in manager.apps_by_slug
        assert len(manager.sessions) == 0
        assert len(manager.routes) == 0

    def test_get_default_app(self, mock_poller, mock_path, sample_apps):
        """Test getting the default app."""
        manager = SessionManager(mock_poller, mock_path, sample_apps)
        assert manager.get_default_app() == sample_apps[0]

    def test_get_default_app_empty(self, mock_poller, mock_path):
        """Test getting the default app when no apps are configured."""
        manager = SessionManager(mock_poller, mock_path, [])
        assert manager.get_default_app() is None

    def test_add_app(self, mock_poller, mock_path):
        """Test adding an app."""
        manager = SessionManager(mock_poller, mock_path, [])

        manager.add_app("New App", "python new.py", "newapp", terminal=False)

        assert len(manager.apps) == 1
        assert "newapp" in manager.apps_by_slug
        assert manager.apps_by_slug["newapp"].name == "New App"

    def test_add_app_auto_slug(self, mock_poller, mock_path):
        """Test adding an app with auto-generated slug."""
        manager = SessionManager(mock_poller, mock_path, [])

        manager.add_app("Auto App", "python auto.py", "", terminal=False)

        assert len(manager.apps) == 1
        # Slug should be auto-generated
        assert len(manager.apps[0].slug) > 0

    def test_get_session_not_found(self, mock_poller, mock_path, sample_apps):
        """Test getting a non-existent session."""
        manager = SessionManager(mock_poller, mock_path, sample_apps)

        result = manager.get_session(SessionID("nonexistent"))
        assert result is None

    def test_get_session_by_route_key_not_found(self, mock_poller, mock_path, sample_apps):
        """Test getting session by non-existent route key."""
        manager = SessionManager(mock_poller, mock_path, sample_apps)

        result = manager.get_session_by_route_key(RouteKey("nonexistent"))
        assert result is None

    def test_on_session_end(self, mock_poller, mock_path, sample_apps):
        """Test session end cleanup."""
        manager = SessionManager(mock_poller, mock_path, sample_apps)

        # Manually add a session
        session_id = SessionID("test-session")
        route_key = RouteKey("test-route")
        mock_session = MagicMock()
        manager.sessions[session_id] = mock_session
        manager.routes[route_key] = session_id

        # End session
        manager.on_session_end(session_id)

        assert session_id not in manager.sessions
        assert route_key not in manager.routes

    def test_on_session_end_nonexistent(self, mock_poller, mock_path, sample_apps):
        """Test session end for non-existent session."""
        manager = SessionManager(mock_poller, mock_path, sample_apps)

        # Should not raise
        manager.on_session_end(SessionID("nonexistent"))

    @pytest.mark.asyncio
    async def test_close_all_empty(self, mock_poller, mock_path, sample_apps):
        """Test closing all sessions when empty."""
        manager = SessionManager(mock_poller, mock_path, sample_apps)

        # Should not raise
        await manager.close_all()

    @pytest.mark.asyncio
    async def test_close_all_with_sessions(self, mock_poller, mock_path, sample_apps):
        """Test closing all sessions."""
        manager = SessionManager(mock_poller, mock_path, sample_apps)

        # Add mock sessions
        mock_session = MagicMock()
        mock_session.close = AsyncMock()
        mock_session.wait = AsyncMock()
        manager.sessions[SessionID("s1")] = mock_session

        await manager.close_all(timeout=1.0)

        mock_session.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_close_session(self, mock_poller, mock_path, sample_apps):
        """Test closing a specific session."""
        manager = SessionManager(mock_poller, mock_path, sample_apps)

        mock_session = MagicMock()
        mock_session.close = AsyncMock()
        session_id = SessionID("test-session")
        manager.sessions[session_id] = mock_session

        await manager.close_session(session_id)

        mock_session.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_close_session_nonexistent(self, mock_poller, mock_path, sample_apps):
        """Test closing a non-existent session."""
        manager = SessionManager(mock_poller, mock_path, sample_apps)

        # Should not raise
        await manager.close_session(SessionID("nonexistent"))

    @pytest.mark.asyncio
    async def test_new_session_no_app(self, mock_poller, mock_path):
        """Test creating session with no matching app."""
        manager = SessionManager(mock_poller, mock_path, [])

        result = await manager.new_session(
            "nonexistent",
            SessionID("test"),
            RouteKey("route"),
        )

        assert result is None

    @pytest.mark.asyncio
    @pytest.mark.skipif(platform.system() == "Windows", reason="Terminal not supported on Windows")
    async def test_new_terminal_session(self, mock_poller, mock_path):
        """Test creating a new terminal session."""
        from textual_webterm.terminal_session import TerminalSession

        app = App(name="Terminal", slug="term", path="./", command="echo test", terminal=True)
        manager = SessionManager(mock_poller, mock_path, [app])

        with patch.object(TerminalSession, "open", new_callable=AsyncMock):
            result = await manager.new_session(
                "term",
                SessionID("test-session"),
                RouteKey("test-route"),
            )

            assert result is not None
            assert isinstance(result, TerminalSession)
            assert SessionID("test-session") in manager.sessions
            assert RouteKey("test-route") in manager.routes

    @pytest.mark.asyncio
    async def test_new_app_session(self, mock_poller, mock_path):
        """Test creating a new app session."""
        from textual_webterm.app_session import AppSession

        app = App(name="App", slug="app", path="./", command="python app.py", terminal=False)
        manager = SessionManager(mock_poller, mock_path, [app])

        with patch.object(AppSession, "open", new_callable=AsyncMock):
            result = await manager.new_session(
                "app",
                SessionID("test-session"),
                RouteKey("test-route"),
            )

            assert result is not None
            assert isinstance(result, AppSession)


class TestSessionManagerRoutes:
    """Tests for SessionManager route handling."""

    @pytest.fixture
    def manager(self, tmp_path):
        """Create a session manager with mock poller."""
        mock_poller = MagicMock()
        return SessionManager(mock_poller, tmp_path, [])

    def test_route_mapping(self, manager):
        """Test route to session mapping."""
        session_id = SessionID("session1")
        route_key = RouteKey("route1")

        manager.routes[route_key] = session_id

        assert manager.routes.get(route_key) == session_id
        assert manager.routes.get_key(session_id) == route_key

    def test_get_session_by_route(self, manager):
        """Test getting session by route key."""
        session_id = SessionID("session1")
        route_key = RouteKey("route1")
        mock_session = MagicMock()

        manager.sessions[session_id] = mock_session
        manager.routes[route_key] = session_id

        result = manager.get_session_by_route_key(route_key)
        assert result == mock_session

    def test_get_first_running_session_none(self, manager):
        """Test getting first running session when empty."""
        assert manager.get_first_running_session() is None

    def test_get_first_running_session_found(self, manager):
        """Test getting first running session."""
        session_id = SessionID("s1")
        route_key = RouteKey("r1")
        mock_session = MagicMock()
        mock_session.is_running.return_value = True

        manager.sessions[session_id] = mock_session
        manager.routes[route_key] = session_id

        result = manager.get_first_running_session()
        assert result == (route_key, mock_session)

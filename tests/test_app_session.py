"""Tests for app_session module."""

import asyncio
import contextlib
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from textual_webterm.app_session import AppSession, ProcessState


class TestProcessState:
    """Tests for ProcessState enum."""

    def test_process_states_exist(self):
        """Test that all process states exist."""
        assert ProcessState.PENDING is not None
        assert ProcessState.RUNNING is not None
        assert ProcessState.CLOSED is not None


class TestAppSession:
    """Tests for AppSession class."""

    @pytest.fixture
    def mock_path(self, tmp_path):
        """Create a mock path."""
        return tmp_path

    def test_init(self, mock_path):
        """Test AppSession initialization."""
        session = AppSession(mock_path, "python app.py", "test-session")

        assert session.working_directory == mock_path
        assert session.command == "python app.py"
        assert session.session_id == "test-session"
        assert session.state == ProcessState.PENDING

    def test_init_with_devtools(self, mock_path):
        """Test AppSession with devtools enabled."""
        session = AppSession(mock_path, "python app.py", "test-session", devtools=True)
        assert session.devtools is True

    @pytest.mark.asyncio
    async def test_send_bytes_not_running(self, mock_path):
        """Test send_bytes when not running returns False."""
        session = AppSession(mock_path, "python app.py", "test-session")

        # Session not started, will return False gracefully
        result = await session.send_bytes(b"test")
        assert result is False

    @pytest.mark.asyncio
    async def test_send_meta(self, mock_path):
        """Test send_meta."""
        session = AppSession(mock_path, "python app.py", "test-session")
        session._process = MagicMock()
        session._process.stdin = MagicMock()
        session._process.stdin.write = MagicMock()
        session._process.stdin.drain = AsyncMock()

        await session.send_meta({"key": "value"})
        # Should handle meta data

    @pytest.mark.asyncio
    async def test_set_terminal_size(self, mock_path):
        """Test set_terminal_size."""
        session = AppSession(mock_path, "python app.py", "test-session")
        session._process = MagicMock()
        session._process.stdin = MagicMock()
        session._process.stdin.write = MagicMock()
        session._process.stdin.drain = AsyncMock()

        # Should not raise
        await session.set_terminal_size(100, 50)

    @pytest.mark.asyncio
    async def test_close_not_running(self, mock_path):
        """Test close when not running handles gracefully."""
        session = AppSession(mock_path, "python app.py", "test-session")

        # No process running, close should handle gracefully (not crash)
        await session.close()
        assert session.state == ProcessState.CLOSING

    @pytest.mark.asyncio
    async def test_wait_no_task(self, mock_path):
        """Test wait when no task."""
        session = AppSession(mock_path, "python app.py", "test-session")

        # Should not raise
        await session.wait()

    def test_state_transitions(self, mock_path):
        """Test state transition tracking."""
        session = AppSession(mock_path, "python app.py", "test-session")

        assert session.state == ProcessState.PENDING

        # Manually set state for testing
        session.state = ProcessState.RUNNING
        assert session.state == ProcessState.RUNNING

        session.state = ProcessState.CLOSED
        assert session.state == ProcessState.CLOSED


class TestAppSessionConnector:
    """Tests for AppSession with connector."""

    @pytest.fixture
    def mock_connector(self):
        """Create a mock connector."""
        connector = MagicMock()
        connector.on_data = AsyncMock()
        connector.on_close = AsyncMock()
        return connector

    @pytest.mark.asyncio
    async def test_start_creates_task(self, tmp_path, mock_connector):
        """Test that start creates a task."""
        session = AppSession(tmp_path, "echo test", "test-session")

        with (
            patch.object(session, "open", new_callable=AsyncMock),
            patch.object(session, "run", new_callable=AsyncMock),
        ):
            task = await session.start(mock_connector)
            assert task is not None
            # Cancel to clean up
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

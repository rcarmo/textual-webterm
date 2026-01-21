"""Tests for terminal_session module."""

import os
import platform
import pty
import shlex
from unittest.mock import MagicMock, patch

import pytest

# Skip tests on Windows
pytestmark = pytest.mark.skipif(
    platform.system() == "Windows",
    reason="Terminal sessions not supported on Windows",
)


class TestTerminalSession:
    """Tests for TerminalSession class."""

    def test_import(self):
        """Test that module can be imported."""
        from textual_webterm.terminal_session import TerminalSession

        assert TerminalSession is not None

    def test_replay_buffer_size(self):
        """Test replay buffer size constant."""
        from textual_webterm.terminal_session import REPLAY_BUFFER_SIZE

        assert REPLAY_BUFFER_SIZE == 64 * 1024  # 64KB

    def test_init(self):
        """Test TerminalSession initialization."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        assert session.session_id == "test-session"
        assert session.command == "bash"
        assert session.master_fd is None
        assert session.pid is None
        assert session._task is None

    def test_init_default_shell(self):
        """Test that default shell is used when command is empty."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        with patch.dict(os.environ, {"SHELL": "/bin/zsh"}):
            session = TerminalSession(mock_poller, "test-session", "")
            assert session.command == "/bin/zsh"

    @pytest.mark.asyncio
    async def test_replay_buffer_add(self):
        """Test adding data to replay buffer."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        await session._add_to_replay_buffer(b"test data")
        assert session._replay_buffer_size == 9
        assert await session.get_replay_buffer() == b"test data"

    @pytest.mark.asyncio
    async def test_replay_buffer_multiple_adds(self):
        """Test adding multiple chunks to replay buffer."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        await session._add_to_replay_buffer(b"chunk1")
        await session._add_to_replay_buffer(b"chunk2")
        assert await session.get_replay_buffer() == b"chunk1chunk2"

    @pytest.mark.asyncio
    async def test_replay_buffer_overflow(self):
        """Test that replay buffer trims old data when exceeding limit."""
        from textual_webterm.terminal_session import (
            REPLAY_BUFFER_SIZE,
            TerminalSession,
        )

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        # Add more data than buffer size
        chunk_size = 1024
        for _i in range(100):  # 100KB total
            await session._add_to_replay_buffer(b"x" * chunk_size)

        # Buffer should be trimmed
        assert session._replay_buffer_size <= REPLAY_BUFFER_SIZE + chunk_size

    def test_update_connector(self):
        """Test updating connector."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        mock_connector = MagicMock()
        session.update_connector(mock_connector)
        assert session._connector == mock_connector

    def test_is_running_not_started(self):
        """Test is_running when session not started."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        assert session.is_running() is False

    @pytest.mark.asyncio
    async def test_send_bytes_no_fd(self):
        """Test send_bytes returns False when no master_fd."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        result = await session.send_bytes(b"test")
        assert result is False

    @pytest.mark.asyncio
    async def test_send_meta(self):
        """Test send_meta returns True."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        result = await session.send_meta({})
        assert result is True

    @pytest.mark.asyncio
    async def test_close_no_pid(self):
        """Test close when no pid."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        # Should not raise
        await session.close()

    @pytest.mark.asyncio
    async def test_wait_no_task(self):
        """Test wait when no task."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        # Should not raise
        await session.wait()

    def test_rich_repr(self):
        """Test rich repr output."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        repr_items = list(session.__rich_repr__())
        assert ("session_id", "test-session") in repr_items
        assert ("command", "bash") in repr_items

    @pytest.mark.asyncio
    async def test_open_uses_shlex_split_and_execvp_with_args(self):
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        command = 'echo "hello world"'
        session = TerminalSession(mock_poller, "test-session", command)

        with (
            patch("textual_webterm.terminal_session.pty.fork", return_value=(pty.CHILD, 123)) as mock_fork,
            patch("textual_webterm.terminal_session.version", return_value="0.0.0"),
            patch("textual_webterm.terminal_session.shlex.split", wraps=shlex.split) as mock_split,
            patch("textual_webterm.terminal_session.os.execvp", side_effect=OSError()) as mock_execvp,
            patch("textual_webterm.terminal_session.os._exit", side_effect=SystemExit(1)) as mock_exit,
            pytest.raises(SystemExit),
        ):
            await session.open()

        mock_fork.assert_called_once()
        mock_split.assert_called_once_with(command)
        mock_execvp.assert_called_once_with("echo", ["echo", "hello world"])
        mock_exit.assert_called_once_with(1)

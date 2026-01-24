"""Tests for terminal_session module."""

import asyncio
import os
import platform
import pty
import shlex
from unittest.mock import AsyncMock, MagicMock, patch

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

    @pytest.mark.asyncio
    async def test_screen_state_updates_with_data(self):
        """Test that pyte screen updates when data is received."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        # Feed some terminal data
        await session._update_screen(b"Hello World\r\n")
        lines = await session.get_screen_lines()

        # First line should contain the text
        assert "Hello World" in lines[0]

    @pytest.mark.asyncio
    async def test_screen_handles_cursor_positioning(self):
        """Test that pyte screen correctly handles cursor positioning (tmux-style)."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        # Feed content then reposition cursor and overwrite
        await session._update_screen(b"Line 1\r\nLine 2\r\nLine 3\r\n")
        # Move cursor to line 2, column 1 and clear line, then write new content
        await session._update_screen(b"\x1b[2;1H\x1b[KUpdated Line 2")

        lines = await session.get_screen_lines()

        assert lines[0] == "Line 1"
        assert lines[1] == "Updated Line 2"
        assert lines[2] == "Line 3"

    @pytest.mark.asyncio
    async def test_get_screen_state_returns_dirty_flag(self):
        """Test that get_screen_state returns has_changes flag based on pyte dirty tracking."""
        from textual_webterm.terminal_session import TerminalSession

        mock_poller = MagicMock()
        session = TerminalSession(mock_poller, "test-session", "bash")

        # After creation, all rows are dirty (initialized)
        _w, _h, _buf, has_changes = await session.get_screen_state()
        assert has_changes is True  # Initial state marks all rows dirty

        # After getting state, dirty set is cleared
        # Without new data, has_changes should be False
        _, _, _, has_changes = await session.get_screen_state()
        assert has_changes is False  # No changes since last call

        # Feed new data
        await session._update_screen(b"New content\r\n")
        _, _, _, has_changes = await session.get_screen_state()
        assert has_changes is True  # Screen was updated

        # Check again without new data
        _, _, _, has_changes = await session.get_screen_state()
        assert has_changes is False  # No changes

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

    @pytest.mark.asyncio
    async def test_open_parent_branch_sets_fd_and_pid(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bash")

        with (
            patch("textual_webterm.terminal_session.pty.fork", return_value=(1234, 99)),
            patch.object(session, "_set_terminal_size") as set_size,
        ):
            await session.open(width=80, height=24)

        assert session.pid == 1234
        assert session.master_fd == 99
        set_size.assert_called_once_with(80, 24)

    @pytest.mark.asyncio
    async def test_open_bad_command_exits(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bad")

        with (
            patch("textual_webterm.terminal_session.pty.fork", return_value=(pty.CHILD, 123)),
            patch("textual_webterm.terminal_session.shlex.split", side_effect=ValueError("bad")),
            patch("textual_webterm.terminal_session.os._exit", side_effect=SystemExit(1)) as mock_exit,
            pytest.raises(SystemExit),
        ):
            await session.open()

        mock_exit.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_run_reads_from_poller_and_closes(self):
        from textual_webterm.terminal_session import TerminalSession

        queue: asyncio.Queue[bytes | None] = asyncio.Queue()
        await queue.put(b"hello")
        await queue.put(None)

        poller = MagicMock()
        poller.add_file = MagicMock(return_value=queue)
        poller.remove_file = MagicMock()

        connector = MagicMock()
        connector.on_data = AsyncMock()
        connector.on_close = AsyncMock()

        session = TerminalSession(poller, "sid", "bash")
        session.master_fd = 10
        session._connector = connector

        with patch("textual_webterm.terminal_session.os.close") as mock_close:
            await session.run()

        connector.on_data.assert_awaited_once_with(b"hello")
        connector.on_close.assert_awaited_once()
        poller.remove_file.assert_called_once_with(10)
        mock_close.assert_called_once_with(10)

    @pytest.mark.asyncio
    async def test_start_updates_connector_when_already_running(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bash")
        session.master_fd = 10

        existing = asyncio.create_task(asyncio.sleep(0))
        session._task = existing

        connector = MagicMock()
        task = await session.start(connector)
        assert task is existing
        assert session._connector is connector

        await existing

    @pytest.mark.asyncio
    async def test_send_bytes_writes_via_poller(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        poller.write = AsyncMock()

        session = TerminalSession(poller, "sid", "bash")
        session.master_fd = 10

        assert await session.send_bytes(b"x") is True
        poller.write.assert_awaited_once_with(10, b"x")

    @pytest.mark.asyncio
    async def test_open_set_terminal_size_oserror_closes_fd_and_clears_master_fd(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bash")

        with (
            patch("textual_webterm.terminal_session.pty.fork", return_value=(1234, 99)),
            patch.object(session, "_set_terminal_size", side_effect=OSError("bad")),
            patch("textual_webterm.terminal_session.os.close") as mock_close,
            pytest.raises(OSError),
        ):
            await session.open(width=80, height=24)

        mock_close.assert_called_once_with(99)
        assert session.master_fd is None

    @pytest.mark.asyncio
    async def test_set_terminal_size_uses_executor(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bash")
        session.master_fd = 10

        loop = asyncio.get_running_loop()
        with patch.object(loop, "run_in_executor", new=AsyncMock()) as run_in_executor:
            await session.set_terminal_size(80, 24)

        run_in_executor.assert_awaited_once_with(None, session._set_terminal_size, 80, 24)

    def test__set_terminal_size_calls_ioctl(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bash")
        session.master_fd = 10

        with patch("textual_webterm.terminal_session.fcntl.ioctl") as mock_ioctl:
            session._set_terminal_size(80, 24)

        assert mock_ioctl.called

    @pytest.mark.asyncio
    async def test_start_creates_task_when_not_running(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bash")
        session.master_fd = 10

        session.run = AsyncMock()  # type: ignore[method-assign]

        connector = MagicMock()
        task = await session.start(connector)
        assert task is session._task
        assert session._connector is connector

        await task
        session.run.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_run_without_connector_still_closes(self):
        from textual_webterm.terminal_session import TerminalSession

        queue: asyncio.Queue[bytes | None] = asyncio.Queue()
        await queue.put(b"hello")
        await queue.put(None)

        poller = MagicMock()
        poller.add_file = MagicMock(return_value=queue)
        poller.remove_file = MagicMock()

        session = TerminalSession(poller, "sid", "bash")
        session.master_fd = 10
        session._connector = None

        with patch("textual_webterm.terminal_session.os.close") as mock_close:
            await session.run()

        poller.remove_file.assert_called_once_with(10)
        mock_close.assert_called_once_with(10)

    @pytest.mark.asyncio
    async def test_run_oserror_still_closes(self):
        from textual_webterm.terminal_session import TerminalSession

        queue = MagicMock()
        queue.get = AsyncMock(side_effect=OSError("boom"))

        poller = MagicMock()
        poller.add_file = MagicMock(return_value=queue)
        poller.remove_file = MagicMock()

        session = TerminalSession(poller, "sid", "bash")
        session.master_fd = 10
        session._connector = None

        with patch("textual_webterm.terminal_session.os.close") as mock_close:
            await session.run()

        poller.remove_file.assert_called_once_with(10)
        mock_close.assert_called_once_with(10)

    @pytest.mark.asyncio
    async def test_close_process_lookup_error_is_ignored(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bash")
        session.pid = 123

        with patch("textual_webterm.terminal_session.os.kill", side_effect=ProcessLookupError()):
            await session.close()

    @pytest.mark.asyncio
    async def test_close_logs_warning_on_unexpected_exception(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bash")
        session.pid = 123

        with (
            patch("textual_webterm.terminal_session.os.kill", side_effect=RuntimeError("x")),
            patch("textual_webterm.terminal_session.log.warning") as warn,
        ):
            await session.close()

        assert warn.called

    @pytest.mark.asyncio
    async def test_wait_suppresses_cancelled_error(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bash")

        task = asyncio.create_task(asyncio.sleep(10))
        task.cancel()
        session._task = task

        await session.wait()

    def test_is_running_false_when_kill_fails(self):
        from textual_webterm.terminal_session import TerminalSession

        poller = MagicMock()
        session = TerminalSession(poller, "sid", "bash")
        session.master_fd = 10
        session._task = MagicMock()
        session.pid = 123

        with patch("textual_webterm.terminal_session.os.kill", side_effect=OSError()):
            assert session.is_running() is False

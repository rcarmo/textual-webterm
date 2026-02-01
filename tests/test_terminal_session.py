"""Tests for terminal_session module."""

import asyncio
import os
import platform
import pty
import shlex
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from webterm.terminal_session import (
    REPLAY_BUFFER_SIZE,
    TerminalSession,
)

# Skip tests on Windows
pytestmark = pytest.mark.skipif(
    platform.system() == "Windows",
    reason="Terminal sessions not supported on Windows",
)


@pytest.fixture
def terminal_session(mock_poller):
    """Create a TerminalSession for testing."""
    return TerminalSession(mock_poller, "test-session", "bash")


class TestTerminalSession:
    """Tests for TerminalSession class."""

    def test_import(self):
        """Test that module can be imported."""
        assert TerminalSession is not None

    def test_replay_buffer_size(self):
        """Test replay buffer size constant."""
        assert REPLAY_BUFFER_SIZE == 256 * 1024

    def test_init(self, terminal_session):
        """Test TerminalSession initialization."""
        assert terminal_session.session_id == "test-session"
        assert terminal_session.command == "bash"
        assert terminal_session.master_fd is None
        assert terminal_session.pid is None
        assert terminal_session._task is None

    def test_init_default_shell(self, mock_poller):
        """Test that default shell is used when command is empty."""
        with patch.dict(os.environ, {"SHELL": "/bin/zsh"}):
            session = TerminalSession(mock_poller, "test-session", "")
            assert session.command == "/bin/zsh"

    def test_package_version_fallback(self):
        with (
            patch("webterm.terminal_session.version", side_effect=RuntimeError()),
            patch("webterm.terminal_session.PackageNotFoundError", RuntimeError),
        ):
            assert TerminalSession._package_version() == "0.0.0"

    @pytest.mark.asyncio
    async def test_replay_buffer_add(self, terminal_session):
        """Test adding data to replay buffer."""
        await terminal_session._add_to_replay_buffer(b"test data")
        assert terminal_session._replay_buffer_size == 9
        assert await terminal_session.get_replay_buffer() == b"test data"

    @pytest.mark.asyncio
    async def test_replay_buffer_multiple_adds(self, terminal_session):
        """Test adding multiple chunks to replay buffer."""
        await terminal_session._add_to_replay_buffer(b"chunk1")
        await terminal_session._add_to_replay_buffer(b"chunk2")
        assert await terminal_session.get_replay_buffer() == b"chunk1chunk2"

    @pytest.mark.asyncio
    async def test_replay_buffer_overflow(self, terminal_session):
        """Test that replay buffer trims old data when exceeding limit."""
        # Add more data than buffer size
        chunk_size = 1024
        for _i in range(100):  # 100KB total
            await terminal_session._add_to_replay_buffer(b"x" * chunk_size)

        # Buffer should be trimmed
        assert terminal_session._replay_buffer_size <= REPLAY_BUFFER_SIZE + chunk_size

    @pytest.mark.asyncio
    async def test_screen_state_updates_with_data(self, terminal_session):
        """Test that pyte screen updates when data is received."""
        await terminal_session._update_screen(b"Hello World\r\n")
        lines = await terminal_session.get_screen_lines()
        assert "Hello World" in lines[0]

    @pytest.mark.asyncio
    async def test_screen_handles_cursor_positioning(self, terminal_session):
        """Test that pyte screen correctly handles cursor positioning (tmux-style)."""
        await terminal_session._update_screen(b"Line 1\r\nLine 2\r\nLine 3\r\n")
        # Move cursor to line 2, column 1 and clear line, then write new content
        await terminal_session._update_screen(b"\x1b[2;1H\x1b[KUpdated Line 2")

        lines = await terminal_session.get_screen_lines()

        assert lines[0] == "Line 1"
        assert lines[1] == "Updated Line 2"
        assert lines[2] == "Line 3"

    @pytest.mark.asyncio
    async def test_screen_handles_c1_csi_sequences(self, terminal_session):
        """Ensure C1 CSI (0x9b) sequences are parsed for clearing lines."""
        await terminal_session._update_screen(b"Line 1\r\nLine 2\r\nLine 3\r\n")
        # C1 CSI equivalent of ESC[2;1H ESC[K
        await terminal_session._update_screen(b"\x9b2;1H\x9bKUpdated Line 2")

        lines = await terminal_session.get_screen_lines()

        assert lines[0] == "Line 1"
        assert lines[1] == "Updated Line 2"
        assert lines[2] == "Line 3"

    @pytest.mark.asyncio
    async def test_screen_preserves_utf8_bytes_with_c1_values(self, terminal_session):
        """Ensure UTF-8 bytes containing 0x9c aren't corrupted by C1 normalization."""
        await terminal_session._update_screen("✓ ok\r\n".encode())
        lines = await terminal_session.get_screen_lines()
        assert "✓ ok" in lines[0]

    @pytest.mark.asyncio
    async def test_get_screen_state_returns_dirty_flag(self, terminal_session):
        """Test that get_screen_state returns has_changes flag based on pyte dirty tracking."""
        # After creation, all rows are dirty (initialized)
        _w, _h, _buf, has_changes = await terminal_session.get_screen_state()
        assert has_changes is True

        # After getting state, dirty set is cleared
        _, _, _, has_changes = await terminal_session.get_screen_state()
        assert has_changes is False

        # Feed new data
        await terminal_session._update_screen(b"New content\r\n")
        _, _, _, has_changes = await terminal_session.get_screen_state()
        assert has_changes is True

        # Check again without new data
        _, _, _, has_changes = await terminal_session.get_screen_state()
        assert has_changes is False

    def test_update_connector(self, terminal_session):
        """Test updating connector."""
        mock_connector = MagicMock()
        terminal_session.update_connector(mock_connector)
        assert terminal_session._connector == mock_connector

    def test_is_running_not_started(self, terminal_session):
        """Test is_running when session not started."""
        assert terminal_session.is_running() is False

    @pytest.mark.asyncio
    async def test_send_bytes_no_fd(self, terminal_session):
        """Test send_bytes returns False when no master_fd."""
        result = await terminal_session.send_bytes(b"test")
        assert result is False

    @pytest.mark.asyncio
    async def test_send_meta(self, terminal_session):
        """Test send_meta returns True."""
        result = await terminal_session.send_meta({})
        assert result is True

    @pytest.mark.asyncio
    async def test_close_no_pid(self, terminal_session):
        """Test close when no pid."""
        await terminal_session.close()  # Should not raise

    @pytest.mark.asyncio
    async def test_wait_no_task(self, terminal_session):
        """Test wait when no task."""
        await terminal_session.wait()  # Should not raise

    def test_repr(self, terminal_session):
        """Test repr output."""
        repr_str = repr(terminal_session)
        assert "test-session" in repr_str
        assert "bash" in repr_str

    @pytest.mark.asyncio
    async def test_open_uses_shlex_split_and_execvp_with_args(self, mock_poller):
        command = 'echo "hello world"'
        session = TerminalSession(mock_poller, "test-session", command)

        with (
            patch("webterm.terminal_session.pty.fork", return_value=(pty.CHILD, 123)) as mock_fork,
            patch("webterm.terminal_session.version", return_value="0.0.0"),
            patch("webterm.terminal_session.shlex.split", wraps=shlex.split) as mock_split,
            patch("webterm.terminal_session.os.execvp", side_effect=OSError()) as mock_execvp,
            patch("webterm.terminal_session.os._exit", side_effect=SystemExit(1)) as mock_exit,
            pytest.raises(SystemExit),
        ):
            await session.open()

        mock_fork.assert_called_once()
        mock_split.assert_called_once_with(command)
        mock_execvp.assert_called_once_with("echo", ["echo", "hello world"])
        mock_exit.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_open_parent_branch_sets_fd_and_pid(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bash")

        with (
            patch("webterm.terminal_session.pty.fork", return_value=(1234, 99)),
            patch.object(session, "_set_terminal_size") as set_size,
        ):
            await session.open(width=80, height=24)

        assert session.pid == 1234
        assert session.master_fd == 99
        set_size.assert_called_once_with(80, 24)

    @pytest.mark.asyncio
    async def test_open_bad_command_exits(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bad")

        with (
            patch("webterm.terminal_session.pty.fork", return_value=(pty.CHILD, 123)),
            patch("webterm.terminal_session.shlex.split", side_effect=ValueError("bad")),
            patch("webterm.terminal_session.os._exit", side_effect=SystemExit(1)) as mock_exit,
            pytest.raises(SystemExit),
        ):
            await session.open()

        mock_exit.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_get_screen_lines_strips(self, terminal_session, dummy_lock):
        terminal_session._screen = MagicMock()
        terminal_session._screen.display = ["line  ", "next"]
        terminal_session._screen_lock = dummy_lock

        lines = await terminal_session.get_screen_lines()
        assert lines == ["line", "next"]

    @pytest.mark.asyncio
    async def test_get_screen_state_no_changes(
        self, terminal_session, dummy_lock, mock_screen_char
    ):
        terminal_session._screen = MagicMock()
        terminal_session._screen.columns = 1
        terminal_session._screen.lines = 1
        terminal_session._screen.dirty = set()
        terminal_session._screen.buffer = [[mock_screen_char()]]
        terminal_session._sync_pyte_to_pty = AsyncMock()
        terminal_session._screen_lock = dummy_lock

        width, height, _buffer, changed = await terminal_session.get_screen_state()
        assert width == 1
        assert height == 1
        assert changed is False

    @pytest.mark.asyncio
    async def test_get_screen_state_clears_dirty(
        self, terminal_session, dummy_lock, mock_screen_char
    ):
        terminal_session._screen = MagicMock()
        terminal_session._screen.columns = 2
        terminal_session._screen.lines = 1
        terminal_session._screen.dirty = {1}
        terminal_session._screen.buffer = [[mock_screen_char("x"), mock_screen_char("y")]]
        terminal_session._sync_pyte_to_pty = AsyncMock()
        terminal_session._screen_lock = dummy_lock

        width, height, _buffer, changed = await terminal_session.get_screen_state()
        assert width == 2
        assert height == 1
        assert changed is True
        assert terminal_session._screen.dirty == set()

    @pytest.mark.asyncio
    async def test_get_screen_snapshot_does_not_mutate_state(
        self, terminal_session, dummy_lock, mock_screen_char
    ):
        """Test that get_screen_snapshot doesn't call _sync_pyte_to_pty or clear dirty."""
        terminal_session._screen = MagicMock()
        terminal_session._screen.columns = 2
        terminal_session._screen.lines = 1
        terminal_session._screen.dirty = {0}
        terminal_session._screen.buffer = [[mock_screen_char("a"), mock_screen_char("b")]]
        terminal_session._sync_pyte_to_pty = AsyncMock()
        terminal_session._screen_lock = dummy_lock
        terminal_session._change_counter = 1
        terminal_session._last_snapshot_counter = 0

        width, height, buffer, has_changes = await terminal_session.get_screen_snapshot()

        # Verify dimensions and data returned correctly
        assert width == 2
        assert height == 1
        assert has_changes is True
        assert buffer[0][0]["data"] == "a"
        assert buffer[0][1]["data"] == "b"

        # Verify no mutation: _sync_pyte_to_pty not called, dirty not cleared
        terminal_session._sync_pyte_to_pty.assert_not_awaited()
        assert terminal_session._screen.dirty == {0}  # NOT cleared

        # Snapshot counter should be updated for change tracking
        assert terminal_session._last_snapshot_counter == 1

    @pytest.mark.asyncio
    async def test_get_screen_snapshot_tracks_changes_correctly(self, terminal_session, dummy_lock):
        """Test that repeated snapshots correctly track changes."""
        terminal_session._screen_lock = dummy_lock
        terminal_session._change_counter = 5
        terminal_session._last_snapshot_counter = 5

        # No changes since last snapshot
        _, _, _, has_changes = await terminal_session.get_screen_snapshot()
        assert has_changes is False

        # Simulate new screen data
        terminal_session._change_counter = 6
        _, _, _, has_changes = await terminal_session.get_screen_snapshot()
        assert has_changes is True
        assert terminal_session._last_snapshot_counter == 6

    @pytest.mark.asyncio
    async def test_update_screen_increments_change_counter(self, terminal_session):
        """Test that _update_screen increments change counter when screen changes."""
        initial_counter = terminal_session._change_counter

        # Feed data that will mark screen as dirty
        await terminal_session._update_screen(b"Hello\r\n")

        assert terminal_session._change_counter > initial_counter

    @pytest.mark.asyncio
    async def test_set_terminal_size_increments_change_counter(self, terminal_session, mock_poller):
        """Test that set_terminal_size increments change counter."""
        terminal_session.master_fd = 10
        initial_counter = terminal_session._change_counter

        loop = asyncio.get_running_loop()
        with patch.object(loop, "run_in_executor", new=AsyncMock()):
            await terminal_session.set_terminal_size(100, 50)

        assert terminal_session._change_counter == initial_counter + 1

    @pytest.mark.asyncio
    async def test_get_screen_has_changes_uses_change_counter(self, terminal_session, dummy_lock):
        """Test that get_screen_has_changes uses the change counter."""
        terminal_session._screen_lock = dummy_lock

        # Initially no changes
        terminal_session._change_counter = 0
        terminal_session._last_snapshot_counter = 0
        assert await terminal_session.get_screen_has_changes() is False

        # After screen update increments counter
        terminal_session._change_counter = 1
        assert await terminal_session.get_screen_has_changes() is True

        # After snapshot resets detection
        terminal_session._last_snapshot_counter = 1
        assert await terminal_session.get_screen_has_changes() is False

    @pytest.mark.asyncio
    async def test_send_bytes_handles_closed_fd(self, mock_poller):
        mock_poller.write = AsyncMock(side_effect=KeyError)
        session = TerminalSession(mock_poller, "sid", "bash")
        session.master_fd = 10

        ok = await session.send_bytes(b"test")
        assert ok is False

    @pytest.mark.asyncio
    async def test_run_reads_from_poller_and_closes(self, mock_poller):
        queue: asyncio.Queue[bytes | None] = asyncio.Queue()
        await queue.put(b"hello")
        await queue.put(None)

        mock_poller.add_file = MagicMock(return_value=queue)
        mock_poller.remove_file = MagicMock()

        connector = MagicMock()
        connector.on_data = AsyncMock()
        connector.on_close = AsyncMock()

        session = TerminalSession(mock_poller, "sid", "bash")
        session.master_fd = 10
        session._connector = connector

        with patch("webterm.terminal_session.os.close") as mock_close:
            await session.run()

        connector.on_data.assert_awaited_once_with(b"hello")
        connector.on_close.assert_awaited_once()
        mock_poller.remove_file.assert_called_once_with(10)
        mock_close.assert_called_once_with(10)

    @pytest.mark.asyncio
    async def test_start_updates_connector_when_already_running(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bash")
        session.master_fd = 10

        existing = asyncio.create_task(asyncio.sleep(0))
        session._task = existing

        connector = MagicMock()
        task = await session.start(connector)
        assert task is existing
        assert session._connector is connector

        await existing

    @pytest.mark.asyncio
    async def test_send_bytes_writes_via_poller(self, mock_poller):
        mock_poller.write = AsyncMock()

        session = TerminalSession(mock_poller, "sid", "bash")
        session.master_fd = 10

        assert await session.send_bytes(b"x") is True
        mock_poller.write.assert_awaited_once_with(10, b"x")

    @pytest.mark.asyncio
    async def test_open_set_terminal_size_oserror_closes_fd_and_clears_master_fd(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bash")

        with (
            patch("webterm.terminal_session.pty.fork", return_value=(1234, 99)),
            patch.object(session, "_set_terminal_size", side_effect=OSError("bad")),
            patch("webterm.terminal_session.os.close") as mock_close,
            pytest.raises(OSError),
        ):
            await session.open(width=80, height=24)

        mock_close.assert_called_once_with(99)
        assert session.master_fd is None

    @pytest.mark.asyncio
    async def test_set_terminal_size_uses_executor(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bash")
        session.master_fd = 10

        loop = asyncio.get_running_loop()
        with patch.object(loop, "run_in_executor", new=AsyncMock()) as run_in_executor:
            await session.set_terminal_size(80, 24)

        run_in_executor.assert_awaited_once_with(None, session._set_terminal_size, 80, 24)

    def test__set_terminal_size_calls_ioctl(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bash")
        session.master_fd = 10

        with patch("webterm.terminal_session.fcntl.ioctl") as mock_ioctl:
            session._set_terminal_size(80, 24)

        assert mock_ioctl.called

    @pytest.mark.asyncio
    async def test_start_creates_task_when_not_running(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bash")
        session.master_fd = 10

        session.run = AsyncMock()  # type: ignore[method-assign]

        connector = MagicMock()
        task = await session.start(connector)
        assert task is session._task
        assert session._connector is connector

        await task
        session.run.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_run_without_connector_still_closes(self, mock_poller):
        queue: asyncio.Queue[bytes | None] = asyncio.Queue()
        await queue.put(b"hello")
        await queue.put(None)

        mock_poller.add_file = MagicMock(return_value=queue)
        mock_poller.remove_file = MagicMock()

        session = TerminalSession(mock_poller, "sid", "bash")
        session.master_fd = 10
        session._connector = None

        with patch("webterm.terminal_session.os.close") as mock_close:
            await session.run()

        mock_poller.remove_file.assert_called_once_with(10)
        mock_close.assert_called_once_with(10)

    @pytest.mark.asyncio
    async def test_run_oserror_still_closes(self, mock_poller):
        queue = MagicMock()
        queue.get = AsyncMock(side_effect=OSError("boom"))

        mock_poller.add_file = MagicMock(return_value=queue)
        mock_poller.remove_file = MagicMock()

        session = TerminalSession(mock_poller, "sid", "bash")
        session.master_fd = 10
        session._connector = None

        with patch("webterm.terminal_session.os.close") as mock_close:
            await session.run()

        mock_poller.remove_file.assert_called_once_with(10)
        mock_close.assert_called_once_with(10)

    @pytest.mark.asyncio
    async def test_close_process_lookup_error_is_ignored(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bash")
        session.pid = 123

        with patch("webterm.terminal_session.os.kill", side_effect=ProcessLookupError()):
            await session.close()

    @pytest.mark.asyncio
    async def test_close_logs_warning_on_unexpected_exception(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bash")
        session.pid = 123

        with (
            patch("webterm.terminal_session.os.kill", side_effect=RuntimeError("x")),
            patch("webterm.terminal_session.log.warning") as warn,
        ):
            await session.close()

        assert warn.called

    @pytest.mark.asyncio
    async def test_wait_suppresses_cancelled_error(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bash")

        task = asyncio.create_task(asyncio.sleep(10))
        task.cancel()
        session._task = task

        await session.wait()

    def test_is_running_false_when_kill_fails(self, mock_poller):
        session = TerminalSession(mock_poller, "sid", "bash")
        session.master_fd = 10
        session._task = MagicMock()
        session.pid = 123

        with patch("webterm.terminal_session.os.kill", side_effect=OSError()):
            assert session.is_running() is False

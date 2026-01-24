from __future__ import annotations

import array
import asyncio
import contextlib
import fcntl
import logging
import os
import pty
import shlex
import signal
import termios
from collections import deque
from typing import TYPE_CHECKING

import pyte
import rich.repr
from importlib_metadata import version

from .session import Session, SessionConnector

if TYPE_CHECKING:
    from .poller import Poller
    from .types import Meta, SessionID

log = logging.getLogger("textual-web")

# Maximum bytes to keep in replay buffer for reconnection
REPLAY_BUFFER_SIZE = 64 * 1024  # 64KB

# Default screen size for pyte emulator
DEFAULT_SCREEN_WIDTH = 132
DEFAULT_SCREEN_HEIGHT = 45


@rich.repr.auto
class TerminalSession(Session):
    """A session that manages a terminal."""

    def __init__(
        self,
        poller: Poller,
        session_id: SessionID,
        command: str,
    ) -> None:
        self.poller = poller
        self.session_id = session_id
        self.command = command or os.environ.get("SHELL", "sh")
        self.master_fd: int | None = None
        self.pid: int | None = None
        self._task: asyncio.Task | None = None
        self._replay_buffer: deque[bytes] = deque()
        self._replay_buffer_size = 0
        self._replay_lock = asyncio.Lock()
        # pyte screen for accurate terminal state tracking
        self._screen = pyte.Screen(DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT)
        self._stream = pyte.Stream(self._screen)
        self._screen_lock = asyncio.Lock()
        # Track last known terminal size for reconnection
        self._last_width = DEFAULT_SCREEN_WIDTH
        self._last_height = DEFAULT_SCREEN_HEIGHT
        super().__init__()

    def __rich_repr__(self) -> rich.repr.Result:
        yield "session_id", self.session_id
        yield "command", self.command

    async def open(self, width: int = 80, height: int = 24) -> None:
        log.info("Opening terminal session %s with command: %s", self.session_id, self.command)
        # Track the initial size
        self._last_width = width
        self._last_height = height
        # Initialize pyte screen with the requested size (under lock to prevent races)
        async with self._screen_lock:
            self._screen = pyte.Screen(width, height)
            self._stream = pyte.Stream(self._screen)

        pid, master_fd = pty.fork()
        self.pid = pid
        self.master_fd = master_fd
        if pid == pty.CHILD:
            os.environ["TERM_PROGRAM"] = "textual-webterm"
            os.environ["TERM_PROGRAM_VERSION"] = version("textual-webterm")
            try:
                argv = shlex.split(self.command)
            except ValueError:
                os._exit(1)
            if not argv:
                os._exit(1)
            try:
                os.execvp(argv[0], argv)  ## Exits the app
            except OSError:
                os._exit(1)
        try:
            self._set_terminal_size(width, height)
        except OSError:
            # Clean up on failure
            os.close(master_fd)
            self.master_fd = None
            raise
        log.debug("Terminal session %s opened successfully", self.session_id)

    def _set_terminal_size(self, width: int, height: int) -> None:
        buf = array.array("h", [height, width, 0, 0])
        assert self.master_fd is not None
        fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, buf)

    async def set_terminal_size(self, width: int, height: int) -> None:
        # Track the size for reconnection
        self._last_width = width
        self._last_height = height
        # First resize the PTY (blocking call in executor)
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._set_terminal_size, width, height)
        # Then resize pyte screen to match (after PTY resize completes)
        async with self._screen_lock:
            self._screen.resize(height, width)

    async def force_redraw(self) -> None:
        """Force a terminal redraw by toggling the size.

        Briefly changes the terminal size then restores it, which forces
        applications like tmux to fully redraw all panes.
        """
        loop = asyncio.get_running_loop()
        # Briefly shrink by 1 column then restore - this forces a full redraw
        await loop.run_in_executor(
            None, self._set_terminal_size, self._last_width - 1, self._last_height
        )
        await loop.run_in_executor(
            None, self._set_terminal_size, self._last_width, self._last_height
        )

    async def _add_to_replay_buffer(self, data: bytes) -> None:
        """Add data to replay buffer, maintaining size limit."""
        async with self._replay_lock:
            self._replay_buffer.append(data)
            self._replay_buffer_size += len(data)
            while self._replay_buffer_size > REPLAY_BUFFER_SIZE and self._replay_buffer:
                old_data = self._replay_buffer.popleft()
                self._replay_buffer_size -= len(old_data)

    async def _update_screen(self, data: bytes) -> None:
        """Update the pyte screen with new terminal data."""
        async with self._screen_lock:
            try:
                text = data.decode("utf-8", errors="replace")
                self._stream.feed(text)
            except Exception:
                # Don't let pyte errors crash the session
                pass

    async def get_replay_buffer(self) -> bytes:
        """Get the contents of the replay buffer."""
        async with self._replay_lock:
            return b"".join(self._replay_buffer)

    async def get_screen_lines(self) -> list[str]:
        """Get the current screen state as a list of lines.

        Returns properly rendered terminal content with all escape sequences
        interpreted, suitable for screenshot generation.
        """
        async with self._screen_lock:
            return [line.rstrip() for line in self._screen.display]

    async def get_screen_state(self) -> tuple[int, int, list, bool]:
        """Get the current screen state including dimensions and character buffer.

        Returns:
            Tuple of (width, height, buffer, has_changes) where:
            - width: screen width in columns
            - height: screen height in rows
            - buffer: list of rows, each containing character data with styling
            - has_changes: True if screen has changed since last call
        """
        async with self._screen_lock:
            width = self._screen.columns
            height = self._screen.lines
            # Check if any rows are dirty (changed since last clear)
            has_changes = len(self._screen.dirty) > 0
            # Clear dirty set after checking
            self._screen.dirty.clear()
            # Copy the buffer data to avoid holding the lock
            buffer = []
            for row in range(height):
                row_data = []
                for col in range(width):
                    char = self._screen.buffer[row][col]
                    row_data.append({
                        "data": char.data if char.data else " ",
                        "fg": char.fg,
                        "bg": char.bg,
                        "bold": char.bold,
                        "italics": char.italics,
                        "underscore": char.underscore,
                        "reverse": char.reverse,
                    })
                buffer.append(row_data)
            return (width, height, buffer, has_changes)

    def update_connector(self, connector: SessionConnector) -> None:
        """Update the connector for reconnection without restarting the session."""
        self._connector = connector
        log.debug("Updated connector for session %s", self.session_id)

    async def start(self, connector: SessionConnector) -> asyncio.Task:
        self._connector = connector
        assert self.master_fd is not None
        if self._task is not None:
            # Already running, just update connector (handled by update_connector)
            return self._task
        self._task = asyncio.create_task(self.run())
        return self._task

    async def run(self) -> None:
        assert self.master_fd is not None
        queue = self.poller.add_file(self.master_fd)
        try:
            while True:
                data = await queue.get()
                if not data:
                    break
                # Store in replay buffer for reconnection
                await self._add_to_replay_buffer(data)
                # Update pyte screen state for screenshots
                await self._update_screen(data)
                # Send to current connector
                if self._connector:
                    await self._connector.on_data(data)
        except OSError:
            log.exception("error in terminal.run")
        finally:
            if self._connector:
                await self._connector.on_close()
            if self.master_fd is not None:
                fd = self.master_fd
                self.master_fd = None
                # Remove from poller first (while fd is still valid), then close
                self.poller.remove_file(fd)
                os.close(fd)

    async def send_bytes(self, data: bytes) -> bool:
        if self.master_fd is None:
            return False
        await self.poller.write(self.master_fd, data)
        return True

    async def send_meta(self, data: Meta) -> bool:
        return True

    async def close(self) -> None:
        if self.pid is not None:
            try:
                os.kill(self.pid, signal.SIGHUP)
            except ProcessLookupError:
                pass  # Process already gone
            except Exception as e:
                log.warning("Error closing terminal session %s: %s", self.session_id, e)

    async def wait(self) -> None:
        if self._task is not None:
            with contextlib.suppress(asyncio.CancelledError):
                await self._task

    def is_running(self) -> bool:
        """Check if the terminal session is still running."""
        if self.master_fd is None or self._task is None:
            return False
        # Check if process is actually alive
        if self.pid is not None:
            try:
                os.kill(self.pid, 0)  # Signal 0 checks existence
                return True
            except OSError:
                return False
        # pid is None means process not started or already exited
        return False

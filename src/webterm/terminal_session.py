from __future__ import annotations

import array
import asyncio
import contextlib
import fcntl
import logging
import os
import pty
import re
import shlex
import signal
import termios
from collections import deque
from typing import TYPE_CHECKING

import pyte
from importlib_metadata import PackageNotFoundError, version

from .alt_screen import AltScreen
from .session import Session, SessionConnector

if TYPE_CHECKING:
    from .poller import Poller
    from .types import Meta, SessionID

log = logging.getLogger("webterm")

# Maximum bytes to keep in replay buffer for reconnection
REPLAY_BUFFER_SIZE = 256 * 1024  # 256KB

# Default screen size for pyte emulator
DEFAULT_SCREEN_WIDTH = 132
DEFAULT_SCREEN_HEIGHT = 45

# Pattern to filter out terminal device attribute responses that cause display issues
# These are responses to DA1/DA2/DA3 queries that shouldn't be displayed as text
# Matches complete responses like:
#   \x1b[?1;10;0c  (DA1 - Primary Device Attributes)
#   \x1b[>1;10;0c  (DA2 - Secondary Device Attributes, sent by tmux)
#   \x1b[=1;0c     (DA3 - Tertiary Device Attributes)
DA_RESPONSE_PATTERN = re.compile(rb"\x1b\[[?>=][\d;]*c")

# Pattern to detect partial DA responses at end of data (incomplete escape sequence)
# Matches: \x1b, \x1b[, \x1b[?, \x1b[>, \x1b[=, \x1b[?1, \x1b[>1;10, etc.
DA_PARTIAL_PATTERN = re.compile(rb"\x1b(?:\[(?:[?>=][\d;]*)?)?$")

# Map C1 control sequences to 7-bit ESC equivalents for pyte compatibility
CSI_C1 = b"\x9b"
OSC_C1 = b"\x9d"
ST_C1 = b"\x9c"
DCS_C1 = b"\x90"
SOS_C1 = b"\x98"
PM_C1 = b"\x9e"
APC_C1 = b"\x9f"


def _normalize_c1_controls(data: bytes, utf8_buffer: bytes = b"") -> tuple[bytes, bytes]:
    if not data and not utf8_buffer:
        return b"", b""
    data = utf8_buffer + data
    out = bytearray()
    pending_utf8 = bytearray()
    expected_continuations = 0
    c1_map = {
        0x9B: b"\x1b[",
        0x9D: b"\x1b]",
        0x9C: b"\x1b\\",
        0x90: b"\x1bP",
        0x98: b"\x1bX",
        0x9E: b"\x1b^",
        0x9F: b"\x1b_",
    }
    idx = 0
    while idx < len(data):
        byte = data[idx]
        if expected_continuations:
            if 0x80 <= byte <= 0xBF:
                pending_utf8.append(byte)
                expected_continuations -= 1
                idx += 1
                if expected_continuations == 0:
                    out.extend(pending_utf8)
                    pending_utf8.clear()
                continue
            out.extend(pending_utf8)
            pending_utf8.clear()
            expected_continuations = 0
            continue
        if 0xC2 <= byte <= 0xDF:
            pending_utf8.append(byte)
            expected_continuations = 1
            idx += 1
            continue
        if 0xE0 <= byte <= 0xEF:
            pending_utf8.append(byte)
            expected_continuations = 2
            idx += 1
            continue
        if 0xF0 <= byte <= 0xF4:
            pending_utf8.append(byte)
            expected_continuations = 3
            idx += 1
            continue
        replacement = c1_map.get(byte)
        if replacement is not None:
            out.extend(replacement)
        else:
            out.append(byte)
        idx += 1
    if pending_utf8:
        return bytes(out), bytes(pending_utf8)
    return bytes(out), b""


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
        # pyte screen for accurate terminal state tracking (AltScreen for alternate buffer support)
        self._screen = AltScreen(DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT)
        self._stream = pyte.ByteStream(self._screen)
        self._screen_lock = asyncio.Lock()
        # Track last known terminal size for reconnection
        self._last_width = DEFAULT_SCREEN_WIDTH
        self._last_height = DEFAULT_SCREEN_HEIGHT
        # Change counter for reliable activity detection (monotonically increasing)
        self._change_counter = 0
        self._last_snapshot_counter = 0
        # Buffer for handling escape sequences split across reads
        self._escape_buffer = b""
        self._utf8_buffer = b""
        super().__init__()

    def __repr__(self) -> str:
        return f"TerminalSession(session_id={self.session_id!r}, command={self.command!r})"

    @staticmethod
    def _package_version() -> str:
        try:
            return version("webterm")
        except PackageNotFoundError:
            return "0.0.0"

    async def open(self, width: int = 80, height: int = 24) -> None:
        log.info("Opening terminal session %s with command: %s", self.session_id, self.command)
        # Track the initial size
        self._last_width = width
        self._last_height = height
        # Initialize pyte screen with the requested size (under lock to prevent races)
        async with self._screen_lock:
            self._screen = AltScreen(width, height)
            self._stream = pyte.ByteStream(self._screen)

        pid, master_fd = pty.fork()
        self.pid = pid
        self.master_fd = master_fd
        if pid == pty.CHILD:
            os.environ["TERM_PROGRAM"] = "webterm"
            os.environ["TERM_PROGRAM_VERSION"] = self._package_version()
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

    def _get_terminal_size(self) -> tuple[int, int]:
        """Get actual PTY size. Returns (width, height)."""
        assert self.master_fd is not None
        buf = array.array("h", [0, 0, 0, 0])
        fcntl.ioctl(self.master_fd, termios.TIOCGWINSZ, buf)
        return (buf[1], buf[0])  # cols, rows

    async def _sync_pyte_to_pty(self) -> None:
        """Sync pyte screen size to actual PTY size."""
        if self.master_fd is None:
            return
        loop = asyncio.get_running_loop()
        # Hold lock during PTY read to ensure consistency with concurrent set_terminal_size
        async with self._screen_lock:
            width, height = await loop.run_in_executor(None, self._get_terminal_size)
            if self._screen.columns != width or self._screen.lines != height:
                log.debug(
                    "Syncing pyte screen from %dx%d to %dx%d",
                    self._screen.columns,
                    self._screen.lines,
                    width,
                    height,
                )
                self._screen.resize(height, width)
                self._last_width = width
                self._last_height = height

    async def set_terminal_size(self, width: int, height: int) -> None:
        """Set terminal size."""
        loop = asyncio.get_running_loop()
        # Hold lock during PTY write to ensure consistency with concurrent _sync_pyte_to_pty
        async with self._screen_lock:
            self._last_width = width
            self._last_height = height
            await loop.run_in_executor(None, self._set_terminal_size, width, height)
            # Resize pyte screen to match
            self._screen.resize(height, width)
            # Increment change counter since resize changes screen content
            self._change_counter += 1

    async def force_redraw(self) -> None:
        """Force a terminal redraw by re-sending current size."""
        loop = asyncio.get_running_loop()
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
                normalized, self._utf8_buffer = _normalize_c1_controls(data, self._utf8_buffer)
                if not normalized:
                    return
                normalized = self._screen.expand_clear_sequences(normalized)
                self._stream.feed(normalized)
                # Increment change counter when screen is modified
                if self._screen.dirty:
                    self._change_counter += 1
            except Exception as exc:
                # Don't let pyte errors crash the session
                log.warning(
                    "Terminal screen update failed (%s): %s",
                    type(exc).__name__,
                    exc,
                )

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

    async def get_screen_has_changes(self) -> bool:
        """Check if the screen has changed since the last snapshot.

        This is a non-mutating read-only check that compares the change counter.
        """
        async with self._screen_lock:
            return self._change_counter > self._last_snapshot_counter

    async def get_screen_snapshot(self) -> tuple[int, int, list, bool]:
        """Get a read-only snapshot of the current screen state for screenshots.

        This method does NOT mutate terminal state - safe for dashboard screenshots.

        Returns:
            Tuple of (width, height, buffer, has_changes) where:
            - width: screen width in columns
            - height: screen height in rows
            - buffer: list of rows, each containing character data with styling
            - has_changes: True if screen has changed since last snapshot
        """
        async with self._screen_lock:
            width = self._screen.columns
            height = self._screen.lines
            has_changes = self._change_counter > self._last_snapshot_counter
            # Update the snapshot counter to track what we've seen
            self._last_snapshot_counter = self._change_counter
            # Snapshot buffer cells quickly to minimize lock hold time
            snapshot = [
                [self._screen.buffer[row][col] for col in range(width)] for row in range(height)
            ]

        buffer = []
        for row_data in snapshot:
            row_chars = []
            for char in row_data:
                row_chars.append(
                    {
                        "data": char.data if char.data else " ",
                        "fg": char.fg,
                        "bg": char.bg,
                        "bold": char.bold,
                        "italics": char.italics,
                        "underscore": char.underscore,
                        "reverse": char.reverse,
                    }
                )
            buffer.append(row_chars)
        return (width, height, buffer, has_changes)

    async def get_screen_state(self) -> tuple[int, int, list, bool]:
        """Get the current screen state including dimensions and character buffer.

        Note: This method syncs pyte to PTY size and clears dirty flags.
        For read-only screenshot access, use get_screen_snapshot() instead.

        Returns:
            Tuple of (width, height, buffer, has_changes) where:
            - width: screen width in columns
            - height: screen height in rows
            - buffer: list of rows, each containing character data with styling
            - has_changes: True if screen has changed since last call
        """
        # Sync pyte to actual PTY size before reading state
        await self._sync_pyte_to_pty()

        async with self._screen_lock:
            width = self._screen.columns
            height = self._screen.lines
            # Check if any rows are dirty (changed since last clear)
            has_changes = len(self._screen.dirty) > 0
            # Clear dirty set after checking
            self._screen.dirty.clear()
            # Snapshot buffer cells quickly to minimize lock hold time
            snapshot = [
                [self._screen.buffer[row][col] for col in range(width)] for row in range(height)
            ]

        buffer = []
        for row_data in snapshot:
            row_chars = []
            for char in row_data:
                row_chars.append(
                    {
                        "data": char.data if char.data else " ",
                        "fg": char.fg,
                        "bg": char.bg,
                        "bold": char.bold,
                        "italics": char.italics,
                        "underscore": char.underscore,
                        "reverse": char.reverse,
                    }
                )
            buffer.append(row_chars)
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

                # Prepend any buffered partial escape sequence from previous read
                if self._escape_buffer:
                    data = self._escape_buffer + data
                    self._escape_buffer = b""

                # Filter out complete DA1/DA2 responses (e.g., \x1b[?1;10;0c)
                data = DA_RESPONSE_PATTERN.sub(b"", data)
                if not data:
                    continue

                # Check for partial escape sequence at end that might be a DA response
                # Hold it back until we get more data to see if it completes
                match = DA_PARTIAL_PATTERN.search(data)
                if match:
                    self._escape_buffer = data[match.start() :]
                    data = data[: match.start()]
                    if not data:
                        continue

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
        fd = self.master_fd
        if fd is None:
            return False
        try:
            await self.poller.write(fd, data)
        except (KeyError, OSError):
            return False
        return True

    async def send_meta(self, data: Meta) -> bool:
        return True

    async def close(self) -> None:
        # Cancel the read task first to unblock any waiting queue.get()
        if self._task is not None and not self._task.done():
            self._task.cancel()
        if self.pid is not None:
            try:
                os.kill(self.pid, signal.SIGHUP)
            except ProcessLookupError:
                pass  # Process already gone
            except Exception as e:
                log.warning("Error closing terminal session %s: %s", self.session_id, e)

    async def wait(self, timeout: float = 2.0) -> None:
        if self._task is not None:
            with contextlib.suppress(asyncio.CancelledError, TimeoutError):
                await asyncio.wait_for(asyncio.shield(self._task), timeout=timeout)

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

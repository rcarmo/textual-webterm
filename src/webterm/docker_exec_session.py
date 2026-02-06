"""Docker exec-based terminal session using Docker API and socket."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import re
import socket
from collections import deque
from dataclasses import dataclass
from typing import TYPE_CHECKING

import pyte

from .alt_screen import AltScreen
from .docker_stats import get_docker_socket_path
from .session import Session, SessionConnector

if TYPE_CHECKING:
    from .poller import Poller
    from .types import Meta, SessionID


log = logging.getLogger("webterm")

REPLAY_BUFFER_SIZE = 256 * 1024  # 256KB
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
# These need to be held back until more data arrives to see if they complete
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


@dataclass(frozen=True)
class DockerExecSpec:
    container: str
    command: list[str]
    user: str | None = None


class DockerExecSession(Session):
    """Terminal session backed by Docker exec API."""

    def __init__(
        self,
        poller: Poller,
        session_id: SessionID,
        exec_spec: DockerExecSpec,
        socket_path: str | None = None,
    ) -> None:
        self.poller = poller
        self.session_id = session_id
        self.exec_spec = exec_spec
        self._socket_path = socket_path or get_docker_socket_path()
        self.master_fd: int | None = None
        self._sock: socket.socket | None = None
        self._task: asyncio.Task | None = None
        self._connector = SessionConnector()
        self._replay_buffer: deque[bytes] = deque()
        self._replay_buffer_size = 0
        self._replay_lock = asyncio.Lock()
        self._screen = AltScreen(DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT)
        self._stream = pyte.ByteStream(self._screen)
        self._screen_lock = asyncio.Lock()
        self._last_width = DEFAULT_SCREEN_WIDTH
        self._last_height = DEFAULT_SCREEN_HEIGHT
        self._change_counter = 0
        self._last_snapshot_counter = 0
        self._exec_id: str | None = None
        self._pending_output = b""
        # Buffer for handling escape sequences split across socket reads
        self._escape_buffer = b""
        self._utf8_buffer = b""

    def __repr__(self) -> str:
        return (
            "DockerExecSession(session_id="
            f"{self.session_id!r}, container={self.exec_spec.container!r})"
        )

    def _read_http_response(self, sock: socket.socket) -> tuple[int, dict, bytes]:
        sock.settimeout(10.0)
        data = b""
        while b"\r\n\r\n" not in data:
            chunk = sock.recv(4096)
            if not chunk:
                break
            data += chunk
        if b"\r\n\r\n" not in data:
            return 0, {}, b""
        header_bytes, body = data.split(b"\r\n\r\n", 1)
        headers = header_bytes.decode("utf-8", errors="replace").split("\r\n")
        status_line = headers[0] if headers else ""
        status = 0
        if status_line:
            parts = status_line.split()
            if len(parts) >= 2:
                try:
                    status = int(parts[1])
                except ValueError:
                    status = 0
        header_map: dict[str, str] = {}
        for header in headers[1:]:
            if ":" not in header:
                continue
            key, value = header.split(":", 1)
            header_map[key.strip().lower()] = value.strip()
        if "content-length" in header_map:
            try:
                length = int(header_map["content-length"])
            except ValueError:
                length = 0
            remaining = length - len(body)
            while remaining > 0:
                chunk = sock.recv(min(4096, remaining))
                if not chunk:
                    break
                body += chunk
                remaining -= len(chunk)
        return status, header_map, body

    def _request_json(self, method: str, path: str, payload: dict | None = None) -> dict:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        try:
            sock.connect(self._socket_path)
            body = json.dumps(payload or {}).encode("utf-8") if payload is not None else b""
            headers = [
                f"{method} {path} HTTP/1.1",
                "Host: localhost",
            ]
            if payload is not None:
                headers.append("Content-Type: application/json")
                headers.append(f"Content-Length: {len(body)}")
            headers.append("")
            headers.append("")
            request = "\r\n".join(headers).encode("utf-8") + body
            sock.sendall(request)
            status, _headers, body_bytes = self._read_http_response(sock)
        finally:
            sock.close()
        if status < 200 or status >= 300:
            detail = body_bytes.decode("utf-8", errors="replace")
            raise RuntimeError(f"Docker API request failed ({status}): {detail}")
        if not body_bytes:
            return {}
        try:
            return json.loads(body_bytes.decode("utf-8", errors="replace"))
        except json.JSONDecodeError as exc:
            raise RuntimeError("Docker API returned invalid JSON") from exc

    def _create_exec(self) -> str:
        payload = {
            "AttachStdin": True,
            "AttachStdout": True,
            "AttachStderr": True,
            "Tty": True,
            "Cmd": self.exec_spec.command,
        }
        if self.exec_spec.user:
            payload["User"] = self.exec_spec.user
        response = self._request_json(
            "POST", f"/containers/{self.exec_spec.container}/exec", payload
        )
        exec_id = response.get("Id")
        if not isinstance(exec_id, str) or not exec_id:
            raise RuntimeError("Docker API did not return exec ID")
        return exec_id

    def _start_exec_socket(self, exec_id: str) -> socket.socket:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        try:
            sock.connect(self._socket_path)
            payload = json.dumps({"Detach": False, "Tty": True}).encode("utf-8")
            headers = [
                f"POST /exec/{exec_id}/start HTTP/1.1",
                "Host: localhost",
                "Content-Type: application/json",
                f"Content-Length: {len(payload)}",
                "Connection: Upgrade",
                "Upgrade: tcp",
                "",
                "",
            ]
            sock.sendall("\r\n".join(headers).encode("utf-8") + payload)
            status, _headers, body = self._read_http_response(sock)
            if status not in (101,) and (status < 200 or status >= 300):
                detail = body.decode("utf-8", errors="replace")
                raise RuntimeError(f"Docker API exec start failed ({status}): {detail}")
            # Don't save body from HTTP upgrade - it contains protocol handshake data,
            # not real terminal output (e.g., device attribute responses like "\x1b[?1;10;0c")
            sock.settimeout(None)
            return sock
        except Exception:
            sock.close()
            raise

    def _resize_exec(self, width: int, height: int) -> None:
        assert self._exec_id is not None
        path = f"/exec/{self._exec_id}/resize?h={height}&w={width}"
        self._request_json("POST", path, None)

    async def open(self, width: int = 80, height: int = 24) -> None:
        log.info(
            "Opening Docker exec session %s for %s",
            self.session_id,
            self.exec_spec.container,
        )
        self._last_width = width
        self._last_height = height
        async with self._screen_lock:
            self._screen = AltScreen(width, height)
            self._stream = pyte.ByteStream(self._screen)
        exec_id = await asyncio.to_thread(self._create_exec)
        self._exec_id = exec_id
        self._sock = await asyncio.to_thread(self._start_exec_socket, exec_id)
        self.master_fd = self._sock.fileno()
        await asyncio.to_thread(self._resize_exec, width, height)

    async def set_terminal_size(self, width: int, height: int) -> None:
        self._last_width = width
        self._last_height = height
        async with self._screen_lock:
            self._screen.resize(height, width)
            self._change_counter += 1
        if self._exec_id:
            await asyncio.to_thread(self._resize_exec, width, height)

    async def force_redraw(self) -> None:
        await self.set_terminal_size(self._last_width, self._last_height)

    async def _add_to_replay_buffer(self, data: bytes) -> None:
        async with self._replay_lock:
            self._replay_buffer.append(data)
            self._replay_buffer_size += len(data)
            while self._replay_buffer_size > REPLAY_BUFFER_SIZE and self._replay_buffer:
                old = self._replay_buffer.popleft()
                self._replay_buffer_size -= len(old)

    async def _update_screen(self, data: bytes) -> None:
        async with self._screen_lock:
            try:
                normalized, self._utf8_buffer = _normalize_c1_controls(data, self._utf8_buffer)
                if not normalized:
                    return
                normalized = self._screen.expand_clear_sequences(normalized)
                self._stream.feed(normalized)
                if self._screen.dirty:
                    self._change_counter += 1
            except Exception as exc:
                log.warning(
                    "Docker exec screen update failed (%s): %s",
                    type(exc).__name__,
                    exc,
                )

    async def _drain_pending_output(self) -> None:
        if not self._pending_output:
            return
        data = self._pending_output
        self._pending_output = b""
        await self._add_to_replay_buffer(data)
        await self._update_screen(data)
        if self._connector:
            await self._connector.on_data(data)

    async def get_replay_buffer(self) -> bytes:
        async with self._replay_lock:
            return b"".join(self._replay_buffer)

    async def get_screen_lines(self) -> list[str]:
        async with self._screen_lock:
            return [line.rstrip() for line in self._screen.display]

    async def get_screen_snapshot(self) -> tuple[int, int, list, bool]:
        async with self._screen_lock:
            width = self._screen.columns
            height = self._screen.lines
            has_changes = self._change_counter > self._last_snapshot_counter
            self._last_snapshot_counter = self._change_counter
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
        self._connector = connector

    async def start(self, connector: SessionConnector) -> asyncio.Task:
        self._connector = connector
        if self.master_fd is None:
            raise RuntimeError("Docker exec session not opened")
        if self._task is not None:
            return self._task
        self._task = asyncio.create_task(self.run())
        return self._task

    async def run(self) -> None:
        assert self.master_fd is not None
        queue = self.poller.add_file(self.master_fd)
        try:
            await self._drain_pending_output()
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

                await self._add_to_replay_buffer(data)
                await self._update_screen(data)
                if self._connector:
                    await self._connector.on_data(data)
        except OSError:
            log.exception("error in docker exec session run")
        finally:
            if self._connector:
                await self._connector.on_close()
            if self.master_fd is not None:
                fd = self.master_fd
                self.master_fd = None
                self.poller.remove_file(fd)
            if self._sock is not None:
                self._sock.close()
                self._sock = None

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
        if self._task is not None and not self._task.done():
            self._task.cancel()
        if self._sock is not None:
            self._sock.close()
            self._sock = None

    async def wait(self, timeout: float = 2.0) -> None:
        if self._task is not None:
            with contextlib.suppress(asyncio.CancelledError, TimeoutError):
                await asyncio.wait_for(asyncio.shield(self._task), timeout=timeout)

    def is_running(self) -> bool:
        return not (self.master_fd is None or self._task is None)

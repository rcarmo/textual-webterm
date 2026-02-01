"""Tests for docker_exec_session module."""

from __future__ import annotations

import asyncio
from collections import deque
from unittest.mock import AsyncMock, MagicMock, call, patch

import pytest

from webterm.docker_exec_session import (
    REPLAY_BUFFER_SIZE,
    DockerExecSession,
    DockerExecSpec,
)


class FakeSocket:
    """Simple fake socket for unit tests."""

    def __init__(self, recv_chunks: list[bytes] | None = None) -> None:
        self._recv_chunks = deque(recv_chunks or [])
        self.sent = b""
        self.connected_path: str | None = None
        self.timeout: float | None = None
        self.closed = False

    def settimeout(self, timeout: float | None) -> None:
        self.timeout = timeout

    def connect(self, path: str) -> None:
        self.connected_path = path

    def sendall(self, data: bytes) -> None:
        self.sent += data

    def recv(self, size: int) -> bytes:
        if not self._recv_chunks:
            return b""
        chunk = self._recv_chunks.popleft()
        if len(chunk) > size:
            self._recv_chunks.appendleft(chunk[size:])
            return chunk[:size]
        return chunk

    def close(self) -> None:
        self.closed = True


class FakePoller:
    """Minimal fake poller for unit tests."""

    def __init__(self, queue: asyncio.Queue[bytes | None]) -> None:
        self.queue = queue
        self.added: int | None = None
        self.removed: int | None = None

    def add_file(self, file_descriptor: int) -> asyncio.Queue[bytes | None]:
        self.added = file_descriptor
        return self.queue

    def remove_file(self, file_descriptor: int) -> None:
        self.removed = file_descriptor


def build_response(status: int, body: bytes, headers: dict[str, str] | None = None) -> bytes:
    header_map = {"Content-Length": str(len(body))}
    if headers:
        header_map.update(headers)
    lines = [f"HTTP/1.1 {status} Status"] + [f"{k}: {v}" for k, v in header_map.items()]
    return ("\r\n".join(lines) + "\r\n\r\n").encode("utf-8") + body


@pytest.fixture
def docker_exec_session(mock_poller) -> DockerExecSession:
    return DockerExecSession(
        mock_poller,
        "sid",
        DockerExecSpec(container="container", command=["/bin/sh"]),
        socket_path="/tmp/docker.sock",
    )


def test_read_http_response_reads_full_body(docker_exec_session):
    header = b"HTTP/1.1 200 OK\r\nContent-Length: 11\r\nX-Test: value\r\n\r\nhello "
    fake_socket = FakeSocket([header, b"world"])
    status, headers, body = docker_exec_session._read_http_response(fake_socket)
    assert status == 200
    assert headers["content-length"] == "11"
    assert headers["x-test"] == "value"
    assert body == b"hello world"


def test_read_http_response_incomplete_headers_returns_empty(docker_exec_session):
    fake_socket = FakeSocket([b"HTTP/1.1 200 OK\r\n"])
    status, headers, body = docker_exec_session._read_http_response(fake_socket)
    assert status == 0
    assert headers == {}
    assert body == b""


def test_request_json_success_sends_payload(docker_exec_session, monkeypatch):
    response = build_response(200, b'{"ok": true}')
    fake_socket = FakeSocket([response])

    def socket_factory(*_args, **_kwargs):
        return fake_socket

    monkeypatch.setattr("socket.socket", socket_factory)

    result = docker_exec_session._request_json("POST", "/test", {"alpha": "beta"})
    assert result == {"ok": True}
    assert fake_socket.connected_path == "/tmp/docker.sock"
    request = fake_socket.sent.decode("utf-8")
    assert "POST /test HTTP/1.1" in request
    assert "Content-Type: application/json" in request
    payload = '{"alpha": "beta"}'
    assert f"Content-Length: {len(payload)}" in request
    assert request.endswith(payload)
    assert fake_socket.closed is True


def test_request_json_error_raises(docker_exec_session, monkeypatch):
    response = build_response(404, b"nope")
    fake_socket = FakeSocket([response])

    def socket_factory(*_args, **_kwargs):
        return fake_socket

    monkeypatch.setattr("socket.socket", socket_factory)

    with pytest.raises(RuntimeError, match=r"Docker API request failed \(404\)"):
        docker_exec_session._request_json("GET", "/missing", None)
    assert fake_socket.closed is True


def test_start_exec_socket_error_status_closes_socket(docker_exec_session, monkeypatch):
    response = build_response(500, b"boom")
    fake_socket = FakeSocket([response])

    def socket_factory(*_args, **_kwargs):
        return fake_socket

    monkeypatch.setattr("socket.socket", socket_factory)

    with pytest.raises(RuntimeError, match=r"Docker API exec start failed"):
        docker_exec_session._start_exec_socket("exec-id")
    assert fake_socket.closed is True


def test_resize_exec_calls_request_json(docker_exec_session):
    docker_exec_session._exec_id = "exec-id"
    docker_exec_session._request_json = MagicMock()  # type: ignore[method-assign]

    docker_exec_session._resize_exec(100, 40)

    docker_exec_session._request_json.assert_called_once_with(
        "POST",
        "/exec/exec-id/resize?h=40&w=100",
        None,
    )


@pytest.mark.asyncio
async def test_update_screen_increments_change_counter(docker_exec_session):
    initial_counter = docker_exec_session._change_counter
    await docker_exec_session._update_screen(b"Hello\r\n")
    assert docker_exec_session._change_counter > initial_counter


@pytest.mark.asyncio
async def test_update_screen_logs_on_exception(docker_exec_session):
    with (
        patch.object(docker_exec_session._stream, "feed", side_effect=RuntimeError("boom")),
        patch("webterm.docker_exec_session.log.warning") as warn,
    ):
        await docker_exec_session._update_screen(b"\xff")
    assert warn.called


@pytest.mark.asyncio
async def test_update_screen_preserves_utf8_bytes_with_c1_values(docker_exec_session):
    await docker_exec_session._update_screen("✓ ok\r\n".encode())
    lines = await docker_exec_session.get_screen_lines()
    assert "✓ ok" in lines[0]


@pytest.mark.asyncio
async def test_add_to_replay_buffer_trims_old_data(docker_exec_session):
    first_chunk = b"a" * (REPLAY_BUFFER_SIZE - 1)
    second_chunk = b"b" * 10

    await docker_exec_session._add_to_replay_buffer(first_chunk)
    await docker_exec_session._add_to_replay_buffer(second_chunk)

    assert docker_exec_session._replay_buffer_size == len(second_chunk)
    assert await docker_exec_session.get_replay_buffer() == second_chunk


@pytest.mark.asyncio
async def test_run_filters_da_responses():
    queue: asyncio.Queue[bytes | None] = asyncio.Queue()
    await queue.put(b"hello\x1b[?1;10;0cworld")
    await queue.put(b"done")
    await queue.put(None)

    poller = FakePoller(queue)
    session = DockerExecSession(
        poller,
        "sid",
        DockerExecSpec(container="container", command=["/bin/sh"]),
        socket_path="/tmp/docker.sock",
    )
    session.master_fd = 10
    fake_socket = FakeSocket([])
    session._sock = fake_socket

    connector = MagicMock()
    connector.on_data = AsyncMock()
    connector.on_close = AsyncMock()
    session._connector = connector

    with (
        patch.object(session, "_add_to_replay_buffer", new=AsyncMock()) as add_buffer,
        patch.object(session, "_update_screen", new=AsyncMock()) as update_screen,
    ):
        await session.run()

    connector.on_data.assert_has_awaits([call(b"helloworld"), call(b"done")])
    add_buffer.assert_has_awaits([call(b"helloworld"), call(b"done")])
    update_screen.assert_has_awaits([call(b"helloworld"), call(b"done")])
    connector.on_close.assert_awaited_once()
    assert poller.removed == 10
    assert fake_socket.closed is True
    assert session.master_fd is None
    assert session._escape_buffer == b""


@pytest.mark.asyncio
async def test_run_handles_partial_da_sequences():
    queue: asyncio.Queue[bytes | None] = asyncio.Queue()
    await queue.put(b"hi\x1b[?1")
    await queue.put(b"0;0cbye")
    await queue.put(None)

    poller = FakePoller(queue)
    session = DockerExecSession(
        poller,
        "sid",
        DockerExecSpec(container="container", command=["/bin/sh"]),
        socket_path="/tmp/docker.sock",
    )
    session.master_fd = 10
    fake_socket = FakeSocket([])
    session._sock = fake_socket

    connector = MagicMock()
    connector.on_data = AsyncMock()
    connector.on_close = AsyncMock()
    session._connector = connector

    with (
        patch.object(session, "_add_to_replay_buffer", new=AsyncMock()) as add_buffer,
        patch.object(session, "_update_screen", new=AsyncMock()) as update_screen,
    ):
        await session.run()

    connector.on_data.assert_has_awaits([call(b"hi"), call(b"bye")])
    add_buffer.assert_has_awaits([call(b"hi"), call(b"bye")])
    update_screen.assert_has_awaits([call(b"hi"), call(b"bye")])
    connector.on_close.assert_awaited_once()
    assert poller.removed == 10
    assert fake_socket.closed is True
    assert session._escape_buffer == b""

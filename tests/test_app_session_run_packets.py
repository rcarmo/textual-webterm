import asyncio
import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from textual_webterm.app_session import AppSession


@pytest.fixture
def mock_connector():
    connector = MagicMock()
    connector.on_data = AsyncMock()
    connector.on_meta = AsyncMock()
    connector.on_binary_encoded_message = AsyncMock()
    connector.on_close = AsyncMock()
    return connector


@pytest.mark.asyncio
async def test_run_decodes_packets_and_forwards(tmp_path, mock_connector, monkeypatch):
    from textual_webterm import app_session

    session = AppSession(tmp_path, "echo test", "sid")
    session._connector = mock_connector
    session.start_time = 0.0

    stdin = MagicMock()
    stdin.write = MagicMock()
    stdin.drain = AsyncMock()

    stdout = MagicMock()
    # Provide a second empty line so AppSession's readiness loop terminates cleanly.
    stdout.readline = AsyncMock(side_effect=[b"__GANGLION__\n", b""])

    payload_data = b"hello"
    payload_meta = json.dumps({"type": "custom", "x": 1}).encode("utf-8")
    payload_meta_exit = json.dumps({"type": "exit"}).encode("utf-8")
    payload_bin = b"\x00\x01"

    read_parts = [
        b"D",
        len(payload_data).to_bytes(4, "big"),
        payload_data,
        b"M",
        len(payload_meta).to_bytes(4, "big"),
        payload_meta,
        b"M",
        len(payload_meta_exit).to_bytes(4, "big"),
        payload_meta_exit,
        b"P",
        len(payload_bin).to_bytes(4, "big"),
        payload_bin,
    ]

    async def readexactly(n: int) -> bytes:
        await asyncio.sleep(0)
        if not read_parts:
            raise asyncio.IncompleteReadError(partial=b"", expected=n)
        part = read_parts.pop(0)
        assert len(part) == n
        return part

    stdout.readexactly = AsyncMock(side_effect=readexactly)

    stderr = MagicMock()
    stderr.read = AsyncMock(return_value=b"")

    session._process = MagicMock(stdin=stdin, stdout=stdout, stderr=stderr, returncode=0)
    monkeypatch.setattr(app_session.constants, "DEBUG", False)

    await session.run()

    mock_connector.on_data.assert_awaited_once_with(payload_data)
    mock_connector.on_meta.assert_awaited_once_with({"type": "custom", "x": 1})
    mock_connector.on_binary_encoded_message.assert_awaited_once_with(payload_bin)
    assert stdin.write.called
    mock_connector.on_close.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_payload_too_large_breaks_loop(tmp_path, mock_connector, monkeypatch):
    from textual_webterm import app_session

    session = AppSession(tmp_path, "echo test", "sid")
    session._connector = mock_connector
    session.start_time = 0.0

    stdin = MagicMock()
    stdin.write = MagicMock()
    stdin.drain = AsyncMock()

    stdout = MagicMock()
    stdout.readline = AsyncMock(side_effect=[b"__GANGLION__\n", b""])

    async def readexactly(n: int) -> bytes:
        await asyncio.sleep(0)
        if n == 1:
            return b"D"
        if n == 4:
            return (app_session.MAX_PAYLOAD_SIZE + 1).to_bytes(4, "big")
        raise asyncio.IncompleteReadError(partial=b"", expected=n)

    stdout.readexactly = AsyncMock(side_effect=readexactly)

    stderr = MagicMock()
    stderr.read = AsyncMock(return_value=b"")

    session._process = MagicMock(stdin=stdin, stdout=stdout, stderr=stderr, returncode=0)
    monkeypatch.setattr(app_session.constants, "DEBUG", False)

    await session.run()
    mock_connector.on_close.assert_awaited_once()

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from webterm.config import Config
from webterm.local_server import LocalServer, WS_SEND_TIMEOUT


@pytest.mark.asyncio
async def test_ws_sender_flushes_queue():
    server = LocalServer(config_path="./", config=Config(apps=[]), host="localhost", port=8080)
    ws = MagicMock()
    ws.send_bytes = AsyncMock()
    ws.closed = False
    ws.close = AsyncMock()

    queue: asyncio.Queue[bytes | None] = asyncio.Queue()
    sender_task = asyncio.create_task(server._ws_sender("rk", ws, queue))

    await queue.put(b"hello")
    await queue.put(b"world")
    await queue.put(None)

    await sender_task
    ws.send_bytes.assert_any_await(b"hello")
    ws.send_bytes.assert_any_await(b"world")


@pytest.mark.asyncio
async def test_ws_sender_timeout_closes():
    server = LocalServer(config_path="./", config=Config(apps=[]), host="localhost", port=8080)
    ws = MagicMock()
    ws.closed = False
    ws.close = AsyncMock()

    async def slow_send(_data):
        await asyncio.sleep(WS_SEND_TIMEOUT * 2)

    ws.send_bytes = AsyncMock(side_effect=slow_send)

    queue: asyncio.Queue[bytes | None] = asyncio.Queue()
    sender_task = asyncio.create_task(server._ws_sender("rk", ws, queue))

    await queue.put(b"slow")
    await sender_task

    ws.close.assert_awaited_once()


@pytest.mark.asyncio
async def test_enqueue_ws_data_drops_oldest_when_full():
    server = LocalServer(config_path="./", config=Config(apps=[]), host="localhost", port=8080)
    queue: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=1)
    server._ws_send_queues["rk"] = queue

    queue.put_nowait(b"first")
    server._enqueue_ws_data("rk", b"second")

    assert queue.qsize() == 1
    assert await queue.get() == b"second"

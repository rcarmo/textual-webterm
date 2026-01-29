from __future__ import annotations

import json
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock

import pytest
from aiohttp import WSMsgType, web
from aiohttp.test_utils import TestClient, TestServer

from webterm.config import App, Config
from webterm.local_server import LocalServer
from webterm.types import RouteKey, SessionID

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

async def _make_client(server: LocalServer) -> TestClient:
    app = web.Application()
    app.add_routes(server._build_routes())
    test_server = TestServer(app)
    client = TestClient(test_server)
    await client.start_server()
    return client


@pytest.fixture
def server_factory(tmp_path):
    counter = {"i": 0}

    def _make(apps: list[App] | None = None) -> LocalServer:
        counter["i"] += 1
        config = Config(
            apps=apps
            or [App(name="Test", slug="test", path=".", command="echo test", terminal=True)]
        )
        config_file = tmp_path / f"config-{counter['i']}.toml"
        config_file.write_text("")
        return LocalServer(config_path=str(config_file), config=config)

    return _make


@pytest.fixture
def client_factory():
    @asynccontextmanager
    async def _factory(server: LocalServer) -> AsyncIterator[TestClient]:
        client = await _make_client(server)
        try:
            yield client
        finally:
            await client.close()

    return _factory


@pytest.mark.asyncio
async def test_websocket_creates_session_on_resize(tmp_path):
    config = Config(
        apps=[App(name="Test", slug="test", path=".", command="echo test", terminal=True)]
    )
    config_file = tmp_path / "config.toml"
    config_file.write_text("")
    server = LocalServer(config_path=str(config_file), config=config)

    # Avoid spawning any real processes.
    created = {"args": None}

    async def fake_create(route_key: str, width: int, height: int) -> None:
        created["args"] = (route_key, width, height)

    server._create_terminal_session = fake_create  # type: ignore[method-assign]

    client = await _make_client(server)
    try:
        ws = await client.ws_connect("/ws/test")
        await ws.send_str(json.dumps(["resize", {"width": 90, "height": 25}]))
        await ws.close()
    finally:
        await client.close()

    assert created["args"] == ("test", 90, 25)
    # Reconnect to an existing session should reuse it and send replay buffer

    class DummySession:
        def is_running(self):
            return True

    server.session_manager.routes["test"] = "sid"
    server.session_manager.sessions["sid"] = DummySession()

    # Replay buffer should be sent on reconnect
    replay_session = server.session_manager.sessions["sid"]
    replay_session.get_replay_buffer = AsyncMock(return_value=b"replay")

    client = await _make_client(server)
    try:
        ws = await client.ws_connect("/ws/test")
        msg = await ws.receive(timeout=1)
        assert msg.type == WSMsgType.BINARY
        assert msg.data == b"replay"
        await ws.close()
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_websocket_ping_pong(tmp_path):
    config = Config(
        apps=[App(name="Test", slug="test", path=".", command="echo test", terminal=True)]
    )
    config_file = tmp_path / "config.toml"
    config_file.write_text("")
    server = LocalServer(config_path=str(config_file), config=config)

    client = await _make_client(server)
    try:
        ws = await client.ws_connect("/ws/test")
        await ws.send_str(json.dumps(["ping", "123"]))

        msg = await ws.receive(timeout=1)
        assert msg.type == WSMsgType.TEXT
        assert json.loads(msg.data) == ["pong", "123"]

        await ws.close()
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_websocket_ignores_invalid_envelopes(tmp_path):
    config = Config(
        apps=[App(name="Test", slug="test", path=".", command="echo test", terminal=True)]
    )
    config_file = tmp_path / "config.toml"
    config_file.write_text("")
    server = LocalServer(config_path=str(config_file), config=config)

    client = await _make_client(server)
    try:
        ws = await client.ws_connect("/ws/test")
        await ws.send_str("not json")
        await ws.send_str(json.dumps({"not": "a list"}))
        await ws.send_str(json.dumps([]))
        await ws.close()
    finally:
        await client.close()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("payload", "is_binary"),
    [
        ("not json", False),
        (json.dumps({"not": "a list"}), False),
        (json.dumps([]), False),
        (b"\x00\x01\x02", True),
    ],
)
async def test_websocket_invalid_payloads_keep_connection(
    server_factory, client_factory, payload, is_binary
):
    server = server_factory()
    async with client_factory(server) as client:
        ws = await client.ws_connect("/ws/test")
        if is_binary:
            await ws.send_bytes(payload)
        else:
            await ws.send_str(payload)
        await ws.send_str(json.dumps(["ping", "ok"]))

        msg = await ws.receive(timeout=1)
        assert msg.type == WSMsgType.TEXT
        assert json.loads(msg.data) == ["pong", "ok"]
        await ws.close()


@pytest.mark.asyncio
async def test_websocket_clears_stale_session(server_factory, client_factory):
    server = server_factory()

    class DummySession:
        def is_running(self):
            return False

    session_id = SessionID("sid")
    route_key = RouteKey("test")
    server.session_manager.routes[route_key] = session_id
    server.session_manager.sessions[session_id] = DummySession()

    async with client_factory(server) as client:
        ws = await client.ws_connect("/ws/test")
        assert server.session_manager.get_session(session_id) is None
        assert server.session_manager.routes.get(route_key) is None
        await ws.close()

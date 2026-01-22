from __future__ import annotations

import json

import pytest
from aiohttp import WSMsgType, web
from aiohttp.test_utils import TestClient, TestServer

from textual_webterm.config import App, Config
from textual_webterm.local_server import LocalServer


async def _make_client(server: LocalServer) -> TestClient:
    app = web.Application()
    app.add_routes(server._build_routes())
    test_server = TestServer(app)
    client = TestClient(test_server)
    await client.start_server()
    return client


@pytest.mark.asyncio
async def test_websocket_creates_session_on_resize(tmp_path):
    config = Config(apps=[App(name="Test", slug="test", path=".", command="echo test", terminal=True)])
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


@pytest.mark.asyncio
async def test_websocket_ping_pong(tmp_path):
    config = Config(apps=[App(name="Test", slug="test", path=".", command="echo test", terminal=True)])
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
    config = Config(apps=[App(name="Test", slug="test", path=".", command="echo test", terminal=True)])
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

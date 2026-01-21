"""Pytest configuration and fixtures for textual-webterm tests."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

import pytest

from textual_webterm.config import App, Config
from textual_webterm.local_server import LocalServer
from textual_webterm.poller import Poller
from textual_webterm.session_manager import SessionManager

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator, Generator
    from pathlib import Path


@pytest.fixture
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def sample_terminal_app() -> App:
    """Create a sample terminal app configuration."""
    return App(
        name="Test Terminal",
        slug="test-terminal",
        terminal=True,
        command="echo hello",
    )


@pytest.fixture
def sample_config(sample_terminal_app: App) -> Config:
    """Create a sample configuration with a terminal app."""
    return Config(apps=[sample_terminal_app])


@pytest.fixture
def tmp_config_path(tmp_path: Path) -> Path:
    """Create a temporary config path."""
    return tmp_path / "config"


@pytest.fixture
def poller() -> Poller:
    """Create a Poller instance."""
    return Poller()


@pytest.fixture
def session_manager(poller: Poller, tmp_path: Path, sample_terminal_app: App) -> SessionManager:
    """Create a SessionManager instance."""
    return SessionManager(poller, tmp_path, [sample_terminal_app])


@pytest.fixture
async def local_server(
    tmp_config_path: Path, sample_config: Config
) -> AsyncGenerator[LocalServer, None]:
    """Create a LocalServer instance for testing."""
    server = LocalServer(
        str(tmp_config_path),
        sample_config,
        host="127.0.0.1",
        port=0,  # Use random available port
    )
    yield server
    # Cleanup
    server.force_exit()

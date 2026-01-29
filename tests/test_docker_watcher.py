"""Tests for docker_watcher module."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from webterm.docker_watcher import (
    AUTO_COMMAND_SENTINEL,
    LABEL_NAME,
    THEME_LABEL,
    DockerWatcher,
)


@pytest.fixture
def session_manager():
    manager = MagicMock()
    manager.apps_by_slug = {}
    manager.apps = []
    manager.get_session_by_route_key.return_value = None
    return manager


@pytest.fixture
def docker_watcher(session_manager):
    return DockerWatcher(session_manager)


class TestDockerWatcher:
    """Tests for DockerWatcher class."""

    def test_container_to_slug(self, docker_watcher):
        """Test slug generation from container names."""
        # Test basic name
        container = {"Names": ["/my-container"]}
        assert docker_watcher._container_to_slug(container) == "my-container"

        # Test with underscores
        container = {"Names": ["/my_container_name"]}
        assert docker_watcher._container_to_slug(container) == "my-container-name"

        # Test with dots
        container = {"Names": ["/service.name"]}
        assert docker_watcher._container_to_slug(container) == "service-name"

        # Test fallback to ID
        container = {"Id": "abc123def456"}
        assert docker_watcher._container_to_slug(container) == "abc123def456"

    def test_get_container_name(self, docker_watcher):
        """Test extracting container name."""
        container = {"Names": ["/my-container"]}
        assert docker_watcher._get_container_name(container) == "my-container"

        container = {"Names": []}
        container["Id"] = "abc123def456789"
        assert docker_watcher._get_container_name(container) == "abc123def456"

    def test_get_container_command_auto(self, docker_watcher):
        """Test command generation when label is 'auto'."""
        container = {"Names": ["/my-container"], "Labels": {LABEL_NAME: "auto"}}
        assert docker_watcher._get_container_command(container) == AUTO_COMMAND_SENTINEL

    def test_get_container_command_custom(self, docker_watcher):
        """Test command when label has custom value."""
        container = {
            "Names": ["/my-container"],
            "Labels": {LABEL_NAME: "docker logs -f my-container"},
        }
        assert docker_watcher._get_container_command(container) == "docker logs -f my-container"

    def test_get_container_theme(self, docker_watcher):
        container = {"Labels": {THEME_LABEL: "nord"}}
        assert docker_watcher._get_container_theme(container) == "nord"

    def test_get_container_theme_blank(self, docker_watcher):
        container = {"Labels": {THEME_LABEL: "  "}}
        assert docker_watcher._get_container_theme(container) is None

    @pytest.mark.asyncio
    async def test_add_container(self, session_manager):
        """Test adding a container."""
        on_added = MagicMock()
        watcher = DockerWatcher(session_manager, on_container_added=on_added)

        container = {
            "Id": "abc123",
            "Names": ["/test-container"],
            "Labels": {LABEL_NAME: "auto", THEME_LABEL: "monokai"},
        }

        await watcher._add_container(container)

        # Should add to session manager
        session_manager.add_app.assert_called_once()
        call_args = session_manager.add_app.call_args
        assert call_args[0][0] == "test-container"  # name
        assert call_args[0][1] == AUTO_COMMAND_SENTINEL  # command
        assert call_args[0][2] == "test-container"  # slug
        assert call_args[1]["terminal"] is True
        assert call_args[1]["theme"] == "monokai"

        # Should call callback
        on_added.assert_called_once_with("test-container", "test-container", call_args[0][1])

        # Should track container
        assert "test-container" in watcher._managed_containers

    @pytest.mark.asyncio
    async def test_add_container_already_managed(self, session_manager):
        """Test adding a container that's already managed."""
        watcher = DockerWatcher(session_manager)
        watcher._managed_containers["test-container"] = "abc123"

        container = {"Id": "abc123", "Names": ["/test-container"], "Labels": {LABEL_NAME: "auto"}}

        await watcher._add_container(container)

        # Should not add again
        session_manager.add_app.assert_not_called()

    @pytest.mark.asyncio
    async def test_remove_container(self, session_manager):
        """Test removing a container."""
        session_manager.apps_by_slug = {"test-container": MagicMock()}
        session_manager.apps = [session_manager.apps_by_slug["test-container"]]
        session_manager.get_session_by_route_key.return_value = None

        on_removed = MagicMock()
        watcher = DockerWatcher(session_manager, on_container_removed=on_removed)
        watcher._managed_containers["test-container"] = "abc123"

        await watcher._remove_container("abc123")

        # Should remove from tracking
        assert "test-container" not in watcher._managed_containers

        # Should call callback
        on_removed.assert_called_once_with("test-container")

    @pytest.mark.asyncio
    async def test_remove_container_not_managed(self, session_manager):
        """Test removing a container that's not managed."""
        on_removed = MagicMock()
        watcher = DockerWatcher(session_manager, on_container_removed=on_removed)

        await watcher._remove_container("unknown123")

        # Should not call callback
        on_removed.assert_not_called()

    @pytest.mark.asyncio
    async def test_start_stop(self, session_manager):
        """Test starting and stopping the watcher."""
        watcher = DockerWatcher(session_manager, socket_path="/nonexistent.sock")

        # Mock the methods that would fail without Docker
        watcher._get_labeled_containers = AsyncMock(return_value=[])
        watcher._watch_events = AsyncMock()

        await watcher.start()
        assert watcher._running is True

        await watcher.stop()
        assert watcher._running is False


class TestDockerWatcherIntegration:
    """Integration-style tests for Docker watcher."""

    @pytest.mark.asyncio
    async def test_handle_start_event(self, session_manager):
        """Test handling a container start event."""
        watcher = DockerWatcher(session_manager)

        # Mock the docker request to return container info
        async def mock_request(method, path):
            if "/containers/" in path and "/json" in path:
                return (
                    200,
                    '{"Name": "/test-service", "Config": {"Labels": {"webterm-command": "auto"}}}',
                )
            return 404, ""

        watcher._docker_request = mock_request

        event = {
            "Action": "start",
            "Actor": {"ID": "container123", "Attributes": {LABEL_NAME: "auto"}},
        }

        await watcher._handle_event(event)

        # Should add container
        session_manager.add_app.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_die_event(self, session_manager):
        """Test handling a container die event."""
        session_manager.apps_by_slug = {}
        session_manager.apps = []
        session_manager.get_session_by_route_key.return_value = None

        watcher = DockerWatcher(session_manager)
        watcher._managed_containers["test-service"] = "container123"

        event = {
            "Action": "die",
            "Actor": {"ID": "container123", "Attributes": {LABEL_NAME: "auto"}},
        }

        await watcher._handle_event(event)

        # Should remove container
        assert "test-service" not in watcher._managed_containers

    @pytest.mark.asyncio
    async def test_handle_event_without_label(self, session_manager):
        """Test that events without our label are ignored."""
        watcher = DockerWatcher(session_manager)

        event = {
            "Action": "start",
            "Actor": {
                "ID": "container123",
                "Attributes": {},  # No label
            },
        }

        await watcher._handle_event(event)

        # Should not add container
        session_manager.add_app.assert_not_called()


@pytest.mark.parametrize(
    ("labels", "expected"),
    [
        ({"webterm-command": "echo hi"}, "echo hi"),
        ({"webterm-command": "auto"}, AUTO_COMMAND_SENTINEL),
        ({"webterm-command": ""}, AUTO_COMMAND_SENTINEL),
        ({"other": "value"}, AUTO_COMMAND_SENTINEL),
    ],
)
def test_get_container_command_variants(docker_watcher, labels, expected):
    container = {"Names": ["/my-container"], "Labels": labels}
    assert docker_watcher._get_container_command(container) == expected


def test_auto_command_env_override(monkeypatch, docker_watcher):
    monkeypatch.setenv("WEBTERM_DOCKER_AUTO_COMMAND", "/bin/sh")
    container = {"Names": ["/my-container"], "Labels": {LABEL_NAME: "auto"}}
    assert docker_watcher._get_container_command(container) == AUTO_COMMAND_SENTINEL


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("status", "body", "expected"),
    [
        (200, '[{"Id":"abc","Names":["/c1"],"Labels":{"webterm-command":"auto"}}]', 1),
        (200, "[]", 0),
        (500, "error", 0),
    ],
)
async def test_get_labeled_containers_handles_status(
    docker_watcher, status, body, expected, monkeypatch
):
    async def fake_request(method: str, path: str):
        return status, body

    monkeypatch.setattr(docker_watcher, "_docker_request", fake_request)
    result = await docker_watcher._get_labeled_containers()
    assert len(result) == expected


@pytest.mark.asyncio
async def test_watch_events_recovers_from_errors(docker_watcher, monkeypatch):
    docker_watcher._running = True

    async def fail_once(*_args, **_kwargs):
        docker_watcher._running = False
        raise OSError("boom")

    async def fake_sleep(_seconds):
        return None

    monkeypatch.setattr("webterm.docker_watcher.asyncio.open_unix_connection", fail_once)
    monkeypatch.setattr("webterm.docker_watcher.asyncio.sleep", fake_sleep)
    await docker_watcher._watch_events()

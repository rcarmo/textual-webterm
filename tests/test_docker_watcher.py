"""Tests for docker_watcher module."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from textual_webterm.docker_watcher import DEFAULT_COMMAND, LABEL_NAME, DockerWatcher


class TestDockerWatcher:
    """Tests for DockerWatcher class."""

    def test_container_to_slug(self):
        """Test slug generation from container names."""
        watcher = DockerWatcher(MagicMock())

        # Test basic name
        container = {"Names": ["/my-container"]}
        assert watcher._container_to_slug(container) == "my-container"

        # Test with underscores
        container = {"Names": ["/my_container_name"]}
        assert watcher._container_to_slug(container) == "my-container-name"

        # Test with dots
        container = {"Names": ["/service.name"]}
        assert watcher._container_to_slug(container) == "service-name"

        # Test fallback to ID
        container = {"Id": "abc123def456"}
        assert watcher._container_to_slug(container) == "abc123def456"

    def test_get_container_name(self):
        """Test extracting container name."""
        watcher = DockerWatcher(MagicMock())

        container = {"Names": ["/my-container"]}
        assert watcher._get_container_name(container) == "my-container"

        container = {"Names": []}
        container["Id"] = "abc123def456789"
        assert watcher._get_container_name(container) == "abc123def456"

    def test_get_container_command_auto(self):
        """Test command generation when label is 'auto'."""
        watcher = DockerWatcher(MagicMock())

        container = {"Names": ["/my-container"], "Labels": {LABEL_NAME: "auto"}}
        expected = f"docker exec -it my-container {DEFAULT_COMMAND}"
        assert watcher._get_container_command(container) == expected

    def test_get_container_command_custom(self):
        """Test command when label has custom value."""
        watcher = DockerWatcher(MagicMock())

        container = {
            "Names": ["/my-container"],
            "Labels": {LABEL_NAME: "docker logs -f my-container"},
        }
        assert watcher._get_container_command(container) == "docker logs -f my-container"

    @pytest.mark.asyncio
    async def test_add_container(self):
        """Test adding a container."""
        session_manager = MagicMock()
        on_added = MagicMock()
        watcher = DockerWatcher(session_manager, on_container_added=on_added)

        container = {"Id": "abc123", "Names": ["/test-container"], "Labels": {LABEL_NAME: "auto"}}

        await watcher._add_container(container)

        # Should add to session manager
        session_manager.add_app.assert_called_once()
        call_args = session_manager.add_app.call_args
        assert call_args[0][0] == "test-container"  # name
        assert "docker exec -it test-container" in call_args[0][1]  # command
        assert call_args[0][2] == "test-container"  # slug
        assert call_args[1]["terminal"] is True

        # Should call callback
        on_added.assert_called_once_with("test-container", "test-container", call_args[0][1])

        # Should track container
        assert "test-container" in watcher._managed_containers

    @pytest.mark.asyncio
    async def test_add_container_already_managed(self):
        """Test adding a container that's already managed."""
        session_manager = MagicMock()
        watcher = DockerWatcher(session_manager)
        watcher._managed_containers["test-container"] = "abc123"

        container = {"Id": "abc123", "Names": ["/test-container"], "Labels": {LABEL_NAME: "auto"}}

        await watcher._add_container(container)

        # Should not add again
        session_manager.add_app.assert_not_called()

    @pytest.mark.asyncio
    async def test_remove_container(self):
        """Test removing a container."""
        session_manager = MagicMock()
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
    async def test_remove_container_not_managed(self):
        """Test removing a container that's not managed."""
        session_manager = MagicMock()
        on_removed = MagicMock()
        watcher = DockerWatcher(session_manager, on_container_removed=on_removed)

        await watcher._remove_container("unknown123")

        # Should not call callback
        on_removed.assert_not_called()

    @pytest.mark.asyncio
    async def test_start_stop(self):
        """Test starting and stopping the watcher."""
        session_manager = MagicMock()
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
    async def test_handle_start_event(self):
        """Test handling a container start event."""
        session_manager = MagicMock()
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
    async def test_handle_die_event(self):
        """Test handling a container die event."""
        session_manager = MagicMock()
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
    async def test_handle_event_without_label(self):
        """Test that events without our label are ignored."""
        session_manager = MagicMock()
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

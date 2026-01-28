"""Docker container event watcher for dynamic session management.

Watches Docker events and creates/removes terminal sessions for containers
with the 'webterm-command' label.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
from typing import TYPE_CHECKING, Callable

from .docker_stats import get_docker_socket_path

if TYPE_CHECKING:
    from .session_manager import SessionManager

log = logging.getLogger("webterm")

LABEL_NAME = "webterm-command"
THEME_LABEL = "webterm-theme"
AUTO_COMMAND_ENV = "WEBTERM_DOCKER_AUTO_COMMAND"
DEFAULT_COMMAND = "/bin/bash"


def _get_auto_command() -> str:
    return os.environ.get(AUTO_COMMAND_ENV, DEFAULT_COMMAND)


class DockerWatcher:
    """Watch Docker events and manage terminal sessions dynamically."""

    def __init__(
        self,
        session_manager: SessionManager,
        on_container_added: Callable[[str, str, str], None] | None = None,
        on_container_removed: Callable[[str], None] | None = None,
        socket_path: str | None = None,
    ) -> None:
        """Initialize Docker watcher.

        Args:
            session_manager: Session manager for adding/removing apps.
            on_container_added: Callback(slug, name, command) when container is added.
            on_container_removed: Callback(slug) when container is removed.
            socket_path: Docker socket path (default: /var/run/docker.sock).
        """
        self._session_manager = session_manager
        self._on_container_added = on_container_added
        self._on_container_removed = on_container_removed
        self._socket_path = socket_path or get_docker_socket_path()
        self._running = False
        self._task: asyncio.Task | None = None
        # Track containers we're managing: slug -> container_id
        self._managed_containers: dict[str, str] = {}

    async def _docker_request(self, method: str, path: str) -> tuple[int, str]:
        """Make HTTP request to Docker socket.

        Returns:
            Tuple of (status_code, body).
        """
        reader, writer = await asyncio.open_unix_connection(self._socket_path)
        try:
            request = f"{method} {path} HTTP/1.1\r\nHost: localhost\r\n\r\n"
            writer.write(request.encode())
            await writer.drain()

            # Read status line
            status_line = await reader.readline()
            status_code = int(status_line.decode().split()[1])

            # Read headers
            content_length = 0
            chunked = False
            while True:
                line = await reader.readline()
                if line == b"\r\n":
                    break
                header = line.decode().lower()
                if header.startswith("content-length:"):
                    content_length = int(header.split(":")[1].strip())
                if "transfer-encoding: chunked" in header:
                    chunked = True

            # Read body
            if chunked:
                body_parts = []
                while True:
                    size_line = await reader.readline()
                    size = int(size_line.decode().strip(), 16)
                    if size == 0:
                        break
                    chunk = await reader.readexactly(size)
                    body_parts.append(chunk)
                    await reader.readline()  # trailing CRLF
                body = b"".join(body_parts).decode()
            elif content_length > 0:
                body = (await reader.readexactly(content_length)).decode()
            else:
                body = ""

            return status_code, body
        finally:
            writer.close()
            await writer.wait_closed()

    async def _get_labeled_containers(self) -> list[dict]:
        """Get all running containers with webterm-command label."""
        path = f'/containers/json?filters={{"label":["{LABEL_NAME}"]}}'
        status, body = await self._docker_request("GET", path)
        if status != 200:
            log.error("Failed to list containers: %s", body)
            return []
        return json.loads(body)

    def _get_container_command(self, container: dict) -> str:
        """Get command for container from label.

        If label is 'auto', returns default exec command.
        """
        labels = container.get("Labels", {})
        label_value = labels.get(LABEL_NAME, "auto")

        if label_value.lower() == "auto":
            container_name = self._get_container_name(container)
            return f"docker exec -it {container_name} {_get_auto_command()}"
        return label_value

    def _get_container_theme(self, container: dict) -> str | None:
        labels = container.get("Labels", {})
        value = labels.get(THEME_LABEL)
        if isinstance(value, str) and value.strip():
            return value.strip()
        return None

    def _get_container_name(self, container: dict) -> str:
        """Get container name (without leading /)."""
        names = container.get("Names", [])
        if names:
            return names[0].lstrip("/")
        return container.get("Id", "unknown")[:12]

    def _container_to_slug(self, container: dict) -> str:
        """Convert container to URL slug."""
        return self._get_container_name(container).replace("_", "-").replace(".", "-")

    async def _add_container(self, container: dict) -> None:
        """Add a container as a terminal session."""
        slug = self._container_to_slug(container)
        name = self._get_container_name(container)
        command = self._get_container_command(container)
        theme = self._get_container_theme(container)
        container_id = container.get("Id", "")

        if slug in self._managed_containers:
            log.debug("Container %s already managed", name)
            return

        log.info("Adding container: %s (slug=%s, cmd=%s)", name, slug, command)
        self._managed_containers[slug] = container_id
        self._session_manager.add_app(name, command, slug, terminal=True, theme=theme)

        if self._on_container_added:
            self._on_container_added(slug, name, command)

    async def _remove_container(self, container_id: str) -> None:
        """Remove a container's terminal session."""
        # Find slug by container_id
        slug = None
        for s, cid in list(self._managed_containers.items()):
            if cid == container_id or cid.startswith(container_id):
                slug = s
                break

        if not slug:
            return

        log.info("Removing container: %s", slug)
        del self._managed_containers[slug]

        # Remove from session manager's apps
        if slug in self._session_manager.apps_by_slug:
            app = self._session_manager.apps_by_slug.pop(slug)
            if app in self._session_manager.apps:
                self._session_manager.apps.remove(app)

        # Close any active session for this slug
        route_key = slug  # In our case, slug is used as route_key
        session = self._session_manager.get_session_by_route_key(route_key)
        if session:
            session_id = self._session_manager.routes.get(route_key)
            if session_id:
                await self._session_manager.close_session(session_id)

        if self._on_container_removed:
            self._on_container_removed(slug)

    async def _watch_events(self) -> None:
        """Watch Docker events stream."""
        filters = json.dumps({"event": ["start", "die"], "type": ["container"]})
        path = f"/events?filters={filters}"

        while self._running:
            try:
                reader, writer = await asyncio.open_unix_connection(self._socket_path)
                try:
                    request = f"GET {path} HTTP/1.1\r\nHost: localhost\r\n\r\n"
                    writer.write(request.encode())
                    await writer.drain()

                    # Skip HTTP headers
                    while True:
                        line = await reader.readline()
                        if line == b"\r\n":
                            break

                    # Read event stream (chunked encoding)
                    while self._running:
                        size_line = await reader.readline()
                        if not size_line:
                            break
                        try:
                            size = int(size_line.decode().strip(), 16)
                        except ValueError:
                            continue
                        if size == 0:
                            break

                        chunk = await reader.readexactly(size)
                        await reader.readline()  # trailing CRLF

                        try:
                            event = json.loads(chunk.decode())
                            await self._handle_event(event)
                        except json.JSONDecodeError:
                            continue
                finally:
                    writer.close()
                    await writer.wait_closed()
            except Exception as e:
                if self._running:
                    log.warning("Docker event stream error: %s, reconnecting...", e)
                    await asyncio.sleep(5)

    async def _handle_event(self, event: dict) -> None:
        """Handle a Docker event."""
        action = event.get("Action", "")
        actor = event.get("Actor", {})
        container_id = actor.get("ID", "")
        attributes = actor.get("Attributes", {})

        # Only handle containers with our label
        if LABEL_NAME not in attributes:
            return

        if action == "start":
            # Get full container info
            status, body = await self._docker_request("GET", f"/containers/{container_id}/json")
            if status == 200:
                container_info = json.loads(body)
                # Convert to list format expected by _add_container
                container = {
                    "Id": container_id,
                    "Names": ["/" + container_info.get("Name", "").lstrip("/")],
                    "Labels": container_info.get("Config", {}).get("Labels", {}),
                }
                await self._add_container(container)
        elif action == "die":
            await self._remove_container(container_id)

    async def scan_existing(self) -> None:
        """Scan for existing labeled containers and add them."""
        containers = await self._get_labeled_containers()
        for container in containers:
            await self._add_container(container)
        log.info("Found %d existing containers with %s label", len(containers), LABEL_NAME)

    async def start(self) -> None:
        """Start watching Docker events."""
        if self._running:
            return

        self._running = True
        # First scan existing containers
        await self.scan_existing()
        # Then start watching for new events
        self._task = asyncio.create_task(self._watch_events())
        log.info("Docker watcher started")

    async def stop(self) -> None:
        """Stop watching Docker events."""
        self._running = False
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None
        log.info("Docker watcher stopped")

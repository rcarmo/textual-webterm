"""Docker container CPU stats via Unix socket.

Reads container stats from Docker socket using only asyncio and stdlib.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import socket
from collections import deque
from pathlib import Path

log = logging.getLogger("textual-webterm")

DOCKER_SOCKET = "/var/run/docker.sock"
STATS_HISTORY_SIZE = 180  # Number of CPU readings to keep (30 min at 10s interval)
POLL_INTERVAL = 10.0  # Seconds between polls


class DockerStatsCollector:
    """Collects CPU stats from Docker containers via the Docker socket."""

    def __init__(self, socket_path: str = DOCKER_SOCKET) -> None:
        self._socket_path = socket_path
        # container_name -> deque of CPU % values (0-100)
        self._cpu_history: dict[str, deque[float]] = {}
        self._running = False
        self._task: asyncio.Task | None = None
        # Track previous CPU values for delta calculation
        self._prev_cpu: dict[str, tuple[int, int]] = {}

    @property
    def available(self) -> bool:
        """Check if Docker socket is available."""
        return Path(self._socket_path).exists()

    def get_cpu_history(self, container_name: str) -> list[float]:
        """Get CPU history for a container."""
        if container_name not in self._cpu_history:
            return []
        return list(self._cpu_history[container_name])

    async def _make_request(self, path: str) -> dict | list | None:
        """Make HTTP request to Docker socket."""
        loop = asyncio.get_event_loop()

        def _sync_request() -> bytes | None:
            try:
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.settimeout(5.0)
                sock.connect(self._socket_path)

                request = f"GET {path} HTTP/1.1\r\nHost: localhost\r\n\r\n"
                sock.sendall(request.encode())

                # Read response
                chunks = []
                while True:
                    chunk = sock.recv(4096)
                    if not chunk:
                        break
                    chunks.append(chunk)
                sock.close()
                return b"".join(chunks)
            except (OSError, TimeoutError):
                return None

        response = await loop.run_in_executor(None, _sync_request)
        if response is None:
            return None

        # Parse HTTP response - find JSON body after headers
        try:
            response_str = response.decode("utf-8", errors="replace")
            # Split headers and body
            if "\r\n\r\n" in response_str:
                _, body = response_str.split("\r\n\r\n", 1)
            else:
                body = response_str

            # Handle chunked encoding - find the JSON object/array
            if body.startswith("{") or body.startswith("["):
                json_str = body
            else:
                # Skip chunk size line in chunked encoding
                lines = body.split("\r\n")
                for line in lines:
                    if line.startswith("{") or line.startswith("["):
                        json_str = line
                        break
                else:
                    return None

            return json.loads(json_str)
        except (json.JSONDecodeError, ValueError):
            return None

    async def _discover_containers(self, service_names: list[str]) -> dict[str, str]:
        """Map service names to container IDs by querying Docker.

        Returns:
            Dict mapping service_name -> container_id
        """
        # List all containers
        containers = await self._make_request("/containers/json")
        if not isinstance(containers, list):
            log.debug("Container list request returned non-list: %s", type(containers))
            return {}

        log.debug("Found %d containers, looking for services: %s", len(containers), service_names)

        mapping: dict[str, str] = {}
        for container in containers:
            if not isinstance(container, dict):
                continue

            container_id = container.get("Id", "")[:12]  # Short ID
            names = container.get("Names", [])
            labels = container.get("Labels", {})

            # Check compose service label
            service = labels.get("com.docker.compose.service", "")
            if service in service_names:
                mapping[service] = container_id
                log.debug("Matched service %s -> %s (via label)", service, container_id)
                continue

            # Fall back to container name matching
            for name in names:
                # Docker names start with /
                clean_name = name.lstrip("/")
                # Check if service name is part of container name
                for svc in service_names:
                    if svc in clean_name or clean_name == svc:
                        mapping[svc] = container_id
                        log.debug("Matched service %s -> %s (via name %s)", svc, container_id, clean_name)
                        break

        if not mapping:
            # Log what we found for debugging
            found_services = [c.get("Labels", {}).get("com.docker.compose.service", "?") for c in containers if isinstance(c, dict)]
            found_names = [c.get("Names", ["?"])[0] if c.get("Names") else "?" for c in containers if isinstance(c, dict)]
            log.debug("No matches. Container services: %s, names: %s", found_services, found_names)

        return mapping

    def _calculate_cpu_percent(
        self, container: str, cpu_stats: dict, precpu_stats: dict
    ) -> float | None:
        """Calculate CPU percentage from stats.

        Formula: (cpu_delta / system_delta) * num_cpus * 100
        """
        try:
            cpu_usage = cpu_stats.get("cpu_usage", {})
            precpu_usage = precpu_stats.get("cpu_usage", {})

            cpu_total = cpu_usage.get("total_usage", 0)
            precpu_total = precpu_usage.get("total_usage", 0)
            system_cpu = cpu_stats.get("system_cpu_usage", 0)
            presystem_cpu = precpu_stats.get("system_cpu_usage", 0)

            # Use previous values if precpu_stats is empty (first read)
            if precpu_total == 0 and container in self._prev_cpu:
                precpu_total, presystem_cpu = self._prev_cpu[container]

            # Store current values for next calculation
            self._prev_cpu[container] = (cpu_total, system_cpu)

            cpu_delta = cpu_total - precpu_total
            system_delta = system_cpu - presystem_cpu

            if system_delta <= 0 or cpu_delta < 0:
                return None

            # Get number of CPUs
            online_cpus = cpu_stats.get("online_cpus")
            if online_cpus is None:
                percpu = cpu_usage.get("percpu_usage", [])
                online_cpus = len(percpu) if percpu else 1

            cpu_percent = (cpu_delta / system_delta) * online_cpus * 100.0
            return min(cpu_percent, 100.0 * online_cpus)  # Cap at max possible

        except (KeyError, TypeError, ZeroDivisionError):
            return None

    async def _poll_container(self, service_name: str, container_id: str) -> None:
        """Poll stats for a single container."""
        path = f"/containers/{container_id}/stats?stream=false"
        stats = await self._make_request(path)

        if not isinstance(stats, dict):
            log.debug("Stats request for %s (%s) returned non-dict: %s", service_name, container_id, type(stats))
            return

        cpu_stats = stats.get("cpu_stats", {})
        precpu_stats = stats.get("precpu_stats", {})

        cpu_percent = self._calculate_cpu_percent(service_name, cpu_stats, precpu_stats)
        if cpu_percent is not None:
            if service_name not in self._cpu_history:
                self._cpu_history[service_name] = deque(maxlen=STATS_HISTORY_SIZE)
            self._cpu_history[service_name].append(cpu_percent)
            log.debug("CPU for %s: %.1f%% (history size: %d)", service_name, cpu_percent, len(self._cpu_history[service_name]))
        else:
            log.debug("CPU calculation returned None for %s", service_name)

    async def _poll_loop(self, service_names: list[str]) -> None:
        """Background polling loop."""
        # Discover container IDs on first run and periodically refresh
        service_to_container: dict[str, str] = {}
        refresh_counter = 0

        while self._running:
            # Refresh container mapping every 30 iterations (~5 minutes at 10s interval)
            if refresh_counter % 30 == 0:
                service_to_container = await self._discover_containers(service_names)
                if service_to_container:
                    log.debug(
                        "Discovered containers: %s",
                        ", ".join(f"{k}={v}" for k, v in service_to_container.items()),
                    )
                else:
                    log.debug(
                        "No containers found for services: %s",
                        ", ".join(service_names),
                    )

            refresh_counter += 1

            for service_name in service_names:
                if not self._running:
                    break
                container_id = service_to_container.get(service_name)
                if not container_id:
                    continue
                try:
                    await self._poll_container(service_name, container_id)
                except Exception:
                    log.debug("Error polling stats for %s", service_name)

            await asyncio.sleep(POLL_INTERVAL)

    def start(self, service_names: list[str]) -> None:
        """Start collecting stats for given service names."""
        if not self.available:
            log.debug("Docker socket not available at %s", self._socket_path)
            return

        if self._running:
            return

        self._running = True
        self._task = asyncio.create_task(self._poll_loop(service_names))
        log.info("Started Docker stats collection for %d services", len(service_names))

    async def stop(self) -> None:
        """Stop collecting stats."""
        self._running = False
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None


def render_sparkline_svg(
    values: list[float],
    width: int = 100,
    height: int = 20,
    stroke_color: str = "#4ade80",
    fill_color: str = "rgba(74, 222, 128, 0.2)",
) -> str:
    """Render a list of values as an SVG sparkline.

    Args:
        values: List of values to plot (0-100 range expected for CPU %)
        width: SVG width in pixels
        height: SVG height in pixels
        stroke_color: Line color
        fill_color: Fill color under the line

    Returns:
        SVG string
    """
    if not values:
        # Empty placeholder
        return f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg"></svg>'

    # Normalize values to 0-1 range
    max_val = max(values) if max(values) > 0 else 1
    normalized = [v / max_val for v in values]

    # Calculate points
    points = []
    x_step = width / max(len(values) - 1, 1)
    for i, v in enumerate(normalized):
        x = i * x_step
        y = height - (v * (height - 2)) - 1  # Leave 1px margin
        points.append(f"{x:.1f},{y:.1f}")

    path_line = " ".join(points)

    # Create filled area path (line + close to bottom)
    fill_points = [*points, f"{width},{height}", f"0,{height}"]
    path_fill = " ".join(fill_points)

    svg = f'''<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <polygon points="{path_fill}" fill="{fill_color}" />
  <polyline points="{path_line}" fill="none" stroke="{stroke_color}" stroke-width="1.5" />
</svg>'''
    return svg

"""Tests for docker_stats module."""

from unittest.mock import MagicMock

import pytest

from webterm.docker_stats import (
    STATS_HISTORY_SIZE,
    DockerStatsCollector,
    render_sparkline_svg,
)


class TestRenderSparklineSvg:
    """Tests for SVG sparkline rendering."""

    def test_empty_values(self):
        """Empty values produce empty SVG."""
        svg = render_sparkline_svg([])
        assert "<svg" in svg
        assert "width=" in svg
        assert "polygon" not in svg  # No data to draw

    def test_single_value(self):
        """Single value renders correctly."""
        svg = render_sparkline_svg([50.0])
        assert "<svg" in svg
        assert "polygon" in svg
        assert "polyline" in svg

    def test_multiple_values(self):
        """Multiple values render as sparkline."""
        values = [10.0, 50.0, 30.0, 80.0, 20.0]
        svg = render_sparkline_svg(values)
        assert "<svg" in svg
        assert "polygon" in svg
        assert "polyline" in svg

    def test_custom_dimensions(self):
        """Custom width/height are applied."""
        svg = render_sparkline_svg([50.0], width=200, height=40)
        assert 'width="200"' in svg
        assert 'height="40"' in svg

    def test_custom_colors(self):
        """Custom colors are applied."""
        svg = render_sparkline_svg(
            [50.0],
            stroke_color="#ff0000",
            fill_color="rgba(255, 0, 0, 0.3)",
        )
        assert "#ff0000" in svg
        assert "rgba(255, 0, 0, 0.3)" in svg

    def test_zero_values(self):
        """All zero values don't cause division errors."""
        svg = render_sparkline_svg([0.0, 0.0, 0.0])
        assert "<svg" in svg

    def test_high_values(self):
        """High CPU values (100%+) render correctly."""
        svg = render_sparkline_svg([100.0, 150.0, 200.0])
        assert "<svg" in svg


class TestDockerStatsCollector:
    """Tests for Docker stats collector."""

    @pytest.fixture
    def cpu_stats_pair(self):
        return (
            {
                "cpu_usage": {"total_usage": 1000000000},
                "system_cpu_usage": 10000000000,
                "online_cpus": 4,
            },
            {
                "cpu_usage": {"total_usage": 500000000},
                "system_cpu_usage": 5000000000,
            },
        )

    def test_available_checks_socket(self, tmp_path):
        """available property checks socket existence and connectivity."""
        socket_path = tmp_path / "docker.sock"
        collector = DockerStatsCollector(str(socket_path))
        assert collector.available is False

        # Just touching the file isn't enough - need actual socket connectivity
        # Since we can't easily create a real Unix socket in tests,
        # verify that a non-socket file returns False
        socket_path.touch()
        assert collector.available is False  # File exists but can't connect

    def test_get_cpu_history_empty(self):
        """Empty history returns empty list."""
        collector = DockerStatsCollector("/nonexistent")
        assert collector.get_cpu_history("container1") == []

    def test_get_cpu_history_with_data(self):
        """CPU history returns stored values."""
        collector = DockerStatsCollector("/nonexistent")
        collector._cpu_history["test"] = [10.0, 20.0, 30.0]
        # get_cpu_history converts deque to list
        collector._cpu_history["test"] = list.__new__(list)
        collector._cpu_history["test"].extend([10.0, 20.0, 30.0])

        history = collector.get_cpu_history("test")
        assert history == [10.0, 20.0, 30.0]

    def test_calculate_cpu_percent(self, cpu_stats_pair):
        """CPU percentage calculation."""
        collector = DockerStatsCollector("/nonexistent")

        cpu_stats, precpu_stats = cpu_stats_pair

        result = collector._calculate_cpu_percent("test", cpu_stats, precpu_stats)
        assert result is not None
        assert 0 <= result <= 400  # 4 CPUs max

    def test_calculate_cpu_percent_zero_delta(self):
        """Zero system delta returns None."""
        collector = DockerStatsCollector("/nonexistent")

        cpu_stats = {
            "cpu_usage": {"total_usage": 1000},
            "system_cpu_usage": 1000,
            "online_cpus": 1,
        }
        precpu_stats = {
            "cpu_usage": {"total_usage": 1000},
            "system_cpu_usage": 1000,
        }

        result = collector._calculate_cpu_percent("test", cpu_stats, precpu_stats)
        assert result is None

    def test_start_without_socket(self, tmp_path):
        """Start does nothing if socket not available."""
        collector = DockerStatsCollector(str(tmp_path / "nonexistent.sock"))
        collector.start(["container1"])
        assert collector._running is False
        assert collector._task is None

    @pytest.mark.asyncio
    async def test_stop_without_start(self):
        """Stop is safe to call without start."""
        collector = DockerStatsCollector("/nonexistent")
        await collector.stop()  # Should not raise

    @pytest.mark.asyncio
    async def test_make_request_no_socket(self):
        """Request returns None if socket unavailable."""
        collector = DockerStatsCollector("/nonexistent")
        result = await collector._make_request("/test")
        assert result is None

    def test_cpu_history_max_size(self):
        """CPU history respects max size."""
        from collections import deque

        collector = DockerStatsCollector("/nonexistent")
        collector._cpu_history["test"] = deque(maxlen=STATS_HISTORY_SIZE)

        # Add more than max entries
        for i in range(STATS_HISTORY_SIZE + 10):
            collector._cpu_history["test"].append(float(i))

        assert len(collector._cpu_history["test"]) == STATS_HISTORY_SIZE

    def test_add_service_dynamic(self):
        """Services can be added dynamically after start."""
        collector = DockerStatsCollector("/nonexistent")
        collector._service_names = ["svc1"]
        
        collector.add_service("svc2")
        assert "svc2" in collector._service_names
        
        # Adding same service again is a no-op
        collector.add_service("svc2")
        assert collector._service_names.count("svc2") == 1

    def test_remove_service_dynamic(self):
        """Services can be removed dynamically."""
        from collections import deque
        
        collector = DockerStatsCollector("/nonexistent")
        collector._service_names = ["svc1", "svc2"]
        collector._cpu_history["svc1"] = deque([10.0, 20.0])
        collector._prev_cpu["svc1"] = (100, 200)
        
        collector.remove_service("svc1")
        assert "svc1" not in collector._service_names
        assert "svc1" not in collector._cpu_history
        assert "svc1" not in collector._prev_cpu
        
        # Removing non-existent service is safe
        collector.remove_service("nonexistent")  # Should not raise


class TestLocalServerSparklineEndpoint:
    """Tests for the CPU sparkline endpoint in LocalServer."""

    @pytest.mark.asyncio
    async def test_sparkline_endpoint_missing_container(self):
        """Missing container param returns 400."""
        from aiohttp.web import HTTPBadRequest

        from webterm.config import Config
        from webterm.local_server import LocalServer

        server = LocalServer("./", Config(), compose_mode=True)

        request = MagicMock()
        request.query = {}

        with pytest.raises(HTTPBadRequest):
            await server._handle_cpu_sparkline(request)

    @pytest.mark.asyncio
    async def test_sparkline_endpoint_returns_svg(self):
        """Sparkline endpoint returns SVG."""
        from webterm.config import Config
        from webterm.local_server import LocalServer

        server = LocalServer("./", Config(), compose_mode=True)

        request = MagicMock()
        request.query = {"container": "test", "width": "80", "height": "20"}

        response = await server._handle_cpu_sparkline(request)
        assert response.content_type == "image/svg+xml"
        assert "<svg" in response.text

    @pytest.mark.asyncio
    async def test_sparkline_with_stats_collector(self):
        """Sparkline uses stats collector data when available."""
        from webterm.config import Config
        from webterm.local_server import LocalServer

        server = LocalServer("./", Config(), compose_mode=True)
        server._docker_stats = MagicMock()
        server._docker_stats.get_cpu_history.return_value = [10.0, 20.0, 30.0]

        request = MagicMock()
        request.query = {"container": "test"}

        response = await server._handle_cpu_sparkline(request)
        server._docker_stats.get_cpu_history.assert_called_once_with("test")
        assert "<svg" in response.text

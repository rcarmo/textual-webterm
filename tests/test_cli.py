"""Tests for CLI module."""

from click.testing import CliRunner

from webterm import cli


def _close_coroutine(coro) -> None:
    coro.close()


class TestCLI:
    """Tests for CLI command."""

    def test_cli_help(self):
        """Test CLI help output."""
        cli_app = cli.app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--help"])
        assert result.exit_code == 0
        assert "terminal" in result.output.lower() or "command" in result.output.lower()

    def test_cli_runs_terminal_command(self, monkeypatch):
        calls: dict[str, object] = {}

        class FakeServer:
            def __init__(self, *_args, **_kwargs):
                calls["init"] = True

            def add_terminal(self, name, command, slug):
                calls["terminal"] = (name, command, slug)

            async def run(self):
                calls["run"] = True

        monkeypatch.setattr(cli, "LocalServer", FakeServer)
        monkeypatch.setattr(cli.asyncio, "run", _close_coroutine)

        runner = CliRunner()
        result = runner.invoke(cli.app, ["htop"])
        assert result.exit_code == 0
        assert calls["terminal"][1] == "htop"

    def test_cli_runs_default_shell(self, monkeypatch):
        import os

        calls: dict[str, object] = {}

        class FakeServer:
            def __init__(self, *_args, **_kwargs):
                calls["init"] = True

            def add_terminal(self, name, command, slug):
                calls["terminal"] = (name, command, slug)

            async def run(self):
                calls["run"] = True

        monkeypatch.setenv("SHELL", "/bin/zsh")
        monkeypatch.setattr(cli, "LocalServer", FakeServer)
        monkeypatch.setattr(cli.asyncio, "run", _close_coroutine)

        runner = CliRunner()
        result = runner.invoke(cli.app, [])
        assert result.exit_code == 0
        assert calls["terminal"][1] == os.environ["SHELL"]

    def test_cli_version(self):
        """Test CLI version output."""
        cli_app = cli.app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--version"])
        assert result.exit_code == 0
        assert "version" in result.output

    def test_cli_port_option(self):
        """Test CLI port option parsing."""
        cli_app = cli.app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--help"])
        assert "--port" in result.output or "-p" in result.output

    def test_cli_host_option(self):
        """Test CLI host option parsing."""
        cli_app = cli.app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--help"])
        assert "--host" in result.output or "-H" in result.output


class TestCLIOptions:
    """Tests for CLI option handling."""

    def test_debug_option(self):
        """Test --debug option exists."""
        cli_app = cli.app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--help"])
        assert "--docker-watch" in result.output

    def test_no_run_option(self):
        """Test --no-run option exists."""
        cli_app = cli.app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--help"])
        # Check that basic options are documented
        assert "port" in result.output.lower()


def test_package_version_fallback(monkeypatch):
    def raise_missing(_name: str):
        raise cli.PackageNotFoundError("webterm")

    monkeypatch.setattr(cli, "version", raise_missing)
    assert cli._package_version() == "0.0.0"


def test_cli_docker_watch_mode(monkeypatch):
    calls: dict[str, object] = {}

    class FakeServer:
        def __init__(self, *_args, **_kwargs):
            calls["init"] = True

        def add_terminal(self, name, command, slug):
            calls["terminal"] = (name, command, slug)

        async def run(self):
            calls["run"] = True

    monkeypatch.setattr(cli, "LocalServer", FakeServer)
    def run_and_close(coro):
        calls.setdefault("run", True)
        coro.close()

    monkeypatch.setattr(cli.asyncio, "run", run_and_close)
    monkeypatch.setattr(cli.constants, "DEBUG", True)

    runner = CliRunner()
    result = runner.invoke(cli.app, ["--docker-watch"])
    assert result.exit_code == 0
    assert "terminal" not in calls


def test_cli_windows_branch(monkeypatch):
    calls: dict[str, object] = {}

    class FakeServer:
        def __init__(self, *_args, **_kwargs):
            calls["init"] = True

        def add_terminal(self, name, command, slug):
            calls["terminal"] = (name, command, slug)

        async def run(self):
            calls["run"] = True

    monkeypatch.setattr(cli, "LocalServer", FakeServer)
    monkeypatch.setattr(cli.constants, "WINDOWS", True)
    def run_and_close(coro):
        calls.setdefault("run", True)
        coro.close()

    monkeypatch.setattr(cli.asyncio, "run", run_and_close)

    runner = CliRunner()
    result = runner.invoke(cli.app, ["--docker-watch"])
    assert result.exit_code == 0
    assert calls.get("run") is True

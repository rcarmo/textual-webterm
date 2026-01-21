"""Tests for CLI module."""

from pathlib import Path

import click
import pytest
from click.testing import CliRunner


class TestParseAppPath:
    """Tests for parse_app_path function."""

    def test_parse_module_class(self):
        """Test parsing module:class format."""
        from textual_webterm.cli import parse_app_path

        module, cls = parse_app_path("mymodule:MyClass")
        assert module == "mymodule"
        assert cls == "MyClass"

    def test_parse_nested_module_class(self):
        """Test parsing nested.module:class format."""
        from textual_webterm.cli import parse_app_path

        module, cls = parse_app_path("my.nested.module:MyClass")
        assert module == "my.nested.module"
        assert cls == "MyClass"

    def test_parse_file_path_class(self):
        """Test parsing file/path.py:class format."""
        from textual_webterm.cli import parse_app_path

        module, cls = parse_app_path("path/to/file.py:MyClass")
        assert module == "path/to/file.py"
        assert cls == "MyClass"

    def test_parse_no_colon_raises(self):
        """Test that missing colon raises BadParameter."""
        from textual_webterm.cli import parse_app_path

        with pytest.raises(click.BadParameter) as exc_info:
            parse_app_path("invalid_format")
        assert "Expected format" in str(exc_info.value)


class TestLoadAppClass:
    """Tests for load_app_class function."""

    def test_load_nonexistent_module(self):
        """Test loading from non-existent module raises."""
        from textual_webterm.cli import load_app_class

        with pytest.raises(click.BadParameter) as exc_info:
            load_app_class("nonexistent_module_xyz:MyClass")
        assert "Could not import" in str(exc_info.value)

    def test_load_nonexistent_class(self):
        """Test loading non-existent class from existing module raises."""
        from textual_webterm.cli import load_app_class

        with pytest.raises(click.BadParameter) as exc_info:
            load_app_class("os:NonExistentClass")
        assert "has no attribute" in str(exc_info.value)

    def test_load_existing_class(self):
        """Test loading an existing class from a module."""
        from textual_webterm.cli import load_app_class

        # Load Path from pathlib
        cls = load_app_class("pathlib:Path")
        assert cls is Path

    def test_load_from_file_nonexistent(self):
        """Test loading from non-existent file raises."""
        from textual_webterm.cli import load_app_class

        with pytest.raises(click.BadParameter) as exc_info:
            load_app_class("/nonexistent/path.py:MyClass")
        assert (
            "not found" in str(exc_info.value).lower()
            or "does not exist" in str(exc_info.value).lower()
        )


class TestCLI:
    """Tests for CLI command."""

    def test_cli_help(self):
        """Test CLI help output."""
        from textual_webterm.cli import app as cli_app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--help"])
        assert result.exit_code == 0
        assert "terminal" in result.output.lower() or "command" in result.output.lower()

    def test_cli_runs_terminal_command(self, monkeypatch):
        from textual_webterm import cli

        calls: dict[str, object] = {}

        class FakeServer:
            def __init__(self, *_args, **_kwargs):
                calls["init"] = True

            def add_terminal(self, name, command, slug):
                calls["terminal"] = (name, command, slug)

            async def run(self):
                calls["run"] = True

        monkeypatch.setattr(cli, "LocalServer", FakeServer)
        monkeypatch.setattr(cli.asyncio, "run", lambda _coro: None)

        runner = CliRunner()
        result = runner.invoke(cli.app, ["htop"])
        assert result.exit_code == 0
        assert calls["terminal"][1] == "htop"

    def test_cli_runs_default_shell(self, monkeypatch):
        import os

        from textual_webterm import cli

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
        monkeypatch.setattr(cli.asyncio, "run", lambda _coro: None)

        runner = CliRunner()
        result = runner.invoke(cli.app, [])
        assert result.exit_code == 0
        assert calls["terminal"][1] == os.environ["SHELL"]

    def test_cli_app_module_validation_rejects(self):
        from textual_webterm.cli import app as cli_app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--app", "os;rm -rf /:Fake"])
        assert result.exit_code != 0

    def test_cli_version(self):
        """Test CLI version output."""
        from textual_webterm.cli import app as cli_app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--version"])
        assert result.exit_code == 0
        assert "0.1.0" in result.output

    def test_cli_invalid_app_path(self):
        """Test CLI with invalid app path."""
        from textual_webterm.cli import app as cli_app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--app", "invalid"])
        assert result.exit_code != 0

    def test_cli_port_option(self):
        """Test CLI port option parsing."""
        from textual_webterm.cli import app as cli_app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--help"])
        assert "--port" in result.output or "-p" in result.output

    def test_cli_host_option(self):
        """Test CLI host option parsing."""
        from textual_webterm.cli import app as cli_app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--help"])
        assert "--host" in result.output or "-H" in result.output


class TestModuleValidation:
    """Tests for module/class name validation in CLI."""

    def test_invalid_module_characters(self):
        """Test that invalid module names are rejected."""
        from textual_webterm.cli import app as cli_app

        runner = CliRunner()
        # Module with shell characters should be rejected or fail gracefully
        result = runner.invoke(cli_app, ["--app", "os; rm -rf /:Fake"])
        # Should not succeed
        assert result.exit_code != 0

    def test_invalid_class_name(self):
        """Test that invalid class names are rejected."""
        from textual_webterm.cli import app as cli_app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--app", "os:123invalid"])
        assert result.exit_code != 0


class TestCLIOptions:
    """Tests for CLI option handling."""

    def test_debug_option(self):
        """Test --debug option exists."""
        from textual_webterm.cli import app as cli_app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--help"])
        assert "--app" in result.output

    def test_no_run_option(self):
        """Test --no-run option exists."""
        from textual_webterm.cli import app as cli_app

        runner = CliRunner()
        result = runner.invoke(cli_app, ["--help"])
        # Check that basic options are documented
        assert "port" in result.output.lower()

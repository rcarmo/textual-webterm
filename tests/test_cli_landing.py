import asyncio
from pathlib import Path

from click.testing import CliRunner


def test_cli_landing_manifest_runs(monkeypatch, tmp_path: Path):
    from textual_webterm import cli

    manifest = tmp_path / "landing.yaml"
    manifest.write_text(
        """
        - name: One
          slug: one
          command: echo one
        """
    )

    called = {}

    class FakeServer:
        def __init__(self, *_args, **_kwargs):
            called["init"] = True

        def add_terminal(self, name, command, slug):
            called["terminal"] = (name, command, slug)

        async def run(self):
            called["run"] = True

    monkeypatch.setattr(cli, "LocalServer", FakeServer)
    monkeypatch.setattr(cli, "asyncio", asyncio)

    runner = CliRunner()
    result = runner.invoke(cli.app, ["-L", str(manifest)])
    assert result.exit_code == 0
    assert called.get("terminal") == ("One", "echo one", "one")
    assert called.get("run") is True


def test_cli_compose_manifest_runs(monkeypatch, tmp_path: Path):
    from textual_webterm import cli

    manifest = tmp_path / "compose.yaml"
    manifest.write_text(
        """
        services:
          svc1:
            labels:
              webterm-command: echo svc1
        """
    )

    called = {}

    class FakeServer:
        def __init__(self, *_args, **_kwargs):
            called["init"] = True

        def add_terminal(self, name, command, slug):
            called["terminal"] = (name, command, slug)

        async def run(self):
            called["run"] = True

    monkeypatch.setattr(cli, "LocalServer", FakeServer)
    monkeypatch.setattr(cli, "asyncio", asyncio)

    runner = CliRunner()
    result = runner.invoke(cli.app, ["-C", str(manifest)])
    assert result.exit_code == 0
    assert called.get("terminal") == ("svc1", "echo svc1", "svc1")
    assert called.get("run") is True

"""Extra CLI coverage tests for app execution paths."""

from __future__ import annotations

from click.testing import CliRunner


def test_cli_runs_app_from_file(monkeypatch, tmp_path):
    from textual_webterm import cli

    app_file = tmp_path / "myapp.py"
    app_file.write_text(
        """
class MyApp:
    TITLE = "MyApp"
    def run(self):
        return 0
""".lstrip()
    )

    calls: dict[str, object] = {}

    class FakeServer:
        def __init__(self, *_args, **_kwargs):
            calls["init"] = True

        def add_app(self, name, command, slug):
            calls["app"] = (name, command, slug)

        async def run(self):
            calls["run"] = True

    monkeypatch.setattr(cli, "LocalServer", FakeServer)
    monkeypatch.setattr(cli.asyncio, "run", lambda _coro: None)

    runner = CliRunner()
    result = runner.invoke(cli.app, ["--app", f"{app_file}:MyApp"])
    assert result.exit_code == 0
    assert calls["app"][0] == "MyApp"
    assert "python3" in calls["app"][1]


def test_load_app_class_from_file(tmp_path):
    from textual_webterm.cli import load_app_class

    app_file = tmp_path / "myapp2.py"
    app_file.write_text(
        """
class MyApp2:
    pass
""".lstrip()
    )

    cls = load_app_class(f"{app_file}:MyApp2")
    assert cls.__name__ == "MyApp2"

from __future__ import annotations

import asyncio
import importlib
import importlib.util
import logging
import os
import sys
from pathlib import Path

import click
from importlib_metadata import version
from rich.logging import RichHandler

from . import constants
from .local_server import LocalServer

FORMAT = "%(message)s"
logging.basicConfig(
    level="DEBUG" if constants.DEBUG else "INFO",
    format=FORMAT,
    datefmt="[%X]",
    handlers=[RichHandler(show_path=False)],
)

log = logging.getLogger("textual-webterm")


def _is_file_path(path: str) -> bool:
    """Check if path looks like a file path (vs module path)."""
    return path.endswith(".py") or "/" in path or "\\" in path


def parse_app_path(app_path: str) -> tuple[str, str]:
    """Parse an app path like 'module.path:ClassName' or 'path/to/file.py:ClassName'.

    Returns:
        Tuple of (module_or_file, class_name)
    """
    if ":" not in app_path:
        raise click.BadParameter(
            f"Invalid app path '{app_path}'. Expected format: 'module.path:ClassName' or 'path/to/file.py:ClassName'"
        )

    module_part, class_name = app_path.rsplit(":", 1)
    return module_part, class_name


def load_app_class(app_path: str):
    """Load a Textual App class from a module path.

    Args:
        app_path: Path like 'module.path:ClassName' or 'path/to/file.py:ClassName'

    Returns:
        The App class
    """
    module_part, class_name = parse_app_path(app_path)

    # Check if it's a file path or module path
    if _is_file_path(module_part):
        # File path - load from file
        file_path = Path(module_part).resolve()
        if not file_path.exists():
            raise click.BadParameter(f"File not found: {file_path}")

        # Add parent directory to sys.path for imports
        parent_dir = str(file_path.parent)
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)

        # Import the module
        module_name = file_path.stem
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        if spec is None or spec.loader is None:
            raise click.BadParameter(f"Could not load module from {file_path}")

        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
    else:
        # Module path - import normally
        try:
            module = importlib.import_module(module_part)
        except ImportError as e:
            raise click.BadParameter(f"Could not import module '{module_part}': {e}") from e

    # Get the class
    if not hasattr(module, class_name):
        raise click.BadParameter(f"Module '{module_part}' has no attribute '{class_name}'")

    app_class = getattr(module, class_name)
    return app_class


@click.command()
@click.version_option(version("textual-webterm"))
@click.argument("command", required=False)
@click.option("--port", "-p", type=int, help="Port for server.", default=8080)
@click.option("--host", "-H", help="Host for server.", default="0.0.0.0")
@click.option(
    "--app",
    "-a",
    "app_path",
    help="Load a Textual app from module:ClassName (e.g., 'myapp:MyApp' or 'path/to/app.py:MyApp')",
)
@click.option(
    "--landing-manifest",
    "-L",
    "landing_manifest",
    type=click.Path(exists=True, dir_okay=False, readable=True, path_type=Path),
    help="YAML manifest describing landing page tiles (slug/name/command).",
)
@click.option(
    "--compose-manifest",
    "-C",
    "compose_manifest",
    type=click.Path(exists=True, dir_okay=False, readable=True, path_type=Path),
    help='Docker compose YAML; services with label "webterm-command" become landing tiles.',
)
def app(
    command: str | None,
    port: int,
    host: str,
    app_path: str | None,
    landing_manifest: Path | None,
    compose_manifest: Path | None,
) -> None:
    """Serve a terminal or Textual app over HTTP/WebSocket.

    COMMAND: Shell command to run in terminal (default: $SHELL)

    Examples:

    \b
        textual-webterm                           # Serve default shell
        textual-webterm htop                      # Serve htop in terminal
        textual-webterm --app mymodule:MyApp      # Serve a Textual app from module
        textual-webterm -a ./calculator.py:CalculatorApp  # Serve from file
    """
    VERSION = version("textual-webterm")
    log.info("textual-webterm v%s", VERSION)

    if constants.DEBUG:
        log.warning("DEBUG env var is set; logs may be verbose!")

    from .config import default_config, load_compose_manifest, load_landing_yaml

    _config = default_config()

    landing_apps: list = []
    if landing_manifest:
        landing_apps = load_landing_yaml(landing_manifest)
    elif compose_manifest:
        landing_apps = load_compose_manifest(compose_manifest)

    server = LocalServer(
        "./",
        _config,
        host=host,
        port=port,
        landing_apps=landing_apps,
    )
    for app_entry in landing_apps:
        server.add_terminal(app_entry.name, app_entry.command, slug=app_entry.slug)

    if app_path:
        # Load and run as Textual app from module:class
        try:
            app_class = load_app_class(app_path)
        except click.BadParameter as e:
            log.error(str(e))
            sys.exit(1)

        # Create a command that runs the app using python -m runpy for safety
        module_part, class_name = parse_app_path(app_path)
        if _is_file_path(module_part):
            # File path - use absolute path and proper escaping
            file_path = Path(module_part).resolve()
            # Use runpy to safely run the file
            escaped_path = str(file_path).replace("'", "'\"'\"'")
            escaped_class = class_name.replace("'", "'\"'\"'")
            run_command = f'python3 -c \'import sys; sys.path.insert(0, "{file_path.parent}"); exec(open("{escaped_path}").read()); {escaped_class}().run()\''
        else:
            # Module path - validate module and class names
            if not module_part.replace(".", "").replace("_", "").isalnum():
                log.error("Invalid module path: %s", module_part)
                sys.exit(1)
            if not class_name.isidentifier():
                log.error("Invalid class name: %s", class_name)
                sys.exit(1)
            run_command = (
                f'python3 -c "from {module_part} import {class_name}; {class_name}().run()"'
            )

        app_name = getattr(app_class, "TITLE", None) or class_name
        server.add_app(app_name, run_command, "")
        log.info("Serving Textual app: %s", app_path)
    elif command:
        # Run command as terminal
        server.add_terminal("Terminal", command, "")
        log.info("Serving terminal: %s", command)
    elif not landing_apps:
        # Run default shell
        terminal_command = os.environ.get("SHELL", "/bin/sh")
        server.add_terminal("Terminal", terminal_command, "")
        log.info("Serving terminal: %s", terminal_command)

    def _run_async():
        if constants.WINDOWS:
            asyncio.run(server.run())
        else:
            try:
                import uvloop
            except ImportError:
                asyncio.run(server.run())
            else:
                if sys.version_info >= (3, 11):
                    with asyncio.Runner(loop_factory=uvloop.new_event_loop) as runner:
                        runner.run(server.run())
                else:
                    uvloop.install()
                    asyncio.run(server.run())

    _run_async()


if __name__ == "__main__":
    app()

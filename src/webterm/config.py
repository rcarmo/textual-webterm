from os.path import expandvars
from pathlib import Path
from typing import Annotated

try:
    import tomllib as tomli  # py311+
except ImportError:  # pragma: no cover
    import tomli
import yaml
from pydantic import BaseModel, Field
from pydantic.functional_validators import AfterValidator

from .identity import generate
from .slugify import slugify

ExpandVarsStr = Annotated[str, AfterValidator(expandvars)]


class App(BaseModel):
    """Defines an application."""

    name: str
    slug: str = ""
    path: ExpandVarsStr = "./"
    color: str = ""
    command: ExpandVarsStr = ""
    terminal: bool = False
    theme: str | None = None


class Config(BaseModel):
    """Root configuration model."""

    apps: list[App] = Field(default_factory=list)


def default_config() -> Config:
    """Get a default empty configuration.

    Returns:
        Configuration object.
    """
    return Config()


def load_config(config_path: Path) -> Config:
    """Load config from a path.

    Args:
        config_path: Path to TOML configuration.

    Returns:
        Config object.
    """
    with Path(config_path).open("rb") as config_file:
        config_data = tomli.load(config_file)

    def make_app(name, data: dict[str, object], terminal: bool = False) -> App:
        data["name"] = name
        data["terminal"] = terminal
        if terminal:
            data["slug"] = generate().lower()
        elif not data.get("slug", ""):
            data["slug"] = slugify(name)

        return App(**data)

    terminal_entries = config_data.get("terminal", {})
    app_entries = config_data.get("app", {})
    if app_entries:
        raise ValueError("App manifests are no longer supported; use [terminal.*] entries only.")

    apps = [make_app(name, app, terminal=True) for name, app in terminal_entries.items()]

    config = Config(apps=apps)

    return config


def load_landing_yaml(manifest_path: Path) -> list[App]:
    """Load landing apps from YAML manifest.

    Expected schema: list of {name, slug, command, color?, path?, terminal?}
    """
    with manifest_path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or []
    apps: list[App] = []
    for entry in data:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name")
        command = entry.get("command")
        if not name or not command:
            continue
        slug = entry.get("slug") or slugify(name)
        apps.append(
            App(
                name=name,
                slug=slug,
                command=command,
                path=entry.get("path", "./"),
                color=entry.get("color", ""),
                terminal=bool(entry.get("terminal", True)),
            )
        )
    return apps


def _extract_label(labels: object, key: str) -> str | None:
    """Extract a label value from either dict or list[str] forms."""
    if isinstance(labels, dict):
        value = labels.get(key)
        if isinstance(value, str):
            return value
        return None
    if isinstance(labels, list):
        for item in labels:
            if not isinstance(item, str):
                continue
            if "=" in item:
                k, v = item.split("=", 1)
                if k == key:
                    return v
    return None


def load_compose_manifest(manifest_path: Path) -> list[App]:
    """Load landing apps from a docker-compose YAML file using label `webterm-command`."""
    with manifest_path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    services = data.get("services", {}) if isinstance(data, dict) else {}
    apps: list[App] = []
    for name, service in services.items():
        if not isinstance(service, dict):
            continue
        labels = service.get("labels", {})
        command = _extract_label(labels, "webterm-command")
        if not command:
            continue
        theme = _extract_label(labels, "webterm-theme")
        slug = slugify(name)
        apps.append(
            App(
                name=name,
                slug=slug,
                command=command,
                path=service.get("working_dir", "./"),
                color="",
                terminal=True,
                theme=theme,
            )
        )
    return apps

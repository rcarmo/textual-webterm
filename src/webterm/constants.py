"""
Constants that we might want to expose via the public API.
"""

from __future__ import annotations

import os
import platform
from typing import Final

get_environ = os.environ.get

WINDOWS: Final = platform.system() == "Windows"
"""True if running on Windows."""


def get_environ_bool(name: str) -> bool:
    """Check an environment variable switch.

    Args:
        name: Name of environment variable.

    Returns:
        `True` if the env var is a truthy value, otherwise `False`.
    """
    value = get_environ(name)
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def get_environ_int(name: str, default: int) -> int:
    """Retrieves an integer environment variable.

    Args:
        name: Name of environment variable.
        default: The value to use if the value is not set, or set to something other
            than a valid integer.

    Returns:
        The integer associated with the environment variable if it's set to a valid int
            or the default value otherwise.
    """
    try:
        return int(os.environ[name])
    except KeyError:
        return default
    except ValueError:
        return default


DEBUG: Final = get_environ_bool("DEBUG")
"""Enable debug mode."""

SCREENSHOT_FORCE_REDRAW_ENV: Final = "WEBTERM_SCREENSHOT_FORCE_REDRAW"
"""Environment variable to force redraw before screenshots."""

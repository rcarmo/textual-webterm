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
        `True` if the env var is "1", otherwise `False`.
    """
    has_environ = get_environ(name) == "1"
    return has_environ


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

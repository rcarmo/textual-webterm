from __future__ import annotations

import asyncio
import logging
import shlex
import sys
from typing import TYPE_CHECKING

from . import config, constants
from ._two_way_dict import TwoWayDict
from .docker_exec_session import DockerExecSession, DockerExecSpec
from .docker_watcher import AUTO_COMMAND_SENTINEL, _get_auto_command
from .identity import generate

if TYPE_CHECKING:
    from pathlib import Path

    from .poller import Poller
    from .session import Session
    from .types import RouteKey, SessionID


log = logging.getLogger("webterm")


if not constants.WINDOWS:
    from .terminal_session import TerminalSession


class SessionManager:
    """Manage terminal sessions."""

    def __init__(self, poller: Poller, path: Path, apps: list[config.App]) -> None:
        self.poller = poller
        self.path = path
        self.apps = apps
        self.apps_by_slug = {app.slug: app for app in apps}
        self.sessions: dict[SessionID, Session] = {}
        self.routes: TwoWayDict[RouteKey, SessionID] = TwoWayDict()

    def add_app(
        self,
        name: str,
        command: str,
        slug: str,
        terminal: bool = False,
        theme: str | None = None,
    ) -> None:
        """Add a new app

        Args:
            name: Name of the app.
            command: Command to run the app.
            slug: Slug used in URL, or blank to auto-generate on server.
        """
        slug = slug or generate().lower()
        new_app = config.App(
            name=name, slug=slug, path="./", command=command, terminal=terminal, theme=theme
        )
        self.apps.append(new_app)
        self.apps_by_slug[slug] = new_app

    def get_default_app(self) -> config.App | None:
        """Get the default app (first configured app), or ``None``."""
        return self.apps[0] if self.apps else None

    def on_session_end(self, session_id: SessionID) -> None:
        """Called when a session ends."""
        self.sessions.pop(session_id, None)
        route_key = self.routes.get_key(session_id)
        if route_key is not None:
            del self.routes[route_key]
        log.debug("Session %s ended", session_id)

    async def close_all(self, timeout: float = 3.0) -> None:
        """Close app sessions.

        Args:
            timeout: Time (in seconds) to wait before giving up.

        """
        sessions = list(self.sessions.values())

        if not sessions:
            return
        log.info("Closing %s session(s)", len(sessions))

        async def do_close() -> int:
            """Close all sessions, return number unclosed after timeout

            Returns:
                Number of sessions not yet closed.
            """

            async def close_wait(session: Session) -> None:
                await asyncio.gather(session.close(), session.wait())

            if sys.version_info >= (3, 11):
                async with asyncio.TaskGroup() as tg:  # type: ignore[attr-defined]
                    for session in sessions:
                        tg.create_task(close_wait(session))
                return 0
            _done, remaining = await asyncio.wait(
                [asyncio.create_task(close_wait(session)) for session in sessions],
                timeout=timeout,
            )
            return len(remaining)

        remaining = await do_close()
        if remaining:
            log.warning("%s session(s) didn't close after %s seconds", remaining, timeout)

    async def new_session(
        self,
        slug: str,
        session_id: SessionID,
        route_key: RouteKey,
        size: tuple[int, int] = (80, 24),
    ) -> Session | None:
        """Create a new session.

        Args:
            slug: Slug for app.
            session_id: Session identity.
            route_key: Route key.
            size: Terminal size (width, height).

        Returns:
            New session, or `None` if no app / terminal configured.
        """
        app = self.apps_by_slug.get(slug)
        if app is None:
            return None

        session_process: Session
        if constants.WINDOWS:
            log.warning("Sorry, webterm does not currently support terminals on Windows")
            return None
        if app.command == AUTO_COMMAND_SENTINEL:
            exec_spec = DockerExecSpec(
                container=app.name,
                command=shlex.split(_get_auto_command()),
            )
            session_process = DockerExecSession(self.poller, session_id, exec_spec)
        else:
            session_process = TerminalSession(
                self.poller,
                session_id,
                app.command,
            )
        log.info("Created terminal session %s", session_id)

        # Open the session BEFORE registering it, so it's fully initialized
        # when other code can access it via sessions/routes dicts
        await session_process.open(*size)
        log.debug("Session %s opened and ready", session_id)

        # Now register the fully initialized session
        self.sessions[session_id] = session_process
        self.routes[route_key] = session_id

        return session_process

    async def close_session(self, session_id: SessionID) -> None:
        """Close a session.

        Args:
            session_id: Session identity.
        """
        session_process = self.sessions.get(session_id, None)
        if session_process is None:
            return
        await session_process.close()

    def get_session(self, session_id: SessionID) -> Session | None:
        """Get a session from a session ID.

        Args:
            session_id: Session identity.

        Returns:
            A session or `None` if it doesn't exist.
        """
        return self.sessions.get(session_id)

    def get_session_by_route_key(self, route_key: RouteKey) -> Session | None:
        """Get a session from a route key.

        Args:
            route_key: A route key.

        Returns:
            A session or `None` if it doesn't exist.

        """
        session_id = self.routes.get(route_key)
        if session_id is not None:
            return self.sessions.get(session_id)
        return None

    def get_first_running_session(self) -> tuple[RouteKey, Session] | None:
        """Get the first running session.

        Returns:
            Tuple of (route_key, session) or None if no running sessions.
        """
        for route_key in self.routes:
            session_id = self.routes.get(route_key)
            if session_id:
                session = self.sessions.get(session_id)
                if session and session.is_running():
                    return (route_key, session)
        return None

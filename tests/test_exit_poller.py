import asyncio

import pytest


@pytest.mark.asyncio
async def test_exit_poller_noop_when_idle_wait_zero(monkeypatch):
    from textual_webterm import exit_poller
    from textual_webterm.exit_poller import ExitPoller

    monkeypatch.setattr(exit_poller, "EXIT_POLL_RATE", 0.01)

    class FakeServer:
        def __init__(self):
            class SM:
                def __init__(self):
                    self.sessions = {}

            self.session_manager = SM()
            self.exited = False

        def force_exit(self):
            self.exited = True

    server = FakeServer()
    poller = ExitPoller(server, idle_wait=0)
    poller.start()
    await asyncio.sleep(0.05)
    poller.stop()
    assert server.exited is False


@pytest.mark.asyncio
async def test_exit_poller_resets_idle_timer_when_session_appears(monkeypatch):
    from textual_webterm import exit_poller
    from textual_webterm.exit_poller import ExitPoller

    monkeypatch.setattr(exit_poller, "EXIT_POLL_RATE", 0.01)

    class FakeServer:
        def __init__(self):
            class SM:
                def __init__(self):
                    self.sessions = {}

            self.session_manager = SM()
            self.exited = False

        def force_exit(self):
            self.exited = True

    server = FakeServer()
    poller = ExitPoller(server, idle_wait=0.05)
    poller.start()

    # Let it become idle briefly, then add a session to reset.
    await asyncio.sleep(0.02)
    server.session_manager.sessions["x"] = object()
    await asyncio.sleep(0.02)
    server.session_manager.sessions.clear()

    # Now ensure it can still exit after being idle long enough.
    await asyncio.sleep(0.1)
    poller.stop()
    assert server.exited is True

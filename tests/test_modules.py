"""Tests for constants module."""


class TestConstants:
    """Tests for constants module."""

    def test_import(self):
        """Test module can be imported."""
        from textual_webterm import constants

        assert constants is not None

    def test_debug_exists(self, monkeypatch):
        """Test DEBUG constant exists and respects env var."""
        import importlib

        from textual_webterm import constants

        assert hasattr(constants, "DEBUG")
        assert isinstance(constants.DEBUG, bool)

        monkeypatch.setenv("DEBUG", "1")
        reloaded = importlib.reload(constants)
        assert reloaded.DEBUG is True

        monkeypatch.setenv("DEBUG", "0")
        reloaded = importlib.reload(constants)
        assert reloaded.DEBUG is False


class TestExitPoller:
    """Tests for exit_poller module."""

    def test_import(self):
        """Test module can be imported."""
        from textual_webterm.exit_poller import ExitPoller

        assert ExitPoller is not None

    async def test_exits_when_idle(self, monkeypatch):
        """ExitPoller should call force_exit after idle_wait seconds with no sessions."""
        import asyncio

        from textual_webterm import exit_poller
        from textual_webterm.exit_poller import ExitPoller

        # Speed up the poll loop for the unit test.
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
        poller = ExitPoller(server, idle_wait=0.02)
        poller.start()
        await asyncio.sleep(0.1)
        poller.stop()
        assert server.exited is True

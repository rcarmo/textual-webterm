"""Tests for poller module."""

import asyncio
import contextlib
from unittest.mock import MagicMock, patch

import pytest

from textual_webterm.poller import Poller, Write


class TestWrite:
    """Tests for Write dataclass."""

    def test_create_write(self):
        """Test creating a Write object."""
        write = Write(data=b"test")
        assert write.data == b"test"
        assert write.position == 0
        assert write.done_event is not None

    def test_write_with_position(self):
        """Test Write with custom position."""
        write = Write(data=b"test", position=5)
        assert write.position == 5


class TestPoller:
    """Tests for Poller class."""

    def test_init(self):
        """Test Poller initialization."""
        poller = Poller()
        assert poller._loop is None
        assert poller._read_queues == {}
        assert poller._write_queues == {}
        assert not poller._exit_event.is_set()

    def test_set_loop(self):
        """Test setting the asyncio loop."""
        poller = Poller()
        mock_loop = MagicMock()
        poller.set_loop(mock_loop)
        assert poller._loop == mock_loop

    def test_add_file(self):
        """Test adding a file descriptor."""
        poller = Poller()
        # Use a mock file descriptor
        with patch.object(poller._selector, "register"):
            queue = poller.add_file(42)
            assert 42 in poller._read_queues
            assert isinstance(queue, asyncio.Queue)

    def test_remove_file(self):
        """Test removing a file descriptor."""
        poller = Poller()
        # Add first
        with patch.object(poller._selector, "register"):
            poller.add_file(42)

        # Remove
        with patch.object(poller._selector, "unregister"):
            poller.remove_file(42)
            assert 42 not in poller._read_queues

    def test_remove_nonexistent_file(self):
        """Test removing a non-existent file descriptor."""
        poller = Poller()
        with patch.object(poller._selector, "unregister"):
            # Should not raise
            poller.remove_file(999)

    @pytest.mark.asyncio
    async def test_write_creates_queue(self):
        """Test that write creates a write queue if needed."""
        poller = Poller()
        poller._loop = asyncio.get_event_loop()

        # Mock selector
        with patch.object(poller._selector, "register"):
            poller.add_file(42)

        with patch.object(poller._selector, "modify"):
            # Start write in background (won't complete without poller running)
            task = asyncio.create_task(poller.write(42, b"test"))

            # Give it time to set up
            await asyncio.sleep(0.01)

            assert 42 in poller._write_queues
            assert len(poller._write_queues[42]) == 1

            # Cancel to clean up
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

    def test_exit_sets_event(self):
        """Test that exit sets the exit event."""
        poller = Poller()
        poller._exit_event.clear()

        # Mock join to avoid blocking
        with patch.object(poller, "join"):
            poller.exit()

        assert poller._exit_event.is_set()
        assert poller._read_queues == {}
        assert poller._write_queues == {}

    def test_exit_puts_none_in_queues(self):
        """Test that exit puts None in all read queues."""
        poller = Poller()

        # Add some queues
        with patch.object(poller._selector, "register"):
            q1 = poller.add_file(1)
            q2 = poller.add_file(2)

        # Mock join
        with patch.object(poller, "join"):
            poller.exit()

        # Queues should have None
        assert q1.get_nowait() is None
        assert q2.get_nowait() is None

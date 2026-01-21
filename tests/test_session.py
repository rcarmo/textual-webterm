"""Tests for session management."""

from __future__ import annotations

from textual_webterm.types import RouteKey, SessionID


class TestTypes:
    """Tests for type definitions."""

    def test_session_id_is_string(self) -> None:
        """Test that SessionID is a string type."""
        session_id = SessionID("test-session-123")
        assert isinstance(session_id, str)
        assert session_id == "test-session-123"

    def test_route_key_is_string(self) -> None:
        """Test that RouteKey is a string type."""
        route_key = RouteKey("abc123")
        assert isinstance(route_key, str)
        assert route_key == "abc123"


class TestIdentity:
    """Tests for identity generation."""

    def test_generate_unique_ids(self) -> None:
        """Test that generated IDs are unique."""
        from textual_webterm.identity import generate

        ids = [generate() for _ in range(100)]
        assert len(set(ids)) == 100  # All unique

    def test_generate_id_format(self) -> None:
        """Test that generated IDs have expected format."""
        from textual_webterm.identity import generate

        id_ = generate()
        assert isinstance(id_, str)
        assert len(id_) > 0

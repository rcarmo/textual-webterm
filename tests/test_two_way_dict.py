"""Tests for TwoWayDict."""

from __future__ import annotations

from textual_webterm._two_way_dict import TwoWayDict


class TestTwoWayDict:
    """Tests for TwoWayDict bidirectional mapping."""

    def test_set_and_get(self) -> None:
        """Test basic set and get operations."""
        d: TwoWayDict[str, int] = TwoWayDict()
        d["a"] = 1
        d["b"] = 2
        assert d.get("a") == 1
        assert d.get("b") == 2

    def test_get_key(self) -> None:
        """Test reverse lookup by value."""
        d: TwoWayDict[str, int] = TwoWayDict()
        d["a"] = 1
        d["b"] = 2
        assert d.get_key(1) == "a"
        assert d.get_key(2) == "b"

    def test_delete(self) -> None:
        """Test deletion removes both mappings."""
        d: TwoWayDict[str, int] = TwoWayDict()
        d["a"] = 1
        del d["a"]
        assert d.get("a") is None
        assert d.get_key(1) is None

    def test_contains(self) -> None:
        """Test key containment check."""
        d: TwoWayDict[str, int] = TwoWayDict()
        d["a"] = 1
        assert "a" in d
        assert "b" not in d

    def test_contains_value(self) -> None:
        """Test value containment check."""
        d: TwoWayDict[str, int] = TwoWayDict()
        d["a"] = 1
        assert d.contains_value(1) is True
        assert d.contains_value(2) is False

    def test_len(self) -> None:
        """Test length of dictionary."""
        d: TwoWayDict[str, int] = TwoWayDict()
        assert len(d) == 0
        d["a"] = 1
        assert len(d) == 1
        d["b"] = 2
        assert len(d) == 2

    def test_iter(self) -> None:
        """Test iteration over keys."""
        d: TwoWayDict[str, int] = TwoWayDict()
        d["a"] = 1
        d["b"] = 2
        keys = list(d)
        assert "a" in keys
        assert "b" in keys

    def test_initial_data(self) -> None:
        """Test initialization with data."""
        d: TwoWayDict[str, int] = TwoWayDict({"a": 1, "b": 2})
        assert d.get("a") == 1
        assert d.get_key(2) == "b"

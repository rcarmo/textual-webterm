"""Tests for constants helpers."""

from __future__ import annotations


def test_get_environ_bool(monkeypatch):
    from textual_webterm.constants import get_environ_bool

    monkeypatch.setenv("FLAG", "1")
    assert get_environ_bool("FLAG") is True

    monkeypatch.setenv("FLAG", "0")
    assert get_environ_bool("FLAG") is False


def test_get_environ_int_keyerror(monkeypatch):
    from textual_webterm.constants import get_environ_int

    monkeypatch.delenv("INT", raising=False)
    assert get_environ_int("INT", 7) == 7


def test_get_environ_int_valueerror(monkeypatch):
    from textual_webterm.constants import get_environ_int

    monkeypatch.setenv("INT", "not-an-int")
    assert get_environ_int("INT", 7) == 7


def test_get_environ_int_valid(monkeypatch):
    from textual_webterm.constants import get_environ_int

    monkeypatch.setenv("INT", "42")
    assert get_environ_int("INT", 7) == 42

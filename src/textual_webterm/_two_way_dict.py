from __future__ import annotations

import threading
from typing import Generic, TypeVar

Key = TypeVar("Key")
Value = TypeVar("Value")


class TwoWayDict(Generic[Key, Value]):
    """
    A two-way mapping offering O(1) access in both directions.

    Wraps two dictionaries and uses them to provide efficient access to
    both values (given keys) and keys (given values).
    """

    def __init__(self, initial: dict[Key, Value] | None = None) -> None:
        initial_data = {} if initial is None else initial
        self._forward: dict[Key, Value] = initial_data
        self._reverse: dict[Value, Key] = {value: key for key, value in initial_data.items()}
        self._lock = threading.RLock()

    def __setitem__(self, key: Key, value: Value) -> None:
        with self._lock:
            # If reassigning the same key, remove old reverse mapping first
            old_value = self._forward.get(key)
            if old_value is not None and old_value != value:
                del self._reverse[old_value]
            # Enforce 1:1 mapping: value must not already map to a different key
            existing_key = self._reverse.get(value)
            if existing_key is not None and existing_key != key:
                raise ValueError(f"Value {value!r} already mapped to key {existing_key!r}")
            self._forward[key] = value
            self._reverse[value] = key

    def __delitem__(self, key: Key) -> None:
        with self._lock:
            value = self._forward[key]
            self._forward.__delitem__(key)
            self._reverse.__delitem__(value)

    def __iter__(self):
        with self._lock:
            return iter(dict(self._forward))

    def get(self, key: Key) -> Value | None:
        """Given a key, efficiently lookup and return the associated value.

        Args:
            key: The key

        Returns:
            The value
        """
        with self._lock:
            return self._forward.get(key)

    def get_key(self, value: Value) -> Key | None:
        """Given a value, efficiently lookup and return the associated key.

        Args:
            value: The value

        Returns:
            The key
        """
        with self._lock:
            return self._reverse.get(value)

    def contains_value(self, value: Value) -> bool:
        """Check if `value` is a value within this TwoWayDict.

        Args:
            value: The value to check.

        Returns:
            True if the value is within the values of this dict.
        """
        with self._lock:
            return value in self._reverse

    def __len__(self):
        with self._lock:
            return len(self._forward)

    def __contains__(self, item: Key) -> bool:
        with self._lock:
            return item in self._forward

"""Custom pyte Screen with alternate screen buffer support.

pyte's standard Screen class doesn't implement DECSET/DECRST 1049 (alternate screen buffer)
which causes issues when programs like tmux, vim, less, etc. switch between main and alternate
screens. Without this, screen clearing in tmux panes shows overlapping old and new content
in screenshots.

This module provides AltScreen, a Screen subclass that properly saves and restores
the screen buffer when switching between main and alternate screen modes.
"""

from __future__ import annotations

import copy
import re
from typing import TYPE_CHECKING, Any

import pyte

# Pattern to match a run of 3+ (EL2 + CUU1) pairs used by Ink/React CLI
# to erase the previous frame before drawing the next one.
_INK_CLEAR_PATTERN = re.compile(rb"(\x1b\[2K\x1b\[1A){3,}")
_EL2_CUU1 = b"\x1b[2K\x1b[1A"

if TYPE_CHECKING:
    from pyte.screens import Char

# Private mode alternate screen buffers (1047/1048/1049/47) - shifted by 5 per pyte's convention
DECALTBUF = 1049 << 5
DECALTBUF_1047 = 1047 << 5
DECALTBUF_1048 = 1048 << 5
DECALTBUF_47 = 47 << 5


class AltScreen(pyte.Screen):
    """A pyte Screen with proper alternate screen buffer support.

    Implements DECSET/DECRST 1049 to save and restore the main screen buffer
    when programs switch to alternate screen mode.

    """

    def __init__(self, columns: int, lines: int, *args: Any, **kwargs: Any) -> None:
        super().__init__(columns, lines, *args, **kwargs)
        # Storage for main screen state when in alternate mode
        self._saved_buffer: dict[int, dict[int, Char]] | None = None
        self._saved_cursor: pyte.screens.Cursor | None = None

    def _save_main_screen(self) -> None:
        """Save the current screen buffer and cursor for later restoration."""
        # Deep copy the buffer to avoid aliasing
        # Save all rows within current screen bounds with all their column data
        self._saved_buffer = {}
        for row_idx in range(self.lines):
            self._saved_buffer[row_idx] = {
                col: self.buffer[row_idx][col] for col in range(self.columns)
            }
        # Save cursor state
        self._saved_cursor = copy.copy(self.cursor)

    def _restore_main_screen(self) -> None:
        """Restore the previously saved screen buffer and cursor."""
        if self._saved_buffer is not None:
            # Restore buffer - copy characters into existing line structures
            for row_idx in range(self.lines):
                if row_idx in self._saved_buffer:
                    saved_row = self._saved_buffer[row_idx]
                    for col in range(self.columns):
                        if col in saved_row:
                            self.buffer[row_idx][col] = saved_row[col]
                        else:
                            self.buffer[row_idx][col] = self.default_char
                else:
                    # Clear rows that weren't in saved buffer
                    for col in range(self.columns):
                        self.buffer[row_idx][col] = self.default_char
            self._saved_buffer = None

        if self._saved_cursor is not None:
            self.cursor = self._saved_cursor
            self._saved_cursor = None

        # Mark all lines as dirty for re-render
        self.dirty.update(range(self.lines))

    def _is_alt_buffer_mode(self, modes: tuple[int, ...]) -> bool:
        return 47 in modes or 1047 in modes or 1048 in modes or 1049 in modes

    def _has_alt_buffer_enabled(self) -> bool:
        return (
            DECALTBUF in self.mode
            or DECALTBUF_1047 in self.mode
            or DECALTBUF_1048 in self.mode
            or DECALTBUF_47 in self.mode
        )

    def set_mode(self, *modes: int, **kwargs: Any) -> None:
        """Set (enable) modes, with special handling for alternate screen buffer."""
        # Check if we're entering alternate screen mode (private mode 47/1047/1048/1049)
        if kwargs.get("private") and self._is_alt_buffer_mode(modes) and not self._has_alt_buffer_enabled():
            # Save main screen before switching
            self._save_main_screen()
            # Clear screen for alternate buffer
            self.erase_in_display(2)
            self.cursor_position()

        # Call parent implementation
        super().set_mode(*modes, **kwargs)

    def reset_mode(self, *modes: int, **kwargs: Any) -> None:
        """Reset (disable) modes, with special handling for alternate screen buffer."""
        # Check if we're leaving alternate screen mode (private mode 47/1047/1048/1049)
        if kwargs.get("private") and self._is_alt_buffer_mode(modes) and self._has_alt_buffer_enabled():
            # Will be removed by parent, restore main screen after
            super().reset_mode(*modes, **kwargs)
            self._restore_main_screen()
            return

        # Call parent implementation
        super().reset_mode(*modes, **kwargs)

    def resize(self, lines: int | None = None, columns: int | None = None) -> None:
        """Resize screen, clearing saved alternate buffer if size changes."""
        # If we're in alternate mode and resizing, the saved buffer may be invalid
        if self._saved_buffer is not None and (
            (lines is not None and lines != self.lines)
            or (columns is not None and columns != self.columns)
        ):
            # Invalidate saved buffer on resize - it won't match the new dimensions
            self._saved_buffer = None
            self._saved_cursor = None

        super().resize(lines, columns)

    def expand_clear_sequences(self, data: bytes) -> bytes:
        """Expand partial line-by-line clears to cover the full screen.

        CLI frameworks like Ink (React for terminals) erase their previous
        output using repeated ``EL2 + CUU1`` (erase line, cursor up) sequences.
        When the application's ``/clear`` command resets the framework's internal
        line counter, the next frame only erases a few lines instead of the full
        previous output.  In a real terminal the old content has scrolled into the
        scrollback buffer, but pyte keeps it visible, producing ghost content in
        screenshots.

        This method detects such partial clears and extends them so that all
        lines from the cursor position up to row 0 are erased.
        """
        if _EL2_CUU1 not in data:
            return data

        cursor_y = self.cursor.y

        def _extend(match: re.Match[bytes]) -> bytes:
            nonlocal cursor_y
            run = match.group(0)
            pair_count = len(run) // len(_EL2_CUU1)
            extra = cursor_y - pair_count
            cursor_y = max(cursor_y - pair_count, 0)
            if extra > 0:
                return run + _EL2_CUU1 * extra
            return run

        return _INK_CLEAR_PATTERN.sub(_extend, data)

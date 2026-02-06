# Ink Partial Clear Fix

## Problem

When CLI applications built with [Ink](https://github.com/vadimdemedes/ink) (React for terminals) — such as GitHub Copilot CLI — execute a `/clear` command, the resulting screenshot shows **ghost content**: old conversation lines persist above the fresh prompt.

The real terminal displays correctly, but the pyte-based screen buffer used for SVG screenshot generation retains the stale content.

### Example

Before `/clear`, the screen has 30 lines of conversation. After `/clear`, the user sees only a fresh 6-line prompt, but the screenshot shows:

```
Row  0: [old prompt header]          ← ghost content
Row  1: [────────────────]
Row  2: [❯ hello]
...
Row 20: [● old response text]        ← ghost content
Row 21: [/workspace[main]]           ← fresh prompt (duplicated)
Row 22: [────────────────]
Row 23: [❯  Type @ to mention files]
Row 24: [────────────────]
Row 25: [shift+tab cycle mode]
```

## Root Cause

Ink uses a **line-by-line erase** pattern to clear its previous frame before drawing the next one:

```
ESC[2K  (EL2 — erase entire line)
ESC[1A  (CUU1 — cursor up one row)
```

This pair is repeated once per line of the **previous** frame. Ink tracks how many lines it rendered and erases exactly that many before redrawing.

When `/clear` is issued:

1. Ink resets its internal "previous output height" counter to 0.
2. On the next render cycle, Ink erases **0 old lines** (counter is 0), then draws the fresh prompt (~6 lines).
3. The subsequent render erases 6 lines (the prompt it just drew), redraws — correct from now on.

In a real terminal, the old content has already **scrolled into the scrollback buffer** and is invisible. But pyte's fixed-size `Screen` keeps all content in the visible buffer. The 6-line erase only clears rows at the bottom, leaving rows 0–24 with orphaned old content.

### Byte-level example

Cursor at row 30 after rendering a full conversation:

```
Frame N (normal):   EL2+CUU1 × 28 (clears rows 30→2)  + redraw 28 lines  ✓
/clear resets counter
Frame N+1 (broken): EL2+CUU1 × 6  (clears rows 30→24) + redraw 6 lines   ✗
                    Rows 0–23 still contain old content!
```

## Fix

`AltScreen.expand_clear_sequences()` in `alt_screen.py` pre-processes incoming terminal data before it reaches pyte. It detects runs of 3+ `EL2+CUU1` pairs and, if the run doesn't reach row 0, extends it with additional pairs so the erase covers all lines from the cursor position up to the top of the screen.

```python
# Before fix: 6 pairs clear rows 30→24, leaving 0–23 dirty
data = b"\x1b[2K\x1b[1A" * 6

# After expand_clear_sequences(): 30 pairs clear rows 30→0
data = screen.expand_clear_sequences(data)
# Now contains 30 pairs of EL2+CUU1
```

Both `DockerExecSession._update_screen()` and `TerminalSession._update_screen()` call this method after C1 normalization and before feeding data to `pyte.ByteStream`.

### Why this is safe

- The fix only triggers on runs of **3 or more** `EL2+CUU1` pairs (normal editing uses 1–2 at most).
- It only **adds** additional erase operations for lines that would already be empty in a real terminal (they scrolled into scrollback).
- The extra erases are no-ops if the lines are already blank.
- Short runs (< 3 pairs) and runs that already reach row 0 are left unchanged.

## Reproducing

```python
from webterm.alt_screen import AltScreen
import pyte

screen = AltScreen(132, 45)
stream = pyte.ByteStream(screen)

# Draw 27 lines of content
for i in range(27):
    stream.feed(f"Content line {i}\r\n".encode())

# Ink /clear: only erases 6 lines
partial_clear = b"\x1b[2K\x1b[1A" * 6 + b"\x1b[2K\x1b[G"

# Without fix: old content remains on rows 0–20
# With fix: all rows are cleared
expanded = screen.expand_clear_sequences(partial_clear)
stream.feed(expanded)

# Draw fresh prompt
stream.feed(b"Fresh prompt\r\n")

non_empty = [line for line in screen.display if line.strip()]
assert len(non_empty) == 1  # Only "Fresh prompt"
```

## Related

- `WEBTERM_SCREENSHOT_FORCE_REDRAW` env var — sends SIGWINCH to force app redraw before screenshots, but doesn't fix this issue since Ink still only erases its tracked line count.
- `docs/tmux-da-response-filtering.md` — another terminal compatibility fix.
- pyte's known limitations with partial screen clearing are noted in `README.md`.

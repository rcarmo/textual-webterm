"""Custom SVG exporter for terminal screenshots.

Generates SVG directly from pyte screen buffer, avoiding Rich's export_svg() quirks.
"""

from __future__ import annotations

import html
from typing import TypedDict

# ANSI color names to hex values (standard 16-color palette)
ANSI_COLORS: dict[str, str] = {
    # Normal colors
    "black": "#000000",
    "red": "#cc0000",
    "green": "#4e9a06",
    "yellow": "#c4a000",
    "blue": "#3465a4",
    "magenta": "#75507b",
    "cyan": "#06989a",
    "white": "#d3d7cf",
    # Bright colors
    "brightblack": "#555753",
    "brightred": "#ef2929",
    "brightgreen": "#8ae234",
    "brightyellow": "#fce94f",
    "brightblue": "#729fcf",
    "brightmagenta": "#ad7fa8",
    "brightcyan": "#34e2e2",
    "brightwhite": "#eeeeec",
    # Alternative names
    "gray": "#555753",
    "grey": "#555753",
    "lightgray": "#d3d7cf",
    "lightgrey": "#d3d7cf",
    "brown": "#c4a000",
}

# Default colors
DEFAULT_FG = "#d3d7cf"
DEFAULT_BG = "#000000"

# Font settings
FONT_FAMILY = (
    'ui-monospace, "SFMono-Regular", "FiraCode Nerd Font", "FiraMono Nerd Font", '
    '"Fira Code", "Roboto Mono", Menlo, Monaco, Consolas, "Liberation Mono", '
    '"DejaVu Sans Mono", "Courier New", monospace'
)
FONT_SIZE = 14
LINE_HEIGHT = 1.2
CHAR_WIDTH = 8.4  # Approximate width of monospace character at 14px


class CharData(TypedDict):
    """Character data from pyte screen buffer."""

    data: str
    fg: str
    bg: str
    bold: bool
    italics: bool
    underscore: bool
    reverse: bool


def _color_to_hex(color: str, is_foreground: bool = True) -> str:
    """Convert pyte color to hex value."""
    if color == "default":
        return DEFAULT_FG if is_foreground else DEFAULT_BG

    # Already a hex color with #
    if color.startswith("#"):
        return color

    # Hex color without # prefix (pyte's 256-color/truecolor format)
    # Check if it looks like a hex color (6 hex digits)
    if len(color) == 6 and all(c in "0123456789abcdefABCDEF" for c in color):
        return f"#{color}"

    # Named color lookup (case-insensitive)
    lower = color.lower()
    if lower in ANSI_COLORS:
        return ANSI_COLORS[lower]

    # RGB format "rgb(r,g,b)" - rarely used but handle it
    if lower.startswith("rgb("):
        # Not common in terminal output, return default
        return DEFAULT_FG if is_foreground else DEFAULT_BG

    return DEFAULT_FG if is_foreground else DEFAULT_BG


def _escape_xml(text: str) -> str:
    """Escape special XML characters."""
    return html.escape(text, quote=True)


def render_terminal_svg(
    screen_buffer: list[list[CharData]],
    width: int,
    height: int,
    *,
    title: str = "Terminal",
    font_size: int = FONT_SIZE,
    char_width: float = CHAR_WIDTH,
    line_height: float = LINE_HEIGHT,
    background: str = DEFAULT_BG,
    foreground: str = DEFAULT_FG,
) -> str:
    """Render terminal screen buffer to SVG.

    Args:
        screen_buffer: 2D list of CharData dicts from pyte
        width: Terminal width in columns
        height: Terminal height in rows
        title: SVG title (for accessibility)
        font_size: Font size in pixels
        char_width: Width of a single character
        line_height: Line height multiplier
        background: Background color
        foreground: Default foreground color

    Returns:
        SVG string
    """
    # Calculate dimensions
    actual_line_height = font_size * line_height
    svg_width = width * char_width + 20  # Add padding
    svg_height = height * actual_line_height + 20

    # Start building SVG
    parts: list[str] = []
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {svg_width:.1f} {svg_height:.1f}" '
        f'class="terminal-svg">'
    )
    parts.append(f"<title>{_escape_xml(title)}</title>")

    # Style definitions
    parts.append("<defs><style>")
    parts.append(
        f".terminal-bg {{ fill: {background}; }}"
        f".terminal-text {{ "
        f"font-family: {FONT_FAMILY}; "
        f"font-size: {font_size}px; "
        f"fill: {foreground}; "
        f"white-space: pre; "
        f"}}"
        f".bold {{ font-weight: bold; }}"
        f".italic {{ font-style: italic; }}"
        f".underline {{ text-decoration: underline; }}"
    )
    parts.append("</style></defs>")

    # Background rectangle
    parts.append(
        f'<rect class="terminal-bg" x="0" y="0" '
        f'width="{svg_width:.1f}" height="{svg_height:.1f}"/>'
    )

    # Text content group
    parts.append('<g class="terminal-text">')

    # Render each row
    for row_idx, row_data in enumerate(screen_buffer):
        y = 10 + (row_idx + 1) * actual_line_height - (actual_line_height - font_size) / 2

        # Build spans for this row, grouping consecutive chars with same style
        spans = _build_row_spans(row_data, foreground, background)

        if not spans:
            continue

        # Start text element for this row
        parts.append(f'<text y="{y:.1f}">')

        x = 10.0  # Starting x position with padding
        for span in spans:
            text = span["text"]
            if not text or (text.isspace() and not span["has_bg"]):
                # Skip empty spans without background, but advance position
                x += len(text) * char_width
                continue

            # Build tspan attributes
            attrs = [f'x="{x:.1f}"']

            # Foreground color
            if span["fg"] != foreground:
                attrs.append(f'fill="{span["fg"]}"')

            # Style classes
            classes = []
            if span["bold"]:
                classes.append("bold")
            if span["italic"]:
                classes.append("italic")
            if span["underline"]:
                classes.append("underline")
            if classes:
                attrs.append(f'class="{" ".join(classes)}"')

            # Background needs a separate rect
            if span["has_bg"] and span["bg"] != background:
                bg_width = len(text) * char_width
                bg_y = y - font_size + 2
                parts.insert(
                    -1,  # Insert before current text element
                    f'<rect x="{x:.1f}" y="{bg_y:.1f}" '
                    f'width="{bg_width:.1f}" height="{actual_line_height:.1f}" '
                    f'fill="{span["bg"]}"/>',
                )

            parts.append(f'<tspan {" ".join(attrs)}>{_escape_xml(text)}</tspan>')
            x += len(text) * char_width

        parts.append("</text>")

    parts.append("</g>")
    parts.append("</svg>")

    return "".join(parts)


class _Span(TypedDict):
    """A span of text with consistent styling."""

    text: str
    fg: str
    bg: str
    bold: bool
    italic: bool
    underline: bool
    has_bg: bool


def _build_row_spans(
    row_data: list[CharData],
    default_fg: str,
    default_bg: str,
) -> list[_Span]:
    """Build styled spans from row data, merging consecutive chars with same style."""
    if not row_data:
        return []

    spans: list[_Span] = []
    current_span: _Span | None = None

    for char in row_data:
        char_data = char["data"]

        # Skip empty placeholder cells (after wide characters)
        if not char_data:
            continue

        # Get colors, handling reverse video
        fg = _color_to_hex(char["fg"], is_foreground=True)
        bg = _color_to_hex(char["bg"], is_foreground=False)

        if char["reverse"]:
            fg, bg = bg, fg

        has_bg = bg != default_bg

        # Check if we can extend current span
        if (
            current_span is not None
            and current_span["fg"] == fg
            and current_span["bg"] == bg
            and current_span["bold"] == char["bold"]
            and current_span["italic"] == char["italics"]
            and current_span["underline"] == char["underscore"]
            and current_span["has_bg"] == has_bg
        ):
            current_span["text"] += char_data
        else:
            # Start new span
            if current_span is not None:
                spans.append(current_span)
            current_span = {
                "text": char_data,
                "fg": fg,
                "bg": bg,
                "bold": char["bold"],
                "italic": char["italics"],
                "underline": char["underscore"],
                "has_bg": has_bg,
            }

    if current_span is not None:
        spans.append(current_span)

    return spans

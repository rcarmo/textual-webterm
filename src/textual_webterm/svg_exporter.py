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
CHAR_WIDTH = 8  # Width of monospace character at 14px (typically ~0.57 ratio)

# Box drawing characters that need vertical scaling to fill line height
# These are designed to connect between lines but the font's em-box is smaller
# than our line height, creating gaps
BOX_DRAWING_CHARS = frozenset(
    # Light and heavy box drawing (U+2500-U+257F)
    "─━│┃┄┅┆┇┈┉┊┋┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋"
    # Double box drawing
    "═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬"
    # Rounded corners
    "╭╮╯╰"
    # Light and heavy dashed (U+2571-U+257F)
    "\u2571\u2572\u2573╴╵╶╷╸╹╺╻╼╽╾╿"
)


def _is_box_drawing(char: str) -> bool:
    """Check if character is a box-drawing character that needs scaling."""
    return len(char) == 1 and char in BOX_DRAWING_CHARS


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
    # Note: We use alphabetic baseline (default) and offset text y by font_size
    # to align text top with rect top. This is more compatible across browsers
    # than dominant-baseline: text-before-edge which has Safari issues.
    parts.append("<defs><style>")
    parts.append(
        f".terminal-bg {{ fill: {background}; }}"
        f".terminal-text {{ "
        f"font-family: {FONT_FAMILY}; "
        f"font-size: {font_size}px; "
        f"fill: {foreground}; "
        f"white-space: pre; "
        f"text-rendering: optimizeLegibility; "
        f"}}"
        f".bold {{ font-weight: bold; }}"
        f".italic {{ font-style: italic; }}"
        f".underline {{ text-decoration: underline; }}"
    )
    parts.append("</style></defs>")

    # Background rectangle
    parts.append(
        f'<rect class="terminal-bg" x="0" y="0" width="{svg_width:.1f}" height="{svg_height:.1f}"/>'
    )

    # Text content group
    parts.append('<g class="terminal-text">')

    # Render each row - use explicit x position for EACH character
    # to ensure pixel-perfect alignment regardless of font metrics
    for row_idx, row_data in enumerate(screen_buffer):
        # rect_y is the top of the cell
        rect_y = 10 + row_idx * actual_line_height
        # text_y is the baseline position (alphabetic baseline = bottom of lowercase letters)
        # For most fonts, baseline is roughly at font_size from top of em box
        text_y = rect_y + font_size

        if not row_data:
            continue

        # Collect background rects and text spans
        row_bg_rects: list[str] = []
        row_tspans: list[str] = []

        # Track current style for potential span merging (only merge if same style AND adjacent)
        col = 0
        while col < len(row_data):
            char = row_data[col]
            char_data = char["data"]

            # Skip empty placeholder cells (after wide characters)
            if not char_data:
                col += 1
                continue

            x = 10.0 + col * char_width

            # Get colors, handling reverse video
            fg = _color_to_hex(char["fg"], is_foreground=True)
            bg = _color_to_hex(char["bg"], is_foreground=False)
            if char["reverse"]:
                fg, bg = bg, fg

            # Count columns for this character (wide chars take 2)
            char_cols = 1
            if col + 1 < len(row_data) and not row_data[col + 1]["data"]:
                char_cols = 2  # Wide character

            # Background rect if not default
            # Add 0.5px overlap in both directions to eliminate sub-pixel gaps at high zoom
            if bg != background:
                bg_width = char_cols * char_width + 0.5
                row_bg_rects.append(
                    f'<rect x="{x:.1f}" y="{rect_y:.1f}" '
                    f'width="{bg_width:.1f}" height="{actual_line_height + 0.5:.1f}" '
                    f'fill="{bg}"/>'
                )

            # Build tspan with explicit x position
            attrs = [f'x="{x:.1f}"']

            if fg != foreground:
                attrs.append(f'fill="{fg}"')

            classes = []
            if char["bold"]:
                classes.append("bold")
            if char["italics"]:
                classes.append("italic")
            if char["underscore"]:
                classes.append("underline")
            if classes:
                attrs.append(f'class="{" ".join(classes)}"')

            # Box-drawing characters need vertical scaling to fill line height
            # Render them as separate text elements with transform
            if _is_box_drawing(char_data):
                # Scale vertically by line_height ratio, anchored at top of cell
                # The transform scales around (x, rect_y) to stretch the glyph
                fill_attr = f' fill="{fg}"' if fg != foreground else ""
                class_attr = f' class="{" ".join(classes)}"' if classes else ""
                row_bg_rects.append(
                    f'<text x="{x:.1f}" y="{text_y:.1f}" '
                    f'transform="translate(0,{rect_y:.1f}) scale(1,{line_height}) translate(0,{-rect_y:.1f})"'
                    f"{fill_attr}{class_attr}>{_escape_xml(char_data)}</text>"
                )
            else:
                row_tspans.append(f"<tspan {' '.join(attrs)}>{_escape_xml(char_data)}</tspan>")

            col += char_cols

        # Add background rects first, then text
        if row_bg_rects or row_tspans:
            parts.extend(row_bg_rects)
            if row_tspans:
                parts.append(f'<text y="{text_y:.1f}">')
                parts.extend(row_tspans)
                parts.append("</text>")

    parts.append("</g>")
    parts.append("</svg>")

    return "".join(parts)

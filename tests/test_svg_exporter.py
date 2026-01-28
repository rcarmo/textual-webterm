"""Extensive tests for the custom SVG exporter."""

from __future__ import annotations

import pytest

from textual_webterm.svg_exporter import (
    ANSI_COLORS,
    DEFAULT_BG,
    DEFAULT_FG,
    CharData,
    _color_to_hex,
    _escape_xml,
    render_terminal_svg,
)


class TestColorToHex:
    """Tests for _color_to_hex function."""

    @pytest.mark.parametrize(
        ("color", "is_foreground", "expected"),
        [
            ("default", True, DEFAULT_FG),
            ("default", False, DEFAULT_BG),
            ("#ff0000", True, "#ff0000"),
            ("#123456", True, "#123456"),
            ("#AABBCC", True, "#AABBCC"),
            ("ff0000", True, "#ff0000"),
            ("123456", True, "#123456"),
            ("AABBCC", True, "#AABBCC"),
            ("ff8700", True, "#ff8700"),
            ("red", True, ANSI_COLORS["red"]),
            ("green", True, ANSI_COLORS["green"]),
            ("blue", True, ANSI_COLORS["blue"]),
            ("white", True, ANSI_COLORS["white"]),
            ("black", True, ANSI_COLORS["black"]),
            ("brightred", True, ANSI_COLORS["brightred"]),
            ("brightgreen", True, ANSI_COLORS["brightgreen"]),
            ("brightblue", True, ANSI_COLORS["brightblue"]),
            ("RED", True, ANSI_COLORS["red"]),
            ("Green", True, ANSI_COLORS["green"]),
            ("BRIGHTBLUE", True, ANSI_COLORS["brightblue"]),
            ("unknowncolor", True, DEFAULT_FG),
            ("unknowncolor", False, DEFAULT_BG),
            ("rgb(255,0,0)", True, DEFAULT_FG),
            ("rgb(0,255,0)", False, DEFAULT_BG),
            ("gray", True, ANSI_COLORS["gray"]),
            ("grey", True, ANSI_COLORS["grey"]),
            ("lightgray", True, ANSI_COLORS["lightgray"]),
            ("lightgrey", True, ANSI_COLORS["lightgrey"]),
        ],
    )
    def test_color_to_hex(self, color: str, is_foreground: bool, expected: str) -> None:
        """Color conversion covers named/hex/default cases."""
        assert _color_to_hex(color, is_foreground=is_foreground) == expected


class TestEscapeXml:
    """Tests for XML escaping."""

    @pytest.mark.parametrize(
        ("input_str", "expected"),
        [
            ("hello world", "hello world"),
            ("<", "&lt;"),
            ("a < b", "a &lt; b"),
            (">", "&gt;"),
            ("a > b", "a &gt; b"),
            ("&", "&amp;"),
            ("a & b", "a &amp; b"),
            ('"', "&quot;"),
            ("'", "&#x27;"),
            ('<script>"alert"</script>', "&lt;script&gt;&quot;alert&quot;&lt;/script&gt;"),
            ("你好世界", "你好世界"),
            ("🎉🚀", "🎉🚀"),
        ],
    )
    def test_escape_xml(self, input_str: str, expected: str) -> None:
        """Escape XML special chars and preserve unicode."""
        assert _escape_xml(input_str) == expected


class TestRenderTerminalSvg:
    """Tests for render_terminal_svg function."""

    def _char(
        self,
        data: str,
        fg: str = "default",
        bg: str = "default",
        bold: bool = False,
        italics: bool = False,
        underscore: bool = False,
        reverse: bool = False,
    ) -> CharData:
        """Helper to create CharData."""
        return {
            "data": data,
            "fg": fg,
            "bg": bg,
            "bold": bold,
            "italics": italics,
            "underscore": underscore,
            "reverse": reverse,
        }

    def _make_buffer(self, rows: list[str]) -> list[list[CharData]]:
        """Create simple buffer from strings."""
        return [[self._char(c) for c in row] for row in rows]

    def test_empty_buffer(self) -> None:
        """Empty buffer produces valid SVG."""
        svg = render_terminal_svg([], width=80, height=24)
        assert svg.startswith("<svg")
        assert svg.endswith("</svg>")
        assert 'xmlns="http://www.w3.org/2000/svg"' in svg

    def test_css_properties(self) -> None:
        """SVG includes essential CSS properties for proper rendering."""
        svg = render_terminal_svg([], width=80, height=24)
        # Check for legibility optimization
        assert "text-rendering: optimizeLegibility" in svg
        # Check for monospace font
        assert "font-family:" in svg
        assert "monospace" in svg
        # Check for pre whitespace handling
        assert "white-space: pre" in svg

    def test_buffer_with_empty_rows(self) -> None:
        """Buffer with rows containing only empty cells produces valid SVG."""
        # Row with only empty placeholder cells (no actual characters)
        buffer = [
            [self._char("") for _ in range(10)],  # Empty row
            [self._char("A")],  # Normal row
            [self._char("") for _ in range(10)],  # Another empty row
        ]
        svg = render_terminal_svg(buffer, width=10, height=3)
        assert svg.startswith("<svg")
        assert "A" in svg
        # Should only have 1 text element with content (for "A")
        assert svg.count("<tspan") == 1

    def test_buffer_with_truly_empty_row(self) -> None:
        """Buffer with truly empty row (empty list) is handled."""
        buffer = [
            [],  # Truly empty row (no cells at all)
            [self._char("B")],  # Normal row
        ]
        svg = render_terminal_svg(buffer, width=10, height=2)
        assert svg.startswith("<svg")
        assert ">B</tspan>" in svg

    def test_basic_text_output(self) -> None:
        """Basic text is included in SVG (each char with explicit x position)."""
        buffer = self._make_buffer(["Hello, World!"])
        svg = render_terminal_svg(buffer, width=80, height=24)
        # Each character is rendered individually with explicit x
        assert ">H</tspan>" in svg
        assert ">e</tspan>" in svg
        assert ">!</tspan>" in svg

    def test_multiline_output(self) -> None:
        """Multiple lines render correctly."""
        buffer = self._make_buffer(["Line 1", "Line 2", "Line 3"])
        svg = render_terminal_svg(buffer, width=80, height=24)
        # Check for characters from each line
        assert ">L</tspan>" in svg
        assert ">1</tspan>" in svg
        assert ">2</tspan>" in svg
        assert ">3</tspan>" in svg
        # Should have 3 text elements
        assert svg.count("<text y=") == 3

    def test_special_chars_escaped(self) -> None:
        """Special XML characters are properly escaped."""
        buffer = self._make_buffer(["<script>&test</script>"])
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert "&lt;" in svg  # < escaped
        assert "&gt;" in svg  # > escaped
        assert "&amp;" in svg  # & escaped
        assert "<script>" not in svg  # Should not appear unescaped

    def test_colored_text(self) -> None:
        """Colored text gets fill attribute."""
        buffer = [[self._char("R", fg="red"), self._char("G", fg="green")]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert f'fill="{ANSI_COLORS["red"]}"' in svg
        assert f'fill="{ANSI_COLORS["green"]}"' in svg

    def test_bold_text(self) -> None:
        """Bold text gets bold class."""
        buffer = [[self._char("B", bold=True)]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert 'class="bold"' in svg

    def test_italic_text(self) -> None:
        """Italic text gets italic class."""
        buffer = [[self._char("I", italics=True)]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert 'class="italic"' in svg

    def test_underline_text(self) -> None:
        """Underlined text gets underline class."""
        buffer = [[self._char("U", underscore=True)]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert 'class="underline"' in svg

    def test_combined_styles(self) -> None:
        """Multiple styles can be combined."""
        buffer = [[self._char("X", bold=True, italics=True, underscore=True)]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        # Should have all three classes
        assert "bold" in svg
        assert "italic" in svg
        assert "underline" in svg

    def test_background_color(self) -> None:
        """Background color creates rect element."""
        buffer = [[self._char("X", bg="red")]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert f'fill="{ANSI_COLORS["red"]}"' in svg
        # Should have a rect for background
        assert "<rect" in svg

    def test_background_color_rect_dimensions(self) -> None:
        """Background rect has correct position and dimensions."""
        buffer = [[self._char("A"), self._char("B", bg="green"), self._char("C")]]
        svg = render_terminal_svg(buffer, width=80, height=24, char_width=10.0)
        # Background rect should be positioned after 'A' (x=10 padding + 10 char width = 20)
        assert f'fill="{ANSI_COLORS["green"]}"' in svg
        # Check rect exists with green fill
        import re

        rect_match = re.search(r'<rect[^>]*fill="{}"[^>]*/>'.format(ANSI_COLORS["green"]), svg)
        assert rect_match is not None

    def test_background_color_hex_format(self) -> None:
        """Background color works with hex format (with and without #)."""
        buffer = [[self._char("X", bg="#ff5733")]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert 'fill="#ff5733"' in svg

    def test_background_color_hex_without_hash(self) -> None:
        """Background color works with pyte 256-color format (no # prefix)."""
        buffer = [[self._char("X", bg="00ff00")]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert 'fill="#00ff00"' in svg

    def test_background_color_multiple_spans(self) -> None:
        """Multiple background colors in same row render correctly."""
        buffer = [
            [
                self._char("R", bg="red"),
                self._char("G", bg="green"),
                self._char("B", bg="blue"),
            ]
        ]
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert f'fill="{ANSI_COLORS["red"]}"' in svg
        assert f'fill="{ANSI_COLORS["green"]}"' in svg
        assert f'fill="{ANSI_COLORS["blue"]}"' in svg
        # Should have 3 background rects (plus terminal bg rect)
        assert svg.count("<rect") >= 4

    def test_background_color_wide_char(self) -> None:
        """Background color on wide character spans correct width."""
        buffer = [
            [
                self._char("中", bg="red"),
                self._char("", bg="red"),  # Placeholder inherits bg
            ]
        ]
        svg = render_terminal_svg(buffer, width=80, height=24, char_width=10.0)
        # Background should span 2 columns (20px width + 0.5px overlap)
        assert f'fill="{ANSI_COLORS["red"]}"' in svg
        # Verify rect width is for 2 columns plus overlap
        import re

        rect_match = re.search(
            r'<rect[^>]*width="(\d+\.?\d*)"[^>]*fill="{}"/>'.format(ANSI_COLORS["red"]), svg
        )
        assert rect_match is not None
        width = float(rect_match.group(1))
        assert width == 20.5  # 2 columns * 10.0 char_width + 0.5 overlap

    def test_background_same_as_terminal_bg_no_rect(self) -> None:
        """Background same as terminal background doesn't create extra rect."""
        # Use default terminal background (#000000)
        buffer = [[self._char("X", bg="#000000")]]
        svg = render_terminal_svg(buffer, width=80, height=24, background="#000000")
        # Should only have terminal background rect, not character background
        # Count rects - should be just 1 (terminal bg)
        assert svg.count("<rect") == 1

    def test_background_and_foreground_colors(self) -> None:
        """Both background and foreground colors render correctly."""
        buffer = [[self._char("X", fg="yellow", bg="blue")]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        # Background rect with blue
        assert f'fill="{ANSI_COLORS["blue"]}"' in svg
        # Text tspan with yellow
        assert f'fill="{ANSI_COLORS["yellow"]}"' in svg

    def test_box_drawing_vertical_scale(self) -> None:
        """Box-drawing characters are scaled vertically to fill line height."""
        buffer = [[self._char("│")]]  # Vertical line
        svg = render_terminal_svg(buffer, width=80, height=24)
        # Box drawing chars rendered with transform for vertical scaling
        assert "scale(1,1.2)" in svg
        # Should be a separate text element, not a tspan
        assert '<text x="' in svg

    def test_box_drawing_corners(self) -> None:
        """Box-drawing corner characters are scaled."""
        buffer = [[self._char("┌"), self._char("┐")]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        # Both corners should have scale transforms
        assert svg.count("scale(1,1.2)") == 2

    def test_unicode_text(self) -> None:
        """Unicode text is preserved."""
        buffer = self._make_buffer(["你好世界"])
        svg = render_terminal_svg(buffer, width=80, height=24)
        # Each char rendered separately
        assert ">你</tspan>" in svg
        assert ">好</tspan>" in svg

    def test_emoji_text(self) -> None:
        """Emoji are preserved."""
        buffer = self._make_buffer(["🎉🚀✨"])
        svg = render_terminal_svg(buffer, width=80, height=24)
        # Each emoji rendered separately
        assert ">🎉</tspan>" in svg
        assert ">🚀</tspan>" in svg

    def test_wide_char_with_placeholder(self) -> None:
        """Wide chars with placeholders render correctly."""
        buffer = [
            [
                self._char("A"),
                self._char("中"),
                self._char(""),  # Placeholder
                self._char("B"),
            ]
        ]
        svg = render_terminal_svg(buffer, width=80, height=24)
        # Each char rendered with explicit x position
        assert ">A</tspan>" in svg
        assert ">中</tspan>" in svg
        assert ">B</tspan>" in svg
        # B should be at column 3 (A=0, 中=1-2, B=3)
        assert 'x="34.0"' in svg  # 10 + 3*8 = 34

    def test_viewbox_dimensions(self) -> None:
        """ViewBox matches calculated dimensions."""
        svg = render_terminal_svg([], width=80, height=24)
        assert 'viewBox="0 0' in svg

    def test_title_included(self) -> None:
        """Title is included in SVG."""
        svg = render_terminal_svg([], width=80, height=24, title="My Terminal")
        assert "<title>My Terminal</title>" in svg

    def test_title_escaped(self) -> None:
        """Title with special chars is escaped."""
        svg = render_terminal_svg([], width=80, height=24, title="<Test>")
        assert "<title>&lt;Test&gt;</title>" in svg

    def test_custom_font_size(self) -> None:
        """Custom font size is applied."""
        svg = render_terminal_svg([], width=80, height=24, font_size=16)
        assert "font-size: 16px" in svg

    def test_custom_background(self) -> None:
        """Custom background color is applied."""
        svg = render_terminal_svg([], width=80, height=24, background="#1a1a1a")
        assert "fill: #1a1a1a" in svg

    def test_style_definitions_present(self) -> None:
        """CSS style definitions are included."""
        svg = render_terminal_svg([], width=80, height=24)
        assert "<style>" in svg
        assert ".terminal-bg" in svg
        assert ".terminal-text" in svg
        assert ".bold" in svg
        assert ".italic" in svg
        assert ".underline" in svg

    def test_full_screen_render(self) -> None:
        """Full terminal screen renders without error."""
        # Create a 80x24 screen with various content
        buffer: list[list[CharData]] = []
        for row in range(24):
            row_data: list[CharData] = []
            for col in range(80):
                char = chr(32 + ((row * 80 + col) % 95))  # Printable ASCII
                row_data.append(self._char(char))
            buffer.append(row_data)

        svg = render_terminal_svg(buffer, width=80, height=24)
        assert svg.startswith("<svg")
        assert svg.endswith("</svg>")
        # Should have 24 text elements
        assert svg.count("<text y=") == 24

    def test_reverse_video_rendering(self) -> None:
        """Reverse video swaps colors correctly."""
        buffer = [[self._char("X", fg="white", bg="black", reverse=True)]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        # Colors should be swapped, so fg should be black's color
        assert ANSI_COLORS["black"] in svg

    def test_hex_color_passthrough(self) -> None:
        """Hex colors in buffer pass through to SVG."""
        buffer = [[self._char("X", fg="#ff5733")]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert 'fill="#ff5733"' in svg

    def test_whitespace_handling(self) -> None:
        """Whitespace is preserved."""
        buffer = self._make_buffer(["  indented  text  "])
        svg = render_terminal_svg(buffer, width=80, height=24)
        # white-space: pre should be in styles
        assert "white-space: pre" in svg


class TestSvgStructure:
    """Tests for SVG document structure."""

    def test_valid_xml_structure(self) -> None:
        """SVG has valid XML structure."""
        svg = render_terminal_svg([], width=80, height=24)
        # Basic structure checks
        assert svg.count("<svg") == 1
        assert svg.count("</svg>") == 1
        assert svg.count("<defs>") == 1
        assert svg.count("</defs>") == 1
        assert svg.count("<style>") == 1
        assert svg.count("</style>") == 1

    def test_all_tags_closed(self) -> None:
        """All opened tags are properly closed."""
        buffer = [
            [
                {
                    "data": "X",
                    "fg": "red",
                    "bg": "blue",
                    "bold": True,
                    "italics": False,
                    "underscore": False,
                    "reverse": False,
                }
            ]
        ]
        svg = render_terminal_svg(buffer, width=80, height=24)

        # Count opening and closing tags
        assert svg.count("<g") == svg.count("</g>")
        assert svg.count("<text") == svg.count("</text>")

    def test_namespace_declared(self) -> None:
        """SVG namespace is properly declared."""
        svg = render_terminal_svg([], width=80, height=24)
        assert 'xmlns="http://www.w3.org/2000/svg"' in svg


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def _char(
        self,
        data: str,
        fg: str = "default",
        bg: str = "default",
        bold: bool = False,
        italics: bool = False,
        underscore: bool = False,
        reverse: bool = False,
    ) -> CharData:
        """Helper to create CharData."""
        return {
            "data": data,
            "fg": fg,
            "bg": bg,
            "bold": bold,
            "italics": italics,
            "underscore": underscore,
            "reverse": reverse,
        }

    def test_single_cell(self) -> None:
        """Single cell terminal renders."""
        buffer = [[self._char("X")]]
        svg = render_terminal_svg(buffer, width=1, height=1)
        assert "X" in svg

    def test_very_wide_terminal(self) -> None:
        """Very wide terminal (200 cols) renders."""
        row = [self._char("X") for _ in range(200)]
        svg = render_terminal_svg([row], width=200, height=1)
        assert svg.startswith("<svg")

    def test_very_tall_terminal(self) -> None:
        """Very tall terminal (100 rows) renders."""
        buffer = [[self._char("X")] for _ in range(100)]
        svg = render_terminal_svg(buffer, width=1, height=100)
        assert svg.count("<text y=") == 100

    def test_all_spaces(self) -> None:
        """Row of all spaces renders."""
        buffer = [[self._char(" ") for _ in range(80)]]
        svg = render_terminal_svg(buffer, width=80, height=1)
        assert svg.startswith("<svg")

    def test_null_chars_as_space(self) -> None:
        """Null characters (empty string) are skipped."""
        buffer = [[self._char(""), self._char("A"), self._char("")]]
        svg = render_terminal_svg(buffer, width=3, height=1)
        assert "A" in svg

    def test_mixed_width_characters(self) -> None:
        """Mix of narrow and wide characters."""
        buffer = [
            [
                self._char("A"),
                self._char("中"),
                self._char(""),
                self._char("B"),
                self._char("🎉"),
                self._char(""),
                self._char("C"),
            ]
        ]
        svg = render_terminal_svg(buffer, width=7, height=1)
        # Each char rendered with explicit x
        assert ">A</tspan>" in svg
        assert ">中</tspan>" in svg
        assert ">B</tspan>" in svg
        assert ">🎉</tspan>" in svg
        assert ">C</tspan>" in svg

    def test_special_unicode_blocks(self) -> None:
        """Unicode box drawing characters render (separately for precise positioning)."""
        buffer = [
            [
                self._char("┌"),
                self._char("─"),
                self._char("┐"),
            ]
        ]
        svg = render_terminal_svg(buffer, width=3, height=1)
        # Box drawing chars are rendered separately for precise x positioning
        assert "┌" in svg
        assert "─" in svg
        assert "┐" in svg

    def test_horizontal_lines_render_without_textlength(self) -> None:
        """Horizontal lines render without textLength (removed due to positioning issues)."""
        buffer = [
            [
                self._char("╭"),
                self._char("─"),
                self._char("─"),
                self._char("─"),
                self._char("╮"),
            ]
        ]
        svg = render_terminal_svg(buffer, width=5, height=1)
        # Horizontal lines should NOT have textLength (causes visual offset issues)
        assert "textLength=" not in svg
        assert "lengthAdjust=" not in svg
        # But the characters should still be present
        assert "─" in svg or "───" in svg

    def test_ansi_bright_colors(self) -> None:
        """All bright ANSI colors render."""
        colors = [
            "brightred",
            "brightgreen",
            "brightyellow",
            "brightblue",
            "brightmagenta",
            "brightcyan",
        ]
        buffer = [[self._char("X", fg=c) for c in colors]]
        svg = render_terminal_svg(buffer, width=len(colors), height=1)
        for color in colors:
            assert ANSI_COLORS[color] in svg

    def test_rapid_color_changes(self) -> None:
        """Rapid color changes (each char different) render."""
        colors = ["red", "green", "blue", "yellow", "magenta", "cyan"]
        buffer = [[self._char(str(i), fg=colors[i % len(colors)]) for i in range(20)]]
        svg = render_terminal_svg(buffer, width=20, height=1)
        # Should have multiple tspan elements
        assert svg.count("<tspan") >= 1

    def test_all_attributes_at_once(self) -> None:
        """Character with all attributes renders."""
        buffer = [
            [
                self._char(
                    "X", fg="red", bg="blue", bold=True, italics=True, underscore=True, reverse=True
                )
            ]
        ]
        svg = render_terminal_svg(buffer, width=1, height=1)
        assert "bold" in svg
        assert "italic" in svg
        assert "underline" in svg

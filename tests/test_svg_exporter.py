"""Extensive tests for the custom SVG exporter."""

from __future__ import annotations

from textual_webterm.svg_exporter import (
    ANSI_COLORS,
    DEFAULT_BG,
    DEFAULT_FG,
    CharData,
    _build_row_spans,
    _color_to_hex,
    _escape_xml,
    _is_all_horizontal_box_drawing,
    _is_box_drawing_vertical_or_corner,
    _should_break_span,
    render_terminal_svg,
)


class TestColorToHex:
    """Tests for _color_to_hex function."""

    def test_default_foreground(self) -> None:
        """Default color returns DEFAULT_FG for foreground."""
        assert _color_to_hex("default", is_foreground=True) == DEFAULT_FG

    def test_default_background(self) -> None:
        """Default color returns DEFAULT_BG for background."""
        assert _color_to_hex("default", is_foreground=False) == DEFAULT_BG

    def test_hex_color_passthrough(self) -> None:
        """Hex colors pass through unchanged."""
        assert _color_to_hex("#ff0000") == "#ff0000"
        assert _color_to_hex("#123456") == "#123456"
        assert _color_to_hex("#AABBCC") == "#AABBCC"

    def test_hex_color_without_hash(self) -> None:
        """Hex colors without # prefix (pyte's 256-color/truecolor) get # added."""
        assert _color_to_hex("ff0000") == "#ff0000"
        assert _color_to_hex("123456") == "#123456"
        assert _color_to_hex("AABBCC") == "#AABBCC"
        assert _color_to_hex("ff8700") == "#ff8700"  # Common 256-color orange

    def test_named_colors(self) -> None:
        """Named ANSI colors map correctly."""
        assert _color_to_hex("red") == ANSI_COLORS["red"]
        assert _color_to_hex("green") == ANSI_COLORS["green"]
        assert _color_to_hex("blue") == ANSI_COLORS["blue"]
        assert _color_to_hex("white") == ANSI_COLORS["white"]
        assert _color_to_hex("black") == ANSI_COLORS["black"]

    def test_bright_colors(self) -> None:
        """Bright color variants map correctly."""
        assert _color_to_hex("brightred") == ANSI_COLORS["brightred"]
        assert _color_to_hex("brightgreen") == ANSI_COLORS["brightgreen"]
        assert _color_to_hex("brightblue") == ANSI_COLORS["brightblue"]

    def test_case_insensitive(self) -> None:
        """Color names are case-insensitive."""
        assert _color_to_hex("RED") == ANSI_COLORS["red"]
        assert _color_to_hex("Green") == ANSI_COLORS["green"]
        assert _color_to_hex("BRIGHTBLUE") == ANSI_COLORS["brightblue"]

    def test_unknown_color_returns_default(self) -> None:
        """Unknown color names return default."""
        assert _color_to_hex("unknowncolor", is_foreground=True) == DEFAULT_FG
        assert _color_to_hex("unknowncolor", is_foreground=False) == DEFAULT_BG

    def test_rgb_format_returns_default(self) -> None:
        """RGB format falls back to default (not commonly used in terminals)."""
        assert _color_to_hex("rgb(255,0,0)", is_foreground=True) == DEFAULT_FG
        assert _color_to_hex("rgb(0,255,0)", is_foreground=False) == DEFAULT_BG

    def test_gray_aliases(self) -> None:
        """Gray/grey aliases work."""
        assert _color_to_hex("gray") == ANSI_COLORS["gray"]
        assert _color_to_hex("grey") == ANSI_COLORS["grey"]
        assert _color_to_hex("lightgray") == ANSI_COLORS["lightgray"]
        assert _color_to_hex("lightgrey") == ANSI_COLORS["lightgrey"]


class TestEscapeXml:
    """Tests for XML escaping."""

    def test_no_special_chars(self) -> None:
        """Plain text passes through unchanged."""
        assert _escape_xml("hello world") == "hello world"

    def test_less_than(self) -> None:
        """Less than is escaped."""
        assert _escape_xml("<") == "&lt;"
        assert _escape_xml("a < b") == "a &lt; b"

    def test_greater_than(self) -> None:
        """Greater than is escaped."""
        assert _escape_xml(">") == "&gt;"
        assert _escape_xml("a > b") == "a &gt; b"

    def test_ampersand(self) -> None:
        """Ampersand is escaped."""
        assert _escape_xml("&") == "&amp;"
        assert _escape_xml("a & b") == "a &amp; b"

    def test_quotes(self) -> None:
        """Quotes are escaped."""
        assert _escape_xml('"') == "&quot;"
        assert _escape_xml("'") == "&#x27;"

    def test_mixed_special_chars(self) -> None:
        """Multiple special chars are all escaped."""
        assert _escape_xml('<script>"alert"</script>') == (
            "&lt;script&gt;&quot;alert&quot;&lt;/script&gt;"
        )

    def test_unicode_preserved(self) -> None:
        """Unicode characters are preserved."""
        assert _escape_xml("你好世界") == "你好世界"
        assert _escape_xml("🎉🚀") == "🎉🚀"


class TestBuildRowSpans:
    """Tests for _build_row_spans function."""

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

    def test_empty_row(self) -> None:
        """Empty row returns no spans."""
        assert _build_row_spans([], DEFAULT_FG, DEFAULT_BG) == []

    def test_single_char(self) -> None:
        """Single character produces one span."""
        row = [self._char("A")]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 1
        assert spans[0]["text"] == "A"

    def test_consecutive_same_style_merged(self) -> None:
        """Consecutive chars with same style are merged."""
        row = [self._char("H"), self._char("e"), self._char("l"), self._char("l"), self._char("o")]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 1
        assert spans[0]["text"] == "Hello"

    def test_different_colors_split(self) -> None:
        """Different colors create separate spans."""
        row = [
            self._char("R", fg="red"),
            self._char("G", fg="green"),
            self._char("B", fg="blue"),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 3
        assert spans[0]["text"] == "R"
        assert spans[0]["fg"] == ANSI_COLORS["red"]
        assert spans[1]["text"] == "G"
        assert spans[1]["fg"] == ANSI_COLORS["green"]
        assert spans[2]["text"] == "B"
        assert spans[2]["fg"] == ANSI_COLORS["blue"]

    def test_same_color_merged(self) -> None:
        """Same color chars are merged."""
        row = [
            self._char("A", fg="red"),
            self._char("B", fg="red"),
            self._char("C", fg="red"),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 1
        assert spans[0]["text"] == "ABC"
        assert spans[0]["fg"] == ANSI_COLORS["red"]

    def test_bold_creates_new_span(self) -> None:
        """Bold attribute creates new span."""
        row = [
            self._char("N"),
            self._char("B", bold=True),
            self._char("N"),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 3
        assert spans[0]["bold"] is False
        assert spans[1]["bold"] is True
        assert spans[1]["text"] == "B"
        assert spans[2]["bold"] is False

    def test_italic_creates_new_span(self) -> None:
        """Italic attribute creates new span."""
        row = [
            self._char("N"),
            self._char("I", italics=True),
            self._char("N"),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 3
        assert spans[1]["italic"] is True

    def test_underline_creates_new_span(self) -> None:
        """Underline attribute creates new span."""
        row = [
            self._char("N"),
            self._char("U", underscore=True),
            self._char("N"),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 3
        assert spans[1]["underline"] is True

    def test_reverse_swaps_colors(self) -> None:
        """Reverse video swaps foreground and background."""
        row = [self._char("R", fg="red", bg="blue", reverse=True)]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 1
        # Colors should be swapped
        assert spans[0]["fg"] == ANSI_COLORS["blue"]
        assert spans[0]["bg"] == ANSI_COLORS["red"]

    def test_background_color_tracked(self) -> None:
        """Background color is tracked in has_bg flag."""
        row = [
            self._char("N"),
            self._char("B", bg="red"),
            self._char("N"),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert spans[0]["has_bg"] is False
        assert spans[1]["has_bg"] is True
        assert spans[2]["has_bg"] is False

    def test_wide_char_placeholder_skipped(self) -> None:
        """Empty placeholder cells (after wide chars) are skipped but counted in columns."""
        row = [
            self._char("A"),
            self._char("中"),  # Wide char
            self._char(""),  # Placeholder - should be skipped but counted
            self._char("B"),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        # Should merge into single span since all default style
        assert len(spans) == 1
        assert spans[0]["text"] == "A中B"
        assert spans[0]["columns"] == 4  # 1 + 1 + 1(placeholder) + 1

    def test_multiple_wide_chars(self) -> None:
        """Multiple wide characters handled correctly."""
        row = [
            self._char("日"),
            self._char(""),
            self._char("本"),
            self._char(""),
            self._char("語"),
            self._char(""),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 1
        assert spans[0]["text"] == "日本語"
        assert spans[0]["columns"] == 6  # Each wide char + placeholder = 2 columns

    def test_emoji_with_placeholder(self) -> None:
        """Emoji characters with placeholders handled."""
        row = [
            self._char("🎉"),
            self._char(""),
            self._char(" "),
            self._char("🚀"),
            self._char(""),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 1
        assert spans[0]["text"] == "🎉 🚀"
        assert spans[0]["columns"] == 5  # 2 + 1 + 2

    def test_mixed_styles_complex(self) -> None:
        """Complex mix of styles produces correct spans."""
        row = [
            self._char("H", fg="red", bold=True),
            self._char("e", fg="red", bold=True),
            self._char("l", fg="green"),
            self._char("l", fg="green"),
            self._char("o", fg="blue", italics=True),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 3
        assert spans[0]["text"] == "He"
        assert spans[0]["bold"] is True
        assert spans[1]["text"] == "ll"
        assert spans[1]["bold"] is False
        assert spans[2]["text"] == "o"
        assert spans[2]["italic"] is True

    def test_placeholder_at_start_ignored(self) -> None:
        """Empty placeholder at start of row is ignored."""
        row = [
            self._char(""),  # Orphan placeholder at start
            self._char("A"),
            self._char("B"),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 1
        assert spans[0]["text"] == "AB"
        assert spans[0]["columns"] == 2  # Placeholder not counted (no prior span)

    def test_style_change_after_wide_char(self) -> None:
        """Style change right after a wide character placeholder works."""
        row = [
            self._char("中", fg="red"),
            self._char(""),  # Placeholder
            self._char("A", fg="blue"),
        ]
        spans = _build_row_spans(row, DEFAULT_FG, DEFAULT_BG)
        assert len(spans) == 2
        assert spans[0]["text"] == "中"
        assert spans[0]["columns"] == 2  # Wide char + placeholder
        assert spans[1]["text"] == "A"
        assert spans[1]["columns"] == 1


class TestBoxDrawingHelpers:
    """Tests for box drawing character detection helpers."""

    def test_is_box_drawing_empty_char(self) -> None:
        """Empty string returns False."""
        assert _is_box_drawing_vertical_or_corner("") is False

    def test_is_box_drawing_regular_char(self) -> None:
        """Regular ASCII characters return False."""
        assert _is_box_drawing_vertical_or_corner("A") is False
        assert _is_box_drawing_vertical_or_corner(" ") is False
        assert _is_box_drawing_vertical_or_corner("1") is False

    def test_is_box_drawing_horizontal_lines(self) -> None:
        """Horizontal box drawing lines return False (can merge)."""
        assert _is_box_drawing_vertical_or_corner("─") is False  # U+2500
        assert _is_box_drawing_vertical_or_corner("━") is False  # U+2501
        assert _is_box_drawing_vertical_or_corner("═") is False  # U+2550

    def test_is_box_drawing_vertical_lines(self) -> None:
        """Vertical box drawing lines return True (need precise positioning)."""
        assert _is_box_drawing_vertical_or_corner("│") is True  # U+2502
        assert _is_box_drawing_vertical_or_corner("┃") is True  # U+2503
        assert _is_box_drawing_vertical_or_corner("║") is True  # U+2551

    def test_is_box_drawing_corners(self) -> None:
        """Corner box drawing characters return True."""
        assert _is_box_drawing_vertical_or_corner("┌") is True
        assert _is_box_drawing_vertical_or_corner("┐") is True
        assert _is_box_drawing_vertical_or_corner("└") is True
        assert _is_box_drawing_vertical_or_corner("┘") is True
        assert _is_box_drawing_vertical_or_corner("╭") is True
        assert _is_box_drawing_vertical_or_corner("╮") is True
        assert _is_box_drawing_vertical_or_corner("╯") is True
        assert _is_box_drawing_vertical_or_corner("╰") is True

    def test_should_break_span_empty_current(self) -> None:
        """Empty current text never breaks."""
        assert _should_break_span("", "A") is False
        assert _should_break_span("", "│") is False

    def test_should_break_span_normal_chars(self) -> None:
        """Normal characters don't break spans."""
        assert _should_break_span("A", "B") is False
        assert _should_break_span("Hello", "!") is False

    def test_should_break_span_vertical_line(self) -> None:
        """Vertical lines cause breaks."""
        assert _should_break_span("A", "│") is True
        assert _should_break_span("│", "A") is True

    def test_should_break_span_horizontal_lines_merge(self) -> None:
        """Horizontal lines can merge with each other."""
        assert _should_break_span("─", "─") is False
        assert _should_break_span("━", "━") is False

    def test_is_all_horizontal_box_drawing_empty(self) -> None:
        """Empty string returns False."""
        assert _is_all_horizontal_box_drawing("") is False

    def test_is_all_horizontal_box_drawing_normal_text(self) -> None:
        """Normal text returns False."""
        assert _is_all_horizontal_box_drawing("Hello") is False
        assert _is_all_horizontal_box_drawing("ABC") is False

    def test_is_all_horizontal_box_drawing_horizontal_lines(self) -> None:
        """Horizontal box chars return True."""
        assert _is_all_horizontal_box_drawing("─") is True
        assert _is_all_horizontal_box_drawing("───") is True
        assert _is_all_horizontal_box_drawing("━━━") is True
        assert _is_all_horizontal_box_drawing("═══") is True

    def test_is_all_horizontal_box_drawing_mixed(self) -> None:
        """Mixed content returns False."""
        assert _is_all_horizontal_box_drawing("─A─") is False
        assert _is_all_horizontal_box_drawing("│──") is False  # vertical at start


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
        # Check for proper baseline alignment
        assert "dominant-baseline: text-before-edge" in svg
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

    def test_basic_text_output(self) -> None:
        """Basic text is included in SVG."""
        buffer = self._make_buffer(["Hello, World!"])
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert "Hello, World!" in svg

    def test_multiline_output(self) -> None:
        """Multiple lines render correctly."""
        buffer = self._make_buffer(["Line 1", "Line 2", "Line 3"])
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert "Line 1" in svg
        assert "Line 2" in svg
        assert "Line 3" in svg
        # Should have 3 text elements
        assert svg.count("<text y=") == 3

    def test_special_chars_escaped(self) -> None:
        """Special XML characters are properly escaped."""
        buffer = self._make_buffer(["<script>&test</script>"])
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert "&lt;script&gt;" in svg
        assert "&amp;test" in svg
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
        buffer = [[
            self._char("R", bg="red"),
            self._char("G", bg="green"),
            self._char("B", bg="blue"),
        ]]
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert f'fill="{ANSI_COLORS["red"]}"' in svg
        assert f'fill="{ANSI_COLORS["green"]}"' in svg
        assert f'fill="{ANSI_COLORS["blue"]}"' in svg
        # Should have 3 background rects (plus terminal bg rect)
        assert svg.count("<rect") >= 4

    def test_background_color_wide_char(self) -> None:
        """Background color on wide character spans correct width."""
        buffer = [[
            self._char("中", bg="red"),
            self._char("", bg="red"),  # Placeholder inherits bg
        ]]
        svg = render_terminal_svg(buffer, width=80, height=24, char_width=10.0)
        # Background should span 2 columns (20px width)
        assert f'fill="{ANSI_COLORS["red"]}"' in svg
        # Verify rect width is for 2 columns
        import re
        rect_match = re.search(r'<rect[^>]*width="(\d+\.?\d*)"[^>]*fill="{}"/>'
                              .format(ANSI_COLORS["red"]), svg)
        assert rect_match is not None
        width = float(rect_match.group(1))
        assert width == 20.0  # 2 columns * 10.0 char_width

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

    def test_unicode_text(self) -> None:
        """Unicode text is preserved."""
        buffer = self._make_buffer(["你好世界"])
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert "你好世界" in svg

    def test_emoji_text(self) -> None:
        """Emoji are preserved."""
        buffer = self._make_buffer(["🎉🚀✨"])
        svg = render_terminal_svg(buffer, width=80, height=24)
        assert "🎉🚀✨" in svg

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
        assert "A中B" in svg

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
        assert 'fill: #1a1a1a' in svg

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
        buffer = [[{"data": "X", "fg": "red", "bg": "blue", "bold": True,
                   "italics": False, "underscore": False, "reverse": False}]]
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
        assert "A中B🎉C" in svg

    def test_special_unicode_blocks(self) -> None:
        """Unicode box drawing characters render (separately for precise positioning)."""
        buffer = [[
            self._char("┌"),
            self._char("─"),
            self._char("┐"),
        ]]
        svg = render_terminal_svg(buffer, width=3, height=1)
        # Box drawing chars are rendered separately for precise x positioning
        assert "┌" in svg
        assert "─" in svg
        assert "┐" in svg

    def test_horizontal_lines_use_textlength(self) -> None:
        """Horizontal line spans use textLength for correct width."""
        buffer = [[
            self._char("╭"),
            self._char("─"),
            self._char("─"),
            self._char("─"),
            self._char("╮"),
        ]]
        svg = render_terminal_svg(buffer, width=5, height=1)
        # Horizontal lines should have textLength attribute
        assert 'textLength="24.0"' in svg
        assert 'lengthAdjust="spacing"' in svg

    def test_ansi_bright_colors(self) -> None:
        """All bright ANSI colors render."""
        colors = ["brightred", "brightgreen", "brightyellow",
                  "brightblue", "brightmagenta", "brightcyan"]
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
        buffer = [[self._char("X", fg="red", bg="blue", bold=True,
                             italics=True, underscore=True, reverse=True)]]
        svg = render_terminal_svg(buffer, width=1, height=1)
        assert "bold" in svg
        assert "italic" in svg
        assert "underline" in svg

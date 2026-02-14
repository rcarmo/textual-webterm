package webterm

import (
	"strings"
	"testing"

	"github.com/rcarmo/webterm-go-port/internal/terminalstate"
)

func TestRenderTerminalSVG(t *testing.T) {
	buffer := [][]terminalstate.Cell{
		{
			{Data: "A", FG: "red", BG: "default", Bold: true},
		},
	}
	svg := RenderTerminalSVG(buffer, 1, 1, "webterm", "#000000", "#ffffff", ThemePalettes["xterm"])
	if !strings.Contains(svg, "<svg") || !strings.Contains(svg, "<tspan") {
		t.Fatalf("expected svg output with tspan, got %q", svg)
	}
	if !strings.Contains(svg, "A") {
		t.Fatalf("expected rendered cell data")
	}
}

func FuzzColorToHex(f *testing.F) {
	f.Add("default", true)
	f.Add("red", false)
	f.Add("#ff0000", true)
	f.Add("aabbcc", false)
	f.Add("", true)
	f.Add("nonexistent", false)
	f.Add("AABBCC", true)
	f.Add("123", false)
	f.Add("brightmagenta", true)

	f.Fuzz(func(t *testing.T, color string, isFG bool) {
		result := colorToHex(color, isFG, ansiColors, "#ffffff", "#000000")
		// Result must never be empty
		if result == "" {
			t.Errorf("colorToHex(%q, %v) returned empty string", color, isFG)
		}
		// Result must start with # (all paths return hex or default which starts with #)
		if result[0] != '#' {
			t.Errorf("colorToHex(%q, %v) = %q, doesn't start with #", color, isFG, result)
		}
	})
}

func FuzzIsHex(f *testing.F) {
	f.Add("aabbcc")
	f.Add("AABBCC")
	f.Add("123456")
	f.Add("")
	f.Add("gggggg")
	f.Add("zz")
	f.Add("0123456789abcdefABCDEF")

	f.Fuzz(func(t *testing.T, value string) {
		result := isHex(value)
		// Verify against reference implementation
		expected := true
		for _, ch := range value {
			if !((ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')) {
				expected = false
				break
			}
		}
		if result != expected {
			t.Errorf("isHex(%q) = %v, want %v", value, result, expected)
		}
	})
}

func FuzzRenderTerminalSVG(f *testing.F) {
	f.Add("hello", "red", "blue", true, false, true)
	f.Add("<script>", "default", "default", false, false, false)
	f.Add("&amp;", "#ff0000", "#000000", false, true, false)
	f.Add("", "nonexistent", "", false, false, false)

	f.Fuzz(func(t *testing.T, data, fg, bg string, bold, italic, reverse bool) {
		cell := terminalstate.Cell{
			Data:    data,
			FG:      fg,
			BG:      bg,
			Bold:    bold,
			Italics: italic,
			Reverse: reverse,
		}
		buffer := [][]terminalstate.Cell{{cell}}
		result := RenderTerminalSVG(buffer, 1, 1, "test", "#000", "#fff", nil)
		// Must produce valid SVG wrapper
		if !strings.HasPrefix(result, "<svg") {
			t.Errorf("output doesn't start with <svg")
		}
		if !strings.HasSuffix(result, "</svg>") {
			t.Errorf("output doesn't end with </svg>")
		}
		// HTML special chars in data must be escaped
		if strings.Contains(data, "<") && strings.Contains(result, "<script>") {
			t.Errorf("unescaped HTML in SVG output")
		}
	})
}

package webterm

import (
	"strings"
	"testing"

	"github.com/rcarmo/webterm-go-port/terminalstate"
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

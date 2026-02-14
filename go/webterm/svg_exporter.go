package webterm

import (
	"fmt"
	"html"
	"strings"

	"github.com/rcarmo/webterm-go-port/internal/terminalstate"
)

var ansiColors = map[string]string{
	"black":         "#000000",
	"red":           "#cc0000",
	"green":         "#4e9a06",
	"yellow":        "#c4a000",
	"blue":          "#3465a4",
	"magenta":       "#75507b",
	"cyan":          "#06989a",
	"white":         "#d3d7cf",
	"brightblack":   "#555753",
	"brightred":     "#ef2929",
	"brightgreen":   "#8ae234",
	"brightyellow":  "#fce94f",
	"brightblue":    "#729fcf",
	"brightmagenta": "#ad7fa8",
	"brightcyan":    "#34e2e2",
	"brightwhite":   "#eeeeec",
	"gray":          "#555753",
	"grey":          "#555753",
	"lightgray":     "#d3d7cf",
	"lightgrey":     "#d3d7cf",
	"brown":         "#c4a000",
}

func RenderTerminalSVG(
	buffer [][]terminalstate.Cell,
	width, height int,
	title, background, foreground string,
	palette map[string]string,
) string {
	if background == "" {
		background = "#000000"
	}
	if foreground == "" {
		foreground = "#d3d7cf"
	}
	if title == "" {
		title = "webterm"
	}
	if palette == nil {
		palette = ansiColors
	}
	fontSize := 14.0
	charWidth := 8.0
	lineHeight := 1.2
	cellHeight := fontSize * lineHeight
	svgWidth := float64(width)*charWidth + 20
	svgHeight := float64(height)*cellHeight + 20

	var b strings.Builder
	b.WriteString(fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.1f %.1f" class="terminal-svg">`, svgWidth, svgHeight))
	b.WriteString("<title>" + html.EscapeString(title) + "</title>")
	b.WriteString(`<defs><style>.terminal-bg{fill:` + background + `}.terminal-text{font-family:ui-monospace,"SFMono-Regular","Fira Code",Menlo,Monaco,Consolas,"Liberation Mono","DejaVu Sans Mono","Courier New",monospace;font-size:14px;fill:` + foreground + `;white-space:pre;text-rendering:optimizeLegibility}.bold{font-weight:bold}.italic{font-style:italic}.underline{text-decoration:underline}</style></defs>`)
	b.WriteString(fmt.Sprintf(`<rect class="terminal-bg" x="0" y="0" width="%.1f" height="%.1f"/>`, svgWidth, svgHeight))
	b.WriteString(`<g class="terminal-text">`)
	for rowIdx := 0; rowIdx < len(buffer); rowIdx++ {
		row := buffer[rowIdx]
		rectY := 10 + float64(rowIdx)*cellHeight
		textY := rectY + fontSize
		var rowText strings.Builder
		for col := 0; col < len(row); col++ {
			cell := row[col]
			charData := cell.Data
			if charData == "" {
				continue
			}
			x := 10 + float64(col)*charWidth
			fg := colorToHex(cell.FG, true, palette, foreground, background)
			bg := colorToHex(cell.BG, false, palette, foreground, background)
			if cell.Reverse {
				fg, bg = bg, fg
			}
			if bg != background {
				b.WriteString(fmt.Sprintf(`<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>`, x, rectY, charWidth+0.5, cellHeight+0.5, bg))
			}
			attrs := []string{fmt.Sprintf(`x="%.1f"`, x)}
			if fg != foreground {
				attrs = append(attrs, `fill="`+fg+`"`)
			}
			classes := []string{}
			if cell.Bold {
				classes = append(classes, "bold")
			}
			if cell.Italics {
				classes = append(classes, "italic")
			}
			if cell.Underscore {
				classes = append(classes, "underline")
			}
			if len(classes) > 0 {
				attrs = append(attrs, `class="`+strings.Join(classes, " ")+`"`)
			}
			rowText.WriteString(`<tspan ` + strings.Join(attrs, " ") + `>` + html.EscapeString(charData) + `</tspan>`)
		}
		if rowText.Len() > 0 {
			b.WriteString(fmt.Sprintf(`<text y="%.1f">%s</text>`, textY, rowText.String()))
		}
	}
	b.WriteString(`</g></svg>`)
	return b.String()
}

func colorToHex(color string, isFG bool, palette map[string]string, defaultFG, defaultBG string) string {
	if color == "" || strings.EqualFold(color, "default") {
		if isFG {
			return defaultFG
		}
		return defaultBG
	}
	if strings.HasPrefix(color, "#") {
		return color
	}
	if len(color) == 6 && isHex(color) {
		return "#" + color
	}
	key := strings.ToLower(color)
	if value, ok := palette[key]; ok {
		return value
	}
	if value, ok := ansiColors[key]; ok {
		return value
	}
	if isFG {
		return defaultFG
	}
	return defaultBG
}

func isHex(value string) bool {
	for _, ch := range value {
		switch {
		case ch >= '0' && ch <= '9':
		case ch >= 'a' && ch <= 'f':
		case ch >= 'A' && ch <= 'F':
		default:
			return false
		}
	}
	return true
}

package terminalstate

import (
	"fmt"
	"strconv"
	"strings"
	"sync"

	"github.com/rcarmo/go-te/pkg/te"
)

var ansi16Names = [...]string{
	"black",
	"red",
	"green",
	"yellow",
	"blue",
	"magenta",
	"cyan",
	"white",
	"brightblack",
	"brightred",
	"brightgreen",
	"brightyellow",
	"brightblue",
	"brightmagenta",
	"brightcyan",
	"brightwhite",
}

type Cell struct {
	Data       string `json:"data"`
	FG         string `json:"fg"`
	BG         string `json:"bg"`
	Bold       bool   `json:"bold"`
	Italics    bool   `json:"italics"`
	Underscore bool   `json:"underscore"`
	Reverse    bool   `json:"reverse"`
}

type Snapshot struct {
	Width      int      `json:"width"`
	Height     int      `json:"height"`
	Buffer     [][]Cell `json:"buffer"`
	HasChanges bool     `json:"has_changes"`
}

type Tracker struct {
	mu                  sync.Mutex
	screen              *te.DiffScreen
	stream              *te.ByteStream
	changeCounter       uint64
	lastSnapshotCounter uint64
}

func NewTracker(width, height int) *Tracker {
	screen := te.NewDiffScreen(width, height)
	return &Tracker{
		screen: screen,
		stream: te.NewByteStream(screen, false),
	}
}

func (t *Tracker) Feed(data []byte) error {
	if len(data) == 0 {
		return nil
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	if err := t.stream.Feed(data); err != nil {
		return err
	}
	if len(t.screen.Dirty) > 0 {
		t.changeCounter++
		// Clear dirty set so subsequent feeds detect new changes
		for k := range t.screen.Dirty {
			delete(t.screen.Dirty, k)
		}
	}
	return nil
}

func (t *Tracker) Resize(width, height int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if width == t.screen.Columns && height == t.screen.Lines {
		return
	}
	t.screen.Resize(height, width)
	t.changeCounter++
}

func (t *Tracker) Snapshot() Snapshot {
	t.mu.Lock()
	defer t.mu.Unlock()

	snapshot := Snapshot{
		Width:      t.screen.Columns,
		Height:     t.screen.Lines,
		HasChanges: t.changeCounter > t.lastSnapshotCounter,
		Buffer:     make([][]Cell, t.screen.Lines),
	}
	t.lastSnapshotCounter = t.changeCounter

	for row := 0; row < t.screen.Lines; row++ {
		line := make([]Cell, t.screen.Columns)
		for col := 0; col < t.screen.Columns; col++ {
			raw := t.screen.Buffer[row][col]
			data := raw.Data
			if data == "" {
				data = " "
			}
			line[col] = Cell{
				Data:       data,
				FG:         colorToString(raw.Attr.Fg),
				BG:         colorToString(raw.Attr.Bg),
				Bold:       raw.Attr.Bold,
				Italics:    raw.Attr.Italics,
				Underscore: raw.Attr.Underline,
				Reverse:    raw.Attr.Reverse,
			}
		}
		snapshot.Buffer[row] = line
	}
	return snapshot
}

func colorToString(color te.Color) string {
	if color.Name != "" {
		name := strings.ToLower(strings.TrimPrefix(color.Name, "#"))
		if len(name) == 6 {
			if _, err := strconv.ParseUint(name, 16, 32); err == nil {
				return name
			}
		}
		return name
	}
	switch color.Mode {
	case te.ColorDefault:
		return "default"
	case te.ColorANSI16:
		if int(color.Index) < len(ansi16Names) {
			return ansi16Names[color.Index]
		}
		return "default"
	case te.ColorANSI256:
		return fmt.Sprintf("%d", color.Index)
	case te.ColorTrueColor:
		return "default"
	default:
		return "default"
	}
}

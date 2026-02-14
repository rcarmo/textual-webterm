package terminalstate

import (
	"testing"

	"github.com/rcarmo/go-te/pkg/te"
)

func TestTrackerSnapshotChangeTracking(t *testing.T) {
	tracker := NewTracker(10, 3)
	if err := tracker.Feed([]byte("hi")); err != nil {
		t.Fatalf("Feed() error = %v", err)
	}

	snapshot := tracker.Snapshot()
	if !snapshot.HasChanges {
		t.Fatalf("expected first snapshot to report changes")
	}
	if got := snapshot.Buffer[0][0].Data; got != "h" {
		t.Fatalf("expected first cell to be h, got %q", got)
	}
	if got := snapshot.Buffer[0][1].Data; got != "i" {
		t.Fatalf("expected second cell to be i, got %q", got)
	}

	again := tracker.Snapshot()
	if again.HasChanges {
		t.Fatalf("expected second snapshot without new input to report no changes")
	}
}

func TestTrackerAnsiStyles(t *testing.T) {
	tracker := NewTracker(10, 3)
	if err := tracker.Feed([]byte("\x1b[31;1mA\x1b[0m")); err != nil {
		t.Fatalf("Feed() error = %v", err)
	}
	snapshot := tracker.Snapshot()
	cell := snapshot.Buffer[0][0]
	if !cell.Bold {
		t.Fatalf("expected bold attribute to be true")
	}
	if cell.FG != "red" {
		t.Fatalf("expected red foreground, got %q", cell.FG)
	}
}

func TestTrackerResize(t *testing.T) {
	tracker := NewTracker(10, 3)
	tracker.Resize(20, 4)
	snapshot := tracker.Snapshot()
	if snapshot.Width != 20 || snapshot.Height != 4 {
		t.Fatalf("unexpected dimensions: got %dx%d", snapshot.Width, snapshot.Height)
	}
	if !snapshot.HasChanges {
		t.Fatalf("expected resize to mark snapshot as changed")
	}
}

func TestColorToStringModes(t *testing.T) {
	if got := colorToString(te.Color{Mode: te.ColorDefault}); got != "default" {
		t.Fatalf("default color mismatch: %q", got)
	}
	if got := colorToString(te.Color{Mode: te.ColorANSI16, Index: 1}); got != "red" {
		t.Fatalf("ansi16 color mismatch: %q", got)
	}
	if got := colorToString(te.Color{Mode: te.ColorANSI256, Index: 196}); got != "196" {
		t.Fatalf("ansi256 color mismatch: %q", got)
	}
	if got := colorToString(te.Color{Name: "#AABBCC"}); got != "aabbcc" {
		t.Fatalf("named hex color mismatch: %q", got)
	}
	if got := colorToString(te.Color{Name: "Blue"}); got != "blue" {
		t.Fatalf("named color mismatch: %q", got)
	}
}

func FuzzTrackerFeed(f *testing.F) {
	f.Add([]byte("hello world"))
	f.Add([]byte("\x1b[31;1mRed Bold\x1b[0m"))
	f.Add([]byte("\x1b[2J\x1b[H"))
	f.Add([]byte("\x1b[10;20H\x1b[K"))
	f.Add([]byte("\r\n\r\n\r\n"))
	f.Add([]byte{0x00, 0x01, 0x02, 0x1b, 0x5b, 0x41})
	f.Add([]byte("\x1b[?1049h\x1b[2J"))
	f.Add([]byte("\x1b[38;5;196mcolor\x1b[0m"))

	f.Fuzz(func(t *testing.T, data []byte) {
		tracker := NewTracker(80, 24)
		// Feed must not panic
		_ = tracker.Feed(data)
		// Snapshot must always return valid dimensions
		snap := tracker.Snapshot()
		if snap.Width != 80 || snap.Height != 24 {
			t.Errorf("unexpected dimensions after feed: %dx%d", snap.Width, snap.Height)
		}
		if len(snap.Buffer) != 24 {
			t.Errorf("buffer row count mismatch: got %d", len(snap.Buffer))
		}
		for i, row := range snap.Buffer {
			if len(row) != 80 {
				t.Errorf("row %d col count mismatch: got %d", i, len(row))
			}
		}
	})
}

func FuzzTrackerFeedIncremental(f *testing.F) {
	f.Add([]byte("\x1b[31m"), []byte("hello\x1b[0m"))
	f.Add([]byte("abc"), []byte("def"))
	f.Add([]byte("\x1b["), []byte("1;2H"))

	f.Fuzz(func(t *testing.T, chunk1, chunk2 []byte) {
		tracker := NewTracker(40, 10)
		_ = tracker.Feed(chunk1)
		_ = tracker.Feed(chunk2)
		snap := tracker.Snapshot()
		if snap.Width != 40 || snap.Height != 10 {
			t.Errorf("unexpected dimensions: %dx%d", snap.Width, snap.Height)
		}
	})
}

package terminalstate

import "testing"

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

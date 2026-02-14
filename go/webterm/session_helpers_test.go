package webterm

import (
	"testing"

	"github.com/rcarmo/webterm-go-port/internal/terminalstate"
)

type captureConnector struct {
	data [][]byte
}

func (c *captureConnector) OnData(data []byte) {
	c.data = append(c.data, append([]byte{}, data...))
}

func (c *captureConnector) OnBinary([]byte)       {}
func (c *captureConnector) OnMeta(map[string]any) {}
func (c *captureConnector) OnClose()              {}

func TestDispatchSessionOutput(t *testing.T) {
	replay := NewReplayBuffer(1024)
	connector := &captureConnector{}
	tracker := terminalstate.NewTracker(80, 24)

	dispatchSessionOutput([]byte("hello\n"), tracker, replay, connector)
	if got := string(replay.Bytes()); got != "hello\n" {
		t.Fatalf("unexpected replay: %q", got)
	}
	if len(connector.data) != 1 || string(connector.data[0]) != "hello\n" {
		t.Fatalf("unexpected connector data: %+v", connector.data)
	}
}

func TestDispatchSessionOutputEmpty(t *testing.T) {
	replay := NewReplayBuffer(1024)
	connector := &captureConnector{}

	dispatchSessionOutput(nil, nil, replay, connector)
	dispatchSessionOutput([]byte{}, nil, replay, connector)

	if got := string(replay.Bytes()); got != "" {
		t.Fatalf("expected empty replay, got %q", got)
	}
	if len(connector.data) != 0 {
		t.Fatalf("expected no connector events")
	}
}

func TestSnapshotFromTrackerFallback(t *testing.T) {
	snap := snapshotFromTracker(nil, 10, -2)
	if snap.Width != 10 || snap.Height != 0 || len(snap.Buffer) != 0 {
		t.Fatalf("unexpected fallback snapshot: %+v", snap)
	}
}

func TestSnapshotFromTrackerWithTracker(t *testing.T) {
	tracker := terminalstate.NewTracker(4, 2)
	_ = tracker.Feed([]byte("ab"))
	snap := snapshotFromTracker(tracker, 1, 1)
	if snap.Width != 4 || snap.Height != 2 {
		t.Fatalf("unexpected tracker snapshot dimensions: %+v", snap)
	}
}

package webterm

import (
	"github.com/rcarmo/webterm-go-port/internal/terminalstate"
)

type SessionConnector interface {
	OnData(data []byte)
	OnBinary(payload []byte)
	OnMeta(meta map[string]any)
	OnClose()
}

type Session interface {
	Open(width, height int) error
	Start(connector SessionConnector) error
	Close() error
	Wait() error
	SetTerminalSize(width, height int) error
	SendBytes(data []byte) bool
	SendMeta(meta map[string]any) bool
	IsRunning() bool
	GetReplayBuffer() []byte
	GetScreenSnapshot() terminalstate.Snapshot
	ForceRedraw() error
	UpdateConnector(connector SessionConnector)
}

type noopConnector struct{}

func (noopConnector) OnData([]byte)         {}
func (noopConnector) OnBinary([]byte)       {}
func (noopConnector) OnMeta(map[string]any) {}
func (noopConnector) OnClose()              {}

func dispatchSessionOutput(filtered []byte, tracker *terminalstate.Tracker, replay *ReplayBuffer, connector SessionConnector) {
	if len(filtered) == 0 {
		return
	}
	replay.Add(filtered)
	if tracker != nil {
		_ = tracker.Feed(filtered)
	}
	connector.OnData(filtered)
}

func snapshotFromTracker(tracker *terminalstate.Tracker, width, height int) terminalstate.Snapshot {
	if tracker != nil {
		return tracker.Snapshot()
	}
	if height < 0 {
		height = 0
	}
	return terminalstate.Snapshot{
		Width:  width,
		Height: height,
		Buffer: make([][]terminalstate.Cell, height),
	}
}

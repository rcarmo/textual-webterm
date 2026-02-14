package webterm

import (
	"github.com/rcarmo/webterm-go-port/terminalstate"
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

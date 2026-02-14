package webterm

import (
	"sync"

	"github.com/rcarmo/webterm-go-port/internal/terminalstate"
)

type fakeSession struct {
	mu        sync.Mutex
	running   bool
	replay    []byte
	snapshot  terminalstate.Snapshot
	received  [][]byte
	width     int
	height    int
	connector SessionConnector
}

func newFakeSession() *fakeSession {
	return &fakeSession{
		snapshot: terminalstate.Snapshot{
			Width:      80,
			Height:     24,
			Buffer:     [][]terminalstate.Cell{{{Data: "h", FG: "default", BG: "default"}}},
			HasChanges: true,
		},
	}
}

func (f *fakeSession) Open(width, height int) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.running = true
	f.width = width
	f.height = height
	f.snapshot.Width = width
	f.snapshot.Height = height
	return nil
}

func (f *fakeSession) Start(connector SessionConnector) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.connector = connector
	return nil
}

func (f *fakeSession) Close() error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.running = false
	return nil
}

func (f *fakeSession) Wait() error { return nil }

func (f *fakeSession) SetTerminalSize(width, height int) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.width = width
	f.height = height
	f.snapshot.Width = width
	f.snapshot.Height = height
	return nil
}

func (f *fakeSession) SendBytes(data []byte) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	chunk := append([]byte{}, data...)
	f.received = append(f.received, chunk)
	return true
}

func (f *fakeSession) SendMeta(_ map[string]any) bool { return true }

func (f *fakeSession) IsRunning() bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.running
}

func (f *fakeSession) GetReplayBuffer() []byte {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]byte{}, f.replay...)
}

func (f *fakeSession) GetScreenSnapshot() terminalstate.Snapshot {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.snapshot
}

func (f *fakeSession) ForceRedraw() error { return nil }

func (f *fakeSession) UpdateConnector(connector SessionConnector) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.connector = connector
}

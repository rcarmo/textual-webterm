package webterm

import (
	"errors"
	"os"
	"os/exec"
	"strings"
	"sync"
	"syscall"

	"github.com/creack/pty"
	"github.com/google/shlex"
	"github.com/rcarmo/webterm-go-port/terminalstate"
)

type TerminalSession struct {
	sessionID string
	command   string

	mu           sync.RWMutex
	connector    SessionConnector
	cmd          *exec.Cmd
	ptyFile      *os.File
	tracker      *terminalstate.Tracker
	replay       *ReplayBuffer
	escapeBuffer []byte
	utf8Buffer   []byte
	width        int
	height       int
	started      bool
	running      bool
	done         chan struct{}
	doneOnce     sync.Once
	waitErr      error
	writeMu      sync.Mutex
}

func NewTerminalSession(sessionID string, command string) *TerminalSession {
	return &TerminalSession{
		sessionID: sessionID,
		command:   command,
		connector: noopConnector{},
		replay:    NewReplayBuffer(replayBufferSize),
		done:      make(chan struct{}),
		width:     DefaultTerminalWidth,
		height:    DefaultTerminalHeight,
	}
}

func (s *TerminalSession) Open(width, height int) error {
	if width <= 0 {
		width = 80
	}
	if height <= 0 {
		height = 24
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.running {
		return nil
	}
	command := strings.TrimSpace(s.command)
	if command == "" {
		command = os.Getenv("SHELL")
	}
	if command == "" {
		command = "/bin/sh"
	}
	argv, err := shlex.Split(command)
	if err != nil {
		return err
	}
	if len(argv) == 0 {
		return errors.New("empty command")
	}
	cmd := exec.Command(argv[0], argv[1:]...)
	cmd.Env = append(os.Environ(), "TERM_PROGRAM=webterm-go", "TERM_PROGRAM_VERSION=0.0.0")
	file, err := pty.StartWithSize(cmd, &pty.Winsize{Cols: uint16(width), Rows: uint16(height)})
	if err != nil {
		return err
	}
	s.cmd = cmd
	s.ptyFile = file
	s.tracker = terminalstate.NewTracker(width, height)
	s.width = width
	s.height = height
	s.running = true
	return nil
}

func (s *TerminalSession) Start(connector SessionConnector) error {
	s.mu.Lock()
	if connector != nil {
		s.connector = connector
	}
	if s.started {
		s.mu.Unlock()
		return nil
	}
	if s.ptyFile == nil {
		s.mu.Unlock()
		return errors.New("session not open")
	}
	s.started = true
	file := s.ptyFile
	s.mu.Unlock()
	go s.readLoop(file)
	return nil
}

func (s *TerminalSession) readLoop(file *os.File) {
	buf := make([]byte, 32*1024)
	for {
		n, err := file.Read(buf)
		if n > 0 {
			s.handleOutput(buf[:n])
		}
		if err != nil {
			break
		}
	}
	s.mu.Lock()
	if s.cmd != nil {
		s.waitErr = s.cmd.Wait()
	}
	s.running = false
	connector := s.connector
	s.mu.Unlock()
	connector.OnClose()
	s.doneOnce.Do(func() { close(s.done) })
}

func (s *TerminalSession) handleOutput(data []byte) {
	s.mu.Lock()
	filtered, escapeBuffer := FilterDASequences(data, s.escapeBuffer)
	s.escapeBuffer = escapeBuffer
	normalized, utf8Buffer := NormalizeC1Controls(filtered, s.utf8Buffer)
	s.utf8Buffer = utf8Buffer
	tracker := s.tracker
	connector := s.connector
	s.mu.Unlock()

	if len(normalized) == 0 {
		return
	}
	s.replay.Add(normalized)
	if tracker != nil {
		_ = tracker.Feed(normalized)
	}
	connector.OnData(normalized)
}

func (s *TerminalSession) Close() error {
	s.mu.Lock()
	file := s.ptyFile
	cmd := s.cmd
	s.ptyFile = nil
	s.running = false
	s.mu.Unlock()

	if cmd != nil && cmd.Process != nil {
		_ = cmd.Process.Signal(syscall.SIGHUP)
	}
	if file != nil {
		_ = file.Close()
	}
	s.doneOnce.Do(func() { close(s.done) })
	return nil
}

func (s *TerminalSession) Wait() error {
	<-s.done
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.waitErr
}

func (s *TerminalSession) SetTerminalSize(width, height int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.ptyFile == nil {
		return errors.New("session closed")
	}
	if width <= 0 {
		width = 1
	}
	if height <= 0 {
		height = 1
	}
	if err := pty.Setsize(s.ptyFile, &pty.Winsize{Cols: uint16(width), Rows: uint16(height)}); err != nil {
		return err
	}
	s.width = width
	s.height = height
	if s.tracker != nil {
		s.tracker.Resize(width, height)
	}
	return nil
}

func (s *TerminalSession) ForceRedraw() error {
	s.mu.RLock()
	width := s.width
	height := s.height
	s.mu.RUnlock()
	return s.SetTerminalSize(width, height)
}

func (s *TerminalSession) SendBytes(data []byte) bool {
	s.mu.RLock()
	file := s.ptyFile
	s.mu.RUnlock()
	if file == nil {
		return false
	}
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	_, err := file.Write(data)
	return err == nil
}

func (s *TerminalSession) SendMeta(_ map[string]any) bool {
	return true
}

func (s *TerminalSession) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.running
}

func (s *TerminalSession) GetReplayBuffer() []byte {
	return s.replay.Bytes()
}

func (s *TerminalSession) GetScreenSnapshot() terminalstate.Snapshot {
	s.mu.RLock()
	tracker := s.tracker
	s.mu.RUnlock()
	if tracker == nil {
		return terminalstate.Snapshot{
			Width:  s.width,
			Height: s.height,
			Buffer: make([][]terminalstate.Cell, s.height),
		}
	}
	return tracker.Snapshot()
}

func (s *TerminalSession) UpdateConnector(connector SessionConnector) {
	if connector == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.connector = connector
}

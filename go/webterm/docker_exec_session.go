package webterm

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/rcarmo/webterm-go-port/internal/terminalstate"
)

type DockerExecSpec struct {
	Container string
	Command   []string
	User      string
}

type readBufferedConn struct {
	net.Conn
	reader *bufio.Reader
}

func (r *readBufferedConn) Read(p []byte) (int, error) {
	return r.reader.Read(p)
}

type DockerExecSession struct {
	sessionID string
	spec      DockerExecSpec
	socket    string

	mu           sync.RWMutex
	connector    SessionConnector
	execID       string
	conn         net.Conn
	tracker      *terminalstate.Tracker
	replay       *ReplayBuffer
	escapeBuffer []byte
	width        int
	height       int
	running      bool
	started      bool
	done         chan struct{}
	doneOnce     sync.Once
	waitErr      error
	writeMu      sync.Mutex
}

func NewDockerExecSession(sessionID string, spec DockerExecSpec, socketPath string) *DockerExecSession {
	if socketPath == "" {
		socketPath = DockerSocketPath()
	}
	return &DockerExecSession{
		sessionID: sessionID,
		spec:      spec,
		socket:    socketPath,
		connector: noopConnector{},
		replay:    NewReplayBuffer(replayBufferSize),
		done:      make(chan struct{}),
		width:     DefaultTerminalWidth,
		height:    DefaultTerminalHeight,
	}
}

func (s *DockerExecSession) Open(width, height int) error {
	if width <= 0 {
		width = 80
	}
	if height <= 0 {
		height = 24
	}
	execID, err := s.createExec()
	if err != nil {
		return err
	}
	conn, err := s.startExecSocket(execID)
	if err != nil {
		return err
	}
	s.mu.Lock()
	s.execID = execID
	s.conn = conn
	s.tracker = terminalstate.NewTracker(width, height)
	s.width = width
	s.height = height
	s.running = true
	s.mu.Unlock()
	_ = s.resizeExec(width, height)
	return nil
}

func (s *DockerExecSession) Start(connector SessionConnector) error {
	s.mu.Lock()
	if connector != nil {
		s.connector = connector
	}
	if s.started {
		s.mu.Unlock()
		return nil
	}
	if s.conn == nil {
		s.mu.Unlock()
		return errors.New("docker session not open")
	}
	s.started = true
	conn := s.conn
	s.mu.Unlock()
	go s.readLoop(conn)
	return nil
}

func (s *DockerExecSession) readLoop(conn net.Conn) {
	buf := make([]byte, 32*1024)
	for {
		n, err := conn.Read(buf)
		if n > 0 {
			s.handleOutput(buf[:n])
		}
		if err != nil {
			if !errors.Is(err, io.EOF) {
				s.mu.Lock()
				s.waitErr = err
				s.mu.Unlock()
			}
			break
		}
	}
	s.mu.Lock()
	s.running = false
	connector := s.connector
	s.mu.Unlock()
	connector.OnClose()
	s.doneOnce.Do(func() { close(s.done) })
}

func (s *DockerExecSession) handleOutput(data []byte) {
	s.mu.Lock()
	filtered, escapeBuffer := FilterDASequences(data, s.escapeBuffer)
	s.escapeBuffer = escapeBuffer
	tracker := s.tracker
	connector := s.connector
	s.mu.Unlock()
	dispatchSessionOutput(filtered, tracker, s.replay, connector)
}

func (s *DockerExecSession) createExec() (string, error) {
	payload := map[string]any{
		"AttachStdin":  true,
		"AttachStdout": true,
		"AttachStderr": true,
		"Tty":          true,
		"Cmd":          s.spec.Command,
	}
	if strings.TrimSpace(s.spec.User) != "" {
		payload["User"] = s.spec.User
	}
	path := fmt.Sprintf("/containers/%s/exec", url.PathEscape(s.spec.Container))
	status, body, err := unixJSONRequest(s.socket, http.MethodPost, path, payload)
	if err != nil {
		return "", err
	}
	if status < 200 || status >= 300 {
		return "", fmt.Errorf("docker exec create failed (%d): %s", status, string(body))
	}
	var resp map[string]any
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", err
	}
	id, _ := resp["Id"].(string)
	if id == "" {
		return "", errors.New("docker exec id missing")
	}
	return id, nil
}

func (s *DockerExecSession) startExecSocket(execID string) (net.Conn, error) {
	conn, err := net.Dial("unix", s.socket)
	if err != nil {
		return nil, err
	}
	payload, _ := json.Marshal(map[string]any{"Detach": false, "Tty": true})
	req, err := http.NewRequest(http.MethodPost, "http://unix/exec/"+url.PathEscape(execID)+"/start", bytes.NewReader(payload))
	if err != nil {
		_ = conn.Close()
		return nil, err
	}
	req.Header.Set("Host", "localhost")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "tcp")
	req.ContentLength = int64(len(payload))
	if err := req.Write(conn); err != nil {
		_ = conn.Close()
		return nil, err
	}
	reader := bufio.NewReader(conn)
	resp, err := http.ReadResponse(reader, req)
	if err != nil {
		_ = conn.Close()
		return nil, err
	}
	if resp.StatusCode != http.StatusSwitchingProtocols && (resp.StatusCode < 200 || resp.StatusCode >= 300) {
		body, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("docker exec start failed (%d): %s", resp.StatusCode, string(body))
	}
	_ = resp.Body.Close()
	return &readBufferedConn{Conn: conn, reader: reader}, nil
}

func (s *DockerExecSession) resizeExec(width, height int) error {
	s.mu.RLock()
	execID := s.execID
	s.mu.RUnlock()
	if execID == "" {
		return nil
	}
	path := fmt.Sprintf("/exec/%s/resize?h=%d&w=%d", url.PathEscape(execID), height, width)
	status, body, err := unixJSONRequest(s.socket, http.MethodPost, path, nil)
	if err != nil {
		return err
	}
	if status < 200 || status >= 300 {
		return fmt.Errorf("docker resize failed (%d): %s", status, string(body))
	}
	return nil
}

func (s *DockerExecSession) Close() error {
	s.mu.Lock()
	conn := s.conn
	s.conn = nil
	s.running = false
	s.mu.Unlock()
	if conn != nil {
		_ = conn.Close()
	}
	s.doneOnce.Do(func() { close(s.done) })
	return nil
}

func (s *DockerExecSession) Wait() error {
	<-s.done
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.waitErr
}

func (s *DockerExecSession) SetTerminalSize(width, height int) error {
	if width <= 0 {
		width = 1
	}
	if height <= 0 {
		height = 1
	}
	s.mu.Lock()
	s.width = width
	s.height = height
	if s.tracker != nil {
		s.tracker.Resize(width, height)
	}
	s.mu.Unlock()
	return s.resizeExec(width, height)
}

func (s *DockerExecSession) ForceRedraw() error {
	s.mu.RLock()
	width, height := s.width, s.height
	s.mu.RUnlock()
	return s.SetTerminalSize(width, height)
}

func (s *DockerExecSession) SendBytes(data []byte) bool {
	s.mu.RLock()
	conn := s.conn
	s.mu.RUnlock()
	if conn == nil {
		return false
	}
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	_, err := conn.Write(data)
	return err == nil
}

func (s *DockerExecSession) SendMeta(_ map[string]any) bool {
	return true
}

func (s *DockerExecSession) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.running
}

func (s *DockerExecSession) GetReplayBuffer() []byte {
	return s.replay.Bytes()
}

func (s *DockerExecSession) GetScreenSnapshot() terminalstate.Snapshot {
	s.mu.RLock()
	tracker := s.tracker
	width, height := s.width, s.height
	s.mu.RUnlock()
	return snapshotFromTracker(tracker, width, height)
}

func (s *DockerExecSession) UpdateConnector(connector SessionConnector) {
	if connector == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.connector = connector
}

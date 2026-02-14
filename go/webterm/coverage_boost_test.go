package webterm

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/rcarmo/webterm-go-port/internal/terminalstate"
)

func newUnixHTTPTestServer(t *testing.T, handler http.Handler) (string, func()) {
	t.Helper()
	socket := filepath.Join(t.TempDir(), "docker.sock")
	ln, err := net.Listen("unix", socket)
	if err != nil {
		t.Fatalf("listen unix socket: %v", err)
	}
	srv := &http.Server{Handler: handler}
	go func() { _ = srv.Serve(ln) }()
	cleanup := func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
		_ = ln.Close()
		_ = os.Remove(socket)
	}
	return socket, cleanup
}

func TestDockerSocketPathVariants(t *testing.T) {
	t.Setenv(DockerHostEnv, "")
	if got := DockerSocketPath(); got != defaultDockerSocket {
		t.Fatalf("empty %s: got %q", DockerHostEnv, got)
	}

	t.Setenv(DockerHostEnv, "unix:///tmp/docker.sock")
	if got := DockerSocketPath(); got != "/tmp/docker.sock" {
		t.Fatalf("unix:// host: got %q", got)
	}

	t.Setenv(DockerHostEnv, "/tmp/direct.sock")
	if got := DockerSocketPath(); got != "/tmp/direct.sock" {
		t.Fatalf("absolute host: got %q", got)
	}

	t.Setenv(DockerHostEnv, "tcp://127.0.0.1:2375")
	if got := DockerSocketPath(); got != defaultDockerSocket {
		t.Fatalf("unsupported host should fallback: got %q", got)
	}
}

func TestUnixJSONRequestAndSharedClient(t *testing.T) {
	sharedClientsMu.Lock()
	sharedClients = map[string]*http.Client{}
	sharedClientsMu.Unlock()

	handler := http.NewServeMux()
	handler.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "method": r.Method})
	})
	handler.HandleFunc("/echo", func(w http.ResponseWriter, r *http.Request) {
		var payload map[string]any
		_ = json.NewDecoder(r.Body).Decode(&payload)
		_ = json.NewEncoder(w).Encode(payload)
	})
	socket, cleanup := newUnixHTTPTestServer(t, handler)
	defer cleanup()

	status, body, err := unixJSONRequest(socket, http.MethodGet, "/ping", nil)
	if err != nil || status != http.StatusOK {
		t.Fatalf("unixJSONRequest GET: status=%d err=%v", status, err)
	}
	if !strings.Contains(string(body), `"ok":true`) {
		t.Fatalf("unexpected GET body: %s", string(body))
	}

	status, body, err = unixJSONRequest(socket, http.MethodPost, "/echo", map[string]any{"x": 1})
	if err != nil || status != http.StatusOK {
		t.Fatalf("unixJSONRequest POST: status=%d err=%v", status, err)
	}
	if !strings.Contains(string(body), `"x":1`) {
		t.Fatalf("unexpected POST body: %s", string(body))
	}

	c1 := sharedUnixClient(socket)
	c2 := sharedUnixClient(socket)
	if c1 != c2 {
		t.Fatalf("sharedUnixClient should cache by socket path")
	}
}

func TestNoopConnectorMethods(t *testing.T) {
	var c noopConnector
	c.OnData([]byte("x"))
	c.OnBinary([]byte("y"))
	c.OnMeta(map[string]any{"k": "v"})
	c.OnClose()
}

func TestSessionManagerAPIsAndClosePaths(t *testing.T) {
	manager := NewSessionManager([]App{{Name: "Shell", Slug: "shell", Command: "/bin/sh", Terminal: true}})
	manager.SetSessionFactory(func(app App, sessionID string) Session { return newFakeSession() })

	apps := manager.Apps()
	if len(apps) != 1 || apps[0].Slug != "shell" {
		t.Fatalf("unexpected apps: %+v", apps)
	}
	if app, ok := manager.GetDefaultApp(); !ok || app.Slug != "shell" {
		t.Fatalf("GetDefaultApp failed: app=%+v ok=%v", app, ok)
	}

	session, err := manager.NewSession("shell", "sid-1", "route-1", 80, 24)
	if err != nil || session == nil {
		t.Fatalf("NewSession failed: %v", err)
	}
	route, running, ok := manager.GetFirstRunningSession()
	if !ok || route != "route-1" || running == nil {
		t.Fatalf("GetFirstRunningSession failed: route=%q ok=%v", route, ok)
	}

	manager.CloseSession("sid-1")
	if manager.GetSessionByRouteKey("route-1") != nil {
		t.Fatalf("CloseSession should remove route mapping")
	}

	_, _ = manager.NewSession("shell", "sid-2", "route-2", 80, 24)
	_, _ = manager.NewSession("shell", "sid-3", "route-3", 80, 24)
	manager.CloseAll()
	if s := manager.GetSession("sid-2"); s != nil {
		t.Fatalf("CloseAll should remove session sid-2")
	}
	if s := manager.GetSession("sid-3"); s != nil {
		t.Fatalf("CloseAll should remove session sid-3")
	}
	if manager.GetSessionByRouteKey("route-2") != nil || manager.GetSessionByRouteKey("route-3") != nil {
		t.Fatalf("CloseAll should remove route mappings")
	}
}

func TestLocalClientConnectorAndHelpers(t *testing.T) {
	server := NewLocalServer(Config{}, ServerOptions{})
	connector := &localClientConnector{server: server, sessionID: "sid", routeKey: "rk"}
	connector.OnData([]byte("abc"))
	connector.OnBinary([]byte("def"))
	connector.OnMeta(map[string]any{"x": 1})
	connector.OnClose()

	if got := toIntFromQuery("42", 7); got != 42 {
		t.Fatalf("toIntFromQuery valid: got %d", got)
	}
	if got := toIntFromQuery("not-a-number", 7); got != 7 {
		t.Fatalf("toIntFromQuery fallback: got %d", got)
	}
}

func TestHandleEventsDisconnect(t *testing.T) {
	server := NewLocalServer(Config{}, ServerOptions{})
	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodGet, "/events", nil).WithContext(ctx)
	w := httptest.NewRecorder()

	done := make(chan struct{})
	go func() {
		server.handleEvents(w, req)
		close(done)
	}()
	time.Sleep(20 * time.Millisecond)
	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatalf("handleEvents did not exit on context cancellation")
	}
}

func TestRunWithCanceledContext(t *testing.T) {
	server := NewLocalServer(Config{}, ServerOptions{Host: "127.0.0.1", Port: 0})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := server.Run(ctx); err != nil {
		t.Fatalf("Run with canceled context failed: %v", err)
	}
}

func TestDockerWatcherHelpersAndContainerLifecycle(t *testing.T) {
	manager := NewSessionManager(nil)
	manager.SetSessionFactory(func(app App, sessionID string) Session { return newFakeSession() })

	var addedCount atomic.Int32
	var removedCount atomic.Int32
	watcher := NewDockerWatcher(
		manager,
		"/tmp/does-not-exist.sock",
		func(slug, name, command string) { addedCount.Add(1) },
		func(slug string) { removedCount.Add(1) },
	)

	if !hasWebtermLabel(map[string]string{WebtermLabelName: "auto"}) {
		t.Fatalf("expected command label to match")
	}
	if !hasWebtermLabel(map[string]string{WebtermThemeLabel: "nord"}) {
		t.Fatalf("expected theme label to match")
	}
	if hasWebtermLabel(map[string]string{"other": "x"}) {
		t.Fatalf("unexpected label match")
	}
	if !isAutoLabel("") || !isAutoLabel("auto") || !isAutoLabel(" AUTO ") {
		t.Fatalf("expected auto labels")
	}
	if isAutoLabel("bash") {
		t.Fatalf("non-auto label incorrectly matched")
	}

	container := map[string]any{
		"Id":    "123456789012",
		"Names": []any{"/my_container.1"},
		"Labels": map[string]any{
			WebtermLabelName:  "auto",
			WebtermThemeLabel: "nord",
		},
	}
	watcher.addContainer(container)
	watcher.addContainer(container) // duplicate should be ignored

	slug := watcher.containerToSlug(container)
	if app, ok := manager.AppBySlug(slug); !ok || app.Theme != "nord" || app.Command != AutoCommandSentinel {
		t.Fatalf("added app mismatch: app=%+v ok=%v", app, ok)
	}
	if addedCount.Load() != 1 {
		t.Fatalf("expected exactly one add callback, got %d", addedCount.Load())
	}

	manager.sessions["sid"] = newFakeSession()
	_ = manager.routes.Set(slug, "sid")
	watcher.removeContainer("1234567")
	if _, ok := manager.AppBySlug(slug); ok {
		t.Fatalf("removeContainer should remove app %q", slug)
	}
	if removedCount.Load() != 1 {
		t.Fatalf("expected remove callback")
	}
}

func TestDockerWatcherListAndHandleEvent(t *testing.T) {
	manager := NewSessionManager(nil)
	watcher := NewDockerWatcher(manager, "", nil, nil)

	handler := http.NewServeMux()
	handler.HandleFunc("/containers/json", func(w http.ResponseWriter, r *http.Request) {
		containers := []map[string]any{
			{
				"Id":    "abc123",
				"Names": []any{"/svc1"},
				"Labels": map[string]any{
					WebtermLabelName: "auto",
				},
			},
		}
		_ = json.NewEncoder(w).Encode(containers)
	})
	handler.HandleFunc("/containers/evt123/json", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"Name": "/evt_container",
			"Config": map[string]any{
				"Labels": map[string]any{
					WebtermLabelName: "auto",
				},
			},
		})
	})
	socket, cleanup := newUnixHTTPTestServer(t, handler)
	defer cleanup()
	watcher.socketPath = socket

	containers, err := watcher.listLabeledContainers()
	if err != nil {
		t.Fatalf("listLabeledContainers error: %v", err)
	}
	if len(containers) != 1 || asString(containers[0]["Id"]) != "abc123" {
		t.Fatalf("unexpected containers payload: %+v", containers)
	}

	watcher.handleEvent(map[string]any{
		"Action": "start",
		"Actor":  map[string]any{"ID": "evt123"},
	})
	if _, ok := manager.AppBySlug("evt-container"); !ok {
		t.Fatalf("start event should add app")
	}
	watcher.handleEvent(map[string]any{
		"Action": "die",
		"Actor":  map[string]any{"ID": "evt123"},
	})
	if _, ok := manager.AppBySlug("evt-container"); ok {
		t.Fatalf("die event should remove app")
	}
}

func TestDockerStatsCollectorLifecycleAndPolling(t *testing.T) {
	handler := http.NewServeMux()
	handler.HandleFunc("/_ping", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("OK"))
	})
	handler.HandleFunc("/containers/json", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]map[string]any{
			{
				"Id":    "deadbeefcafebabe",
				"Names": []any{"/svc"},
				"Labels": map[string]any{
					"com.docker.compose.project": "proj",
					"com.docker.compose.service": "svc",
				},
			},
		})
	})
	handler.HandleFunc("/containers/deadbeefcafe/stats", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"cpu_stats": map[string]any{
				"cpu_usage":        map[string]any{"total_usage": 200.0, "percpu_usage": []any{1.0, 2.0}},
				"system_cpu_usage": 400.0,
				"online_cpus":      2.0,
			},
			"precpu_stats": map[string]any{
				"cpu_usage":        map[string]any{"total_usage": 100.0},
				"system_cpu_usage": 200.0,
			},
		})
	})
	socket, cleanup := newUnixHTTPTestServer(t, handler)
	defer cleanup()

	collector := NewDockerStatsCollector(socket, "proj")
	if !collector.Available() {
		t.Fatalf("collector should be available against test unix socket")
	}

	collector.AddService("svc")
	collector.AddService("svc") // no duplicate
	collector.AddService("other")
	collector.RemoveService("other")
	if got := collector.serviceList; !reflect.DeepEqual(got, []string{"svc"}) {
		t.Fatalf("unexpected service list: %+v", got)
	}

	mapping := collector.discoverContainers([]string{"svc"})
	if mapping["svc"] != "deadbeefcafe" {
		t.Fatalf("unexpected mapping: %+v", mapping)
	}

	collector.pollContainer("svc", "deadbeefcafe")
	history := collector.GetCPUHistory("svc")
	if len(history) != 1 || history[0] <= 0 {
		t.Fatalf("expected one positive CPU sample, got %+v", history)
	}

	collector.Start([]string{"svc"})
	time.Sleep(20 * time.Millisecond)
	collector.Stop()
}

type recorderConnector struct {
	mu     sync.Mutex
	data   [][]byte
	closed bool
}

func (r *recorderConnector) OnData(data []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.data = append(r.data, append([]byte{}, data...))
}

func (r *recorderConnector) OnBinary(payload []byte)    { r.OnData(payload) }
func (r *recorderConnector) OnMeta(meta map[string]any) {}
func (r *recorderConnector) OnClose() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.closed = true
}

func TestTerminalSessionMethodsAndReadLoop(t *testing.T) {
	s := NewTerminalSession("sid", "unterminated '")
	if err := s.Open(80, 24); err == nil {
		t.Fatalf("expected shlex parse error")
	}
	if err := s.Start(&recorderConnector{}); err == nil {
		t.Fatalf("expected Start error when session is not open")
	}

	conn := &recorderConnector{}
	s.UpdateConnector(conn)
	s.tracker = terminalstate.NewTracker(80, 24)
	s.handleOutput([]byte("abc"))
	if got := string(s.GetReplayBuffer()); got != "abc" {
		t.Fatalf("unexpected replay buffer: %q", got)
	}

	pipeR, pipeW, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	defer pipeR.Close()
	defer pipeW.Close()
	s.ptyFile = pipeW
	if ok := s.SendBytes([]byte("x")); !ok {
		t.Fatalf("SendBytes should succeed with writable ptyFile")
	}
	buf := make([]byte, 1)
	if _, err := pipeR.Read(buf); err != nil || string(buf) != "x" {
		t.Fatalf("pipe read failed: %v %q", err, string(buf))
	}

	s.ptyFile = nil
	if err := s.SetTerminalSize(80, 24); err == nil {
		t.Fatalf("expected SetTerminalSize error when closed")
	}
	if err := s.ForceRedraw(); err == nil {
		t.Fatalf("expected ForceRedraw error when closed")
	}
	if !s.SendMeta(map[string]any{"k": "v"}) {
		t.Fatalf("SendMeta should return true")
	}
	if s.IsRunning() {
		t.Fatalf("new session should not be running")
	}

	s.width, s.height = 10, 2
	s.tracker = nil
	snapshot := s.GetScreenSnapshot()
	if snapshot.Width != 10 || snapshot.Height != 2 {
		t.Fatalf("unexpected snapshot dimensions: %dx%d", snapshot.Width, snapshot.Height)
	}

	reader, writer, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	defer reader.Close()
	s2 := NewTerminalSession("sid2", "/bin/sh")
	rc := &recorderConnector{}
	s2.connector = rc
	s2.tracker = terminalstate.NewTracker(80, 24)
	s2.running = true
	go s2.readLoop(reader)
	_, _ = writer.Write([]byte("hello"))
	_ = writer.Close()
	if err := s2.Wait(); err != nil {
		t.Fatalf("unexpected wait error: %v", err)
	}
	rc.mu.Lock()
	defer rc.mu.Unlock()
	if !rc.closed || len(rc.data) == 0 {
		t.Fatalf("expected readLoop to forward data and close connector")
	}

	cmd := exec.Command("true")
	s3 := NewTerminalSession("sid3", "/bin/sh")
	s3.cmd = cmd
	_ = s3.Close()
}

func TestDockerExecSessionMethodsAndAPI(t *testing.T) {
	spec := DockerExecSpec{Container: "my/container", Command: []string{"sh", "-lc", "echo hi"}, User: "root"}
	s := NewDockerExecSession("sid", spec, "/tmp/none.sock")

	if err := s.Start(&recorderConnector{}); err == nil {
		t.Fatalf("expected Start error when not open")
	}
	if s.SendBytes([]byte("x")) {
		t.Fatalf("SendBytes should fail when conn is nil")
	}
	if !s.SendMeta(map[string]any{"k": "v"}) {
		t.Fatalf("SendMeta should return true")
	}
	if s.IsRunning() {
		t.Fatalf("new DockerExecSession should not be running")
	}

	s.tracker = terminalstate.NewTracker(80, 24)
	conn := &recorderConnector{}
	s.UpdateConnector(conn)
	s.handleOutput([]byte("abc"))
	if got := string(s.GetReplayBuffer()); got != "abc" {
		t.Fatalf("unexpected replay: %q", got)
	}

	c1, c2 := net.Pipe()
	defer c2.Close()
	s.conn = c1
	readCh := make(chan []byte, 1)
	go func() {
		buf := make([]byte, 1)
		if _, err := io.ReadFull(c2, buf); err != nil {
			readCh <- nil
			return
		}
		readCh <- buf
	}()
	if !s.SendBytes([]byte("z")) {
		t.Fatalf("SendBytes should succeed with active conn")
	}
	select {
	case read := <-readCh:
		if string(read) != "z" {
			t.Fatalf("pipe read mismatch: %q", string(read))
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("timed out waiting for net.Pipe read")
	}

	s.execID = ""
	if err := s.SetTerminalSize(100, 40); err != nil {
		t.Fatalf("SetTerminalSize with empty execID should not error: %v", err)
	}
	if err := s.ForceRedraw(); err != nil {
		t.Fatalf("ForceRedraw failed: %v", err)
	}

	s.width, s.height = 10, 2
	s.tracker = nil
	snap := s.GetScreenSnapshot()
	if snap.Width != 10 || snap.Height != 2 {
		t.Fatalf("unexpected snapshot dimensions: %dx%d", snap.Width, snap.Height)
	}

	r1, r2 := net.Pipe()
	defer r2.Close()
	s2 := NewDockerExecSession("sid2", spec, "/tmp/none.sock")
	rc := &recorderConnector{}
	s2.connector = rc
	s2.tracker = terminalstate.NewTracker(80, 24)
	s2.running = true
	go s2.readLoop(r1)
	_, _ = r2.Write([]byte("hello"))
	_ = r2.Close()
	if err := s2.Wait(); err != nil {
		t.Fatalf("unexpected wait error: %v", err)
	}
	rc.mu.Lock()
	defer rc.mu.Unlock()
	if !rc.closed || len(rc.data) == 0 {
		t.Fatalf("expected readLoop to forward data and close connector")
	}

	// API-level tests for createExec/startExecSocket/resizeExec
	mux := http.NewServeMux()
	mux.HandleFunc("/containers/", func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/exec") {
			http.NotFound(w, r)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"Id": "exec123"})
	})
	mux.HandleFunc("/exec/exec123/resize", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, "ok")
	})
	mux.HandleFunc("/exec/exec123/start", func(w http.ResponseWriter, r *http.Request) {
		hj, ok := w.(http.Hijacker)
		if !ok {
			t.Fatalf("response writer is not a hijacker")
		}
		conn, rw, err := hj.Hijack()
		if err != nil {
			t.Fatalf("hijack failed: %v", err)
		}
		_, _ = fmt.Fprintf(conn, "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: tcp\r\n\r\n")
		_, _ = rw.WriteString("ok")
		_ = rw.Flush()
		_ = conn.Close()
	})
	socket, cleanup := newUnixHTTPTestServer(t, mux)
	defer cleanup()

	s3 := NewDockerExecSession("sid3", spec, socket)
	execID, err := s3.createExec()
	if err != nil || execID != "exec123" {
		t.Fatalf("createExec failed: id=%q err=%v", execID, err)
	}
	c, err := s3.startExecSocket(execID)
	if err != nil {
		t.Fatalf("startExecSocket failed: %v", err)
	}
	defer c.Close()
	reader := bufio.NewReader(c)
	reply, _ := reader.ReadString('k')
	if reply == "" {
		t.Fatalf("expected upgraded stream payload")
	}
	s3.execID = execID
	if err := s3.resizeExec(80, 24); err != nil {
		t.Fatalf("resizeExec failed: %v", err)
	}
	_ = s3.Close()
}

func TestDockerExecSessionOpenAndStart(t *testing.T) {
	spec := DockerExecSpec{Container: "c1", Command: []string{"sh"}, User: ""}

	mux := http.NewServeMux()
	mux.HandleFunc("/containers/c1/exec", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"Id": "exec-open"})
	})
	mux.HandleFunc("/exec/exec-open/resize", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	mux.HandleFunc("/exec/exec-open/start", func(w http.ResponseWriter, r *http.Request) {
		hj, _ := w.(http.Hijacker)
		conn, rw, _ := hj.Hijack()
		_, _ = fmt.Fprintf(conn, "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: tcp\r\n\r\n")
		_, _ = rw.WriteString("hello")
		_ = rw.Flush()
		_ = conn.Close()
	})
	socket, cleanup := newUnixHTTPTestServer(t, mux)
	defer cleanup()

	s := NewDockerExecSession("sid-open", spec, socket)
	if err := s.Open(0, 0); err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	rc := &recorderConnector{}
	if err := s.Start(rc); err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	if err := s.Wait(); err != nil && !errors.Is(err, io.EOF) {
		t.Fatalf("Wait failed: %v", err)
	}
}

func TestTerminalSessionOpenStartAndResize(t *testing.T) {
	s := NewTerminalSession("sid-term", "/bin/sh -lc 'printf ok'")
	if err := s.Open(0, 0); err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	rc := &recorderConnector{}
	if err := s.Start(rc); err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	if err := s.SetTerminalSize(100, 30); err != nil {
		t.Fatalf("SetTerminalSize failed: %v", err)
	}
	if err := s.Wait(); err != nil {
		t.Fatalf("Wait failed: %v", err)
	}
	_ = s.Close()
}

func TestTerminalSessionOpenWhenRunningNoop(t *testing.T) {
	s := NewTerminalSession("sid-running", "/bin/true")
	s.running = true
	if err := s.Open(80, 24); err != nil {
		t.Fatalf("Open should be a no-op when already running: %v", err)
	}
}

func TestSessionManagerDefaultSessionFactory(t *testing.T) {
	manager := NewSessionManager(nil)
	t.Setenv(DockerAutoCommandEnv, "tmux new-session -ADs {container}")
	t.Setenv(DockerUsernameEnv, "alice")

	auto := manager.defaultSessionFactory(App{Name: "svc1", Command: AutoCommandSentinel}, "sid")
	execSession, ok := auto.(*DockerExecSession)
	if !ok {
		t.Fatalf("expected DockerExecSession, got %T", auto)
	}
	if len(execSession.spec.Command) == 0 || execSession.spec.Command[len(execSession.spec.Command)-1] != "svc1" {
		t.Fatalf("expected container placeholder expansion, got %+v", execSession.spec.Command)
	}
	if execSession.spec.User != "alice" {
		t.Fatalf("expected docker user from env, got %q", execSession.spec.User)
	}

	plain := manager.defaultSessionFactory(App{Name: "term", Command: "/bin/sh"}, "sid2")
	if _, ok := plain.(*TerminalSession); !ok {
		t.Fatalf("expected TerminalSession, got %T", plain)
	}
}

func TestDefaultConfigAndCPUSparklineEndpoint(t *testing.T) {
	if cfg := DefaultConfig(); len(cfg.Apps) != 0 {
		t.Fatalf("DefaultConfig expected empty apps")
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/_ping", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("OK"))
	})
	mux.HandleFunc("/containers/json", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]map[string]any{
			{
				"Id":    "cafebabedeadbeef",
				"Names": []any{"/svc"},
				"Labels": map[string]any{
					"com.docker.compose.project": "proj",
					"com.docker.compose.service": "svc",
				},
			},
		})
	})
	mux.HandleFunc("/containers/cafebabedead/stats", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"cpu_stats": map[string]any{
				"cpu_usage":        map[string]any{"total_usage": 300.0, "percpu_usage": []any{1.0, 2.0}},
				"system_cpu_usage": 600.0,
				"online_cpus":      2.0,
			},
			"precpu_stats": map[string]any{
				"cpu_usage":        map[string]any{"total_usage": 150.0},
				"system_cpu_usage": 300.0,
			},
		})
	})
	socket, cleanup := newUnixHTTPTestServer(t, mux)
	defer cleanup()
	t.Setenv(DockerHostEnv, "unix://"+socket)

	server := NewLocalServer(
		Config{},
		ServerOptions{
			ComposeMode:    true,
			ComposeProject: "proj",
			LandingApps:    []App{{Name: "svc", Slug: "svc", Command: "/bin/sh", Terminal: true}},
		},
	)
	server.setupDockerFeatures()
	defer server.shutdown()

	req := httptest.NewRequest(http.MethodGet, "/cpu-sparkline.svg?container=svc&width=x&height=y", nil)
	rr := httptest.NewRecorder()
	server.handleCPUSparkline(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "<svg") {
		t.Fatalf("expected SVG response")
	}
}

func TestDockerWatcherStartStop(t *testing.T) {
	manager := NewSessionManager(nil)

	mux := http.NewServeMux()
	mux.HandleFunc("/containers/json", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]map[string]any{})
	})
	mux.HandleFunc("/events", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"Action":"die","Actor":{"ID":"none"}}`+"\n")
	})
	socket, cleanup := newUnixHTTPTestServer(t, mux)
	defer cleanup()

	watcher := NewDockerWatcher(manager, socket, nil, nil)
	watcher.Start()
	time.Sleep(20 * time.Millisecond)
	watcher.Stop()
}

package webterm

import (
	"bufio"
	"compress/gzip"
	"context"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

const (
	wsSendQueueMax         = 256
	wsSendTimeout          = 2 * time.Second
	wsReadTimeout          = 90 * time.Second
	wsPingPeriod           = 30 * time.Second
	stdinWriteTimeout      = 2 * time.Second
	screenshotCacheSeconds = 300 * time.Millisecond
	maxScreenshotCacheTTL  = 20 * time.Second
)

type ServerOptions struct {
	Host           string
	Port           int
	Theme          string
	FontFamily     string
	FontSize       int
	LandingApps    []App
	ComposeMode    bool
	ComposeProject string
	DockerWatch    bool
	StaticPath     string
}

type screenshotCacheEntry struct {
	when time.Time
	svg  string
	etag string
}

type wsClient struct {
	routeKey string
	conn     *websocket.Conn
	send     chan wsOutbound
	done     chan struct{}
	closed   atomic.Bool
}

type wsOutbound struct {
	messageType int
	payload     []byte
}

type loggingResponseWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

type gzipResponseWriter struct {
	http.ResponseWriter
	writer *gzip.Writer
}

func (w *loggingResponseWriter) WriteHeader(statusCode int) {
	w.status = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *loggingResponseWriter) Write(payload []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	n, err := w.ResponseWriter.Write(payload)
	w.bytes += n
	return n, err
}

func (w *loggingResponseWriter) ReadFrom(r io.Reader) (int64, error) {
	if rf, ok := w.ResponseWriter.(io.ReaderFrom); ok {
		if w.status == 0 {
			w.status = http.StatusOK
		}
		n, err := rf.ReadFrom(r)
		w.bytes += int(n)
		return n, err
	}
	return io.Copy(w.ResponseWriter, r)
}

func (w *loggingResponseWriter) Flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (w *loggingResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hijacker, ok := w.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, fmt.Errorf("response writer does not support hijacking")
	}
	return hijacker.Hijack()
}

func (w *loggingResponseWriter) Push(target string, opts *http.PushOptions) error {
	if pusher, ok := w.ResponseWriter.(http.Pusher); ok {
		return pusher.Push(target, opts)
	}
	return http.ErrNotSupported
}

func (w *gzipResponseWriter) WriteHeader(statusCode int) {
	w.Header().Del("Content-Length")
	w.Header().Set("Content-Encoding", "gzip")
	w.Header().Add("Vary", "Accept-Encoding")
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w *gzipResponseWriter) Write(payload []byte) (int, error) {
	if w.Header().Get("Content-Encoding") == "" {
		w.WriteHeader(http.StatusOK)
	}
	return w.writer.Write(payload)
}

func (w *gzipResponseWriter) ReadFrom(r io.Reader) (int64, error) {
	if w.Header().Get("Content-Encoding") == "" {
		w.WriteHeader(http.StatusOK)
	}
	return io.Copy(w.writer, r)
}

func (w *gzipResponseWriter) Flush() {
	_ = w.writer.Flush()
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (w *gzipResponseWriter) Push(target string, opts *http.PushOptions) error {
	if pusher, ok := w.ResponseWriter.(http.Pusher); ok {
		return pusher.Push(target, opts)
	}
	return http.ErrNotSupported
}

type LocalServer struct {
	host       string
	port       int
	theme      string
	fontFamily string
	fontSize   int

	sessionManager *SessionManager
	landingApps    []App
	composeMode    bool
	composeProject string
	dockerWatch    bool
	staticPath     string

	upgrader websocket.Upgrader

	mu                    sync.RWMutex
	wsClients             map[string]*wsClient
	screenshotCache       map[string]screenshotCacheEntry
	routeLastActivity     map[string]time.Time
	routeLastSSE          map[string]time.Time
	sseSubscribers        map[chan string]struct{}
	slugToService         map[string]string
	dockerStats           *DockerStatsCollector
	dockerWatcher         *DockerWatcher
	screenshotForceRedraw bool
}

type localClientConnector struct {
	server    *LocalServer
	sessionID string
	routeKey  string
}

func (c *localClientConnector) OnData(data []byte) {
	c.server.enqueueWSFrame(c.routeKey, websocket.BinaryMessage, data)
}

func (c *localClientConnector) OnBinary(payload []byte) {
	c.server.enqueueWSFrame(c.routeKey, websocket.BinaryMessage, payload)
}

func (c *localClientConnector) OnMeta(meta map[string]any) {
	if changed, ok := meta["screen_changed"].(bool); ok && changed {
		c.server.markRouteActivity(c.routeKey)
	}
}

func (c *localClientConnector) OnClose() {
	c.server.sessionManager.OnSessionEnd(c.sessionID)
	c.server.stopWSClient(c.routeKey)
}

func NewLocalServer(config Config, options ServerOptions) *LocalServer {
	host := options.Host
	if host == "" {
		host = DefaultHost
	}
	port := options.Port
	if port == 0 {
		port = DefaultPort
	}
	theme := strings.TrimSpace(options.Theme)
	if theme == "" {
		theme = DefaultTheme
	}
	fontSize := options.FontSize
	if fontSize <= 0 {
		fontSize = DefaultFontSize
	}
	apps := append([]App{}, config.Apps...)
	for _, app := range options.LandingApps {
		apps = append(apps, app)
	}
	server := &LocalServer{
		host:       host,
		port:       port,
		theme:      theme,
		fontFamily: options.FontFamily,
		fontSize:   fontSize,

		sessionManager: NewSessionManager(apps),
		landingApps:    append([]App{}, options.LandingApps...),
		composeMode:    options.ComposeMode,
		composeProject: options.ComposeProject,
		dockerWatch:    options.DockerWatch,
		staticPath:     options.StaticPath,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
		wsClients:             map[string]*wsClient{},
		screenshotCache:       map[string]screenshotCacheEntry{},
		routeLastActivity:     map[string]time.Time{},
		routeLastSSE:          map[string]time.Time{},
		sseSubscribers:        map[chan string]struct{}{},
		slugToService:         map[string]string{},
		screenshotForceRedraw: EnvBool(ScreenshotForceRedrawEnv),
	}
	if server.staticPath == "" {
		server.staticPath = findStaticPath()
	}
	return server
}

func findStaticPath() string {
	if p := strings.TrimSpace(os.Getenv("WEBTERM_STATIC_PATH")); p != "" {
		if stat, err := os.Stat(p); err == nil && stat.IsDir() {
			return p
		}
	}
	candidates := []string{
		filepath.Join(".", "webterm", "static"),
		filepath.Join(".", "go", "webterm", "static"),
		filepath.Join("..", "webterm", "static"),
		filepath.Join("..", "go", "webterm", "static"),
		filepath.Join("..", "..", "webterm", "static"),
	}
	for _, candidate := range candidates {
		if stat, err := os.Stat(candidate); err == nil && stat.IsDir() {
			return candidate
		}
	}
	return ""
}

func (s *LocalServer) markRouteActivity(routeKey string) {
	now := time.Now()
	s.mu.Lock()
	s.routeLastActivity[routeKey] = now
	last := s.routeLastSSE[routeKey]
	if now.Sub(last) < 500*time.Millisecond {
		s.mu.Unlock()
		return
	}
	s.routeLastSSE[routeKey] = now
	subscribers := make([]chan string, 0, len(s.sseSubscribers))
	for subscriber := range s.sseSubscribers {
		subscribers = append(subscribers, subscriber)
	}
	s.mu.Unlock()
	for _, subscriber := range subscribers {
		select {
		case subscriber <- routeKey:
		default:
		}
	}
}

func (s *LocalServer) enqueueWSFrame(routeKey string, messageType int, data []byte) {
	s.mu.RLock()
	client := s.wsClients[routeKey]
	s.mu.RUnlock()
	if client == nil || client.closed.Load() {
		return
	}
	frame := wsOutbound{
		messageType: messageType,
		payload:     append([]byte{}, data...),
	}
	select {
	case client.send <- frame:
	default:
		// Drop oldest, try again
		select {
		case <-client.send:
		default:
		}
		select {
		case client.send <- frame:
		default:
		}
	}
}

func (s *LocalServer) stopWSClient(routeKey string) {
	s.mu.Lock()
	client := s.wsClients[routeKey]
	delete(s.wsClients, routeKey)
	s.mu.Unlock()
	if client == nil {
		return
	}
	client.closed.Store(true)
	close(client.send)
	<-client.done
}

func (s *LocalServer) wsSender(client *wsClient) {
	defer close(client.done)
	pingTicker := time.NewTicker(wsPingPeriod)
	defer pingTicker.Stop()
	for {
		select {
		case outbound, ok := <-client.send:
			if !ok {
				return
			}
			_ = client.conn.SetWriteDeadline(time.Now().Add(wsSendTimeout))
			if err := client.conn.WriteMessage(outbound.messageType, outbound.payload); err != nil {
				client.closed.Store(true)
				_ = client.conn.Close()
				return
			}
		case <-pingTicker.C:
			deadline := time.Now().Add(wsSendTimeout)
			if err := client.conn.WriteControl(websocket.PingMessage, nil, deadline); err != nil {
				client.closed.Store(true)
				_ = client.conn.Close()
				return
			}
		}
	}
}

func (s *LocalServer) createTerminalSession(routeKey string, width, height int) error {
	app, ok := s.sessionManager.AppBySlug(routeKey)
	if !ok {
		app, ok = s.sessionManager.GetDefaultApp()
		if !ok {
			return fmt.Errorf("no apps configured")
		}
	}
	sessionID := GenerateID(identitySize)
	session, err := s.sessionManager.NewSession(app.Slug, sessionID, routeKey, width, height)
	if err != nil {
		return err
	}
	connector := &localClientConnector{
		server:    s,
		sessionID: sessionID,
		routeKey:  routeKey,
	}
	session.UpdateConnector(connector)
	return session.Start(connector)
}

func clampInt(value, minValue, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func parseResizePayload(value any) (int, int) {
	width, height := 80, 24
	payload, ok := value.(map[string]any)
	if !ok {
		return width, height
	}
	if raw, ok := payload["width"]; ok {
		width = toInt(raw)
	}
	if raw, ok := payload["height"]; ok {
		height = toInt(raw)
	}
	return clampInt(width, 1, 500), clampInt(height, 1, 500)
}

func (s *LocalServer) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lw := &loggingResponseWriter{ResponseWriter: w}
		next.ServeHTTP(lw, r)
		status := lw.status
		if status == 0 {
			status = http.StatusOK
		}
		log.Printf("%s %s status=%d bytes=%d duration=%s remote=%s", r.Method, r.URL.RequestURI(), status, lw.bytes, time.Since(start), r.RemoteAddr)
	})
}

func (s *LocalServer) gzipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/events" {
			next.ServeHTTP(w, r)
			return
		}
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}
		if strings.EqualFold(strings.TrimSpace(r.Header.Get("Upgrade")), "websocket") {
			next.ServeHTTP(w, r)
			return
		}
		gz, err := gzip.NewWriterLevel(w, gzip.BestSpeed)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}
		defer func() { _ = gz.Close() }()
		next.ServeHTTP(&gzipResponseWriter{ResponseWriter: w, writer: gz}, r)
	})
}

func (s *LocalServer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	routeKey := strings.TrimPrefix(r.URL.Path, "/ws/")
	if routeKey == "" {
		http.Error(w, "missing route key", http.StatusBadRequest)
		return
	}
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("websocket upgrade failed route=%s remote=%s err=%v", routeKey, r.RemoteAddr, err)
		return
	}
	log.Printf("websocket connected route=%s remote=%s", routeKey, r.RemoteAddr)
	defer log.Printf("websocket disconnected route=%s remote=%s", routeKey, r.RemoteAddr)
	defer conn.Close()

	client := &wsClient{
		routeKey: routeKey,
		conn:     conn,
		send:     make(chan wsOutbound, wsSendQueueMax),
		done:     make(chan struct{}),
	}
	s.mu.Lock()
	s.wsClients[routeKey] = client
	s.mu.Unlock()
	go s.wsSender(client)
	defer s.stopWSClient(routeKey)

	// Helper to send JSON through the send channel (avoids concurrent conn writes)
	sendJSON := func(v any) {
		data, err := json.Marshal(v)
		if err != nil || client.closed.Load() {
			return
		}
		frame := wsOutbound{
			messageType: websocket.TextMessage,
			payload:     data,
		}
		select {
		case client.send <- frame:
		default:
		}
	}

	sessionCreated := false
	sessionID, ok := s.sessionManager.GetSessionIDByRouteKey(routeKey)
	if ok {
		session := s.sessionManager.GetSession(sessionID)
		if session != nil && session.IsRunning() {
			sessionCreated = true
			replay := daResponsePattern.ReplaceAll(session.GetReplayBuffer(), nil)
			if len(replay) > 0 {
				s.enqueueWSFrame(routeKey, websocket.BinaryMessage, replay)
			}
		} else {
			s.sessionManager.OnSessionEnd(sessionID)
		}
	}

	_ = conn.SetReadDeadline(time.Now().Add(wsReadTimeout))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(wsReadTimeout))
	})

	for {
		messageType, payload, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Printf("websocket read error route=%s remote=%s err=%v", routeKey, r.RemoteAddr, err)
			}
			return
		}
		if messageType != websocket.TextMessage {
			continue
		}
		var envelope []any
		if err := json.Unmarshal(payload, &envelope); err != nil || len(envelope) == 0 {
			continue
		}
		msgType, _ := envelope[0].(string)
		switch msgType {
		case "stdin":
			s.markRouteActivity(routeKey)
			session := s.sessionManager.GetSessionByRouteKey(routeKey)
			if session != nil {
				data := ""
				if len(envelope) > 1 {
					data, _ = envelope[1].(string)
				}
				done := make(chan struct{})
				go func() {
					defer close(done)
					_ = session.SendBytes([]byte(data))
				}()
				select {
				case <-done:
				case <-time.After(stdinWriteTimeout):
				}
			}
		case "resize":
			s.markRouteActivity(routeKey)
			width, height := 80, 24
			if len(envelope) > 1 {
				width, height = parseResizePayload(envelope[1])
			}
			session := s.sessionManager.GetSessionByRouteKey(routeKey)
			if session == nil {
				if err := s.createTerminalSession(routeKey, width, height); err == nil {
					sessionCreated = true
				} else {
					sendJSON([]any{"error", "Failed to create session"})
				}
			} else {
				_ = session.SetTerminalSize(width, height)
				s.mu.Lock()
				delete(s.screenshotCache, routeKey)
				s.mu.Unlock()
			}
		case "ping":
			value := ""
			if len(envelope) > 1 {
				value, _ = envelope[1].(string)
			}
			sendJSON([]any{"pong", value})
		}
		if !sessionCreated && msgType == "resize" {
			sessionCreated = true
		}
	}
}

func (s *LocalServer) chooseRouteForScreenshot(requested string) (string, Session, bool) {
	if requested != "" {
		session := s.sessionManager.GetSessionByRouteKey(requested)
		if session != nil {
			return requested, session, true
		}
		return requested, nil, false
	}
	if routeKey, session, ok := s.sessionManager.GetFirstRunningSession(); ok {
		return routeKey, session, true
	}
	return "", nil, false
}

func (s *LocalServer) screenshotTTL(routeKey string) time.Duration {
	s.mu.RLock()
	lastActivity := s.routeLastActivity[routeKey]
	s.mu.RUnlock()
	idle := time.Since(lastActivity)
	switch {
	case idle < 3*time.Second:
		return screenshotCacheSeconds
	case idle < 15*time.Second:
		return 2 * time.Second
	case idle < 120*time.Second:
		return 5 * time.Second
	default:
		return maxScreenshotCacheTTL
	}
}

func etagMatches(ifNoneMatch, etag string) bool {
	etag = strings.Trim(strings.TrimSpace(etag), `"`)
	if etag == "" {
		return false
	}
	for _, candidate := range strings.Split(ifNoneMatch, ",") {
		value := strings.TrimSpace(candidate)
		if value == "*" {
			return true
		}
		value = strings.TrimPrefix(value, "W/")
		value = strings.Trim(value, `"`)
		if value == etag {
			return true
		}
	}
	return false
}

func (s *LocalServer) handleScreenshot(w http.ResponseWriter, r *http.Request) {
	routeKey := r.URL.Query().Get("route_key")
	routeKey, session, ok := s.chooseRouteForScreenshot(routeKey)
	if !ok && routeKey != "" {
		if _, exists := s.sessionManager.AppBySlug(routeKey); exists {
			_ = s.createTerminalSession(routeKey, DefaultTerminalWidth, DefaultTerminalHeight)
			deadline := time.Now().Add(500 * time.Millisecond)
			for {
				session = s.sessionManager.GetSessionByRouteKey(routeKey)
				if session != nil {
					ok = true
					break
				}
				if time.Now().After(deadline) {
					break
				}
				time.Sleep(20 * time.Millisecond)
			}
		}
	}
	if !ok || session == nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	s.mu.RLock()
	cached, hasCached := s.screenshotCache[routeKey]
	lastActivity := s.routeLastActivity[routeKey]
	s.mu.RUnlock()
	if hasCached && time.Since(cached.when) < s.screenshotTTL(routeKey) {
		if etagMatches(r.Header.Get("If-None-Match"), cached.etag) {
			if !lastActivity.After(cached.when) {
				w.Header().Set("Cache-Control", "no-cache")
				w.Header().Set("ETag", cached.etag)
				w.WriteHeader(http.StatusNotModified)
				return
			}
		} else {
			w.Header().Set("Cache-Control", "no-cache")
			w.Header().Set("ETag", cached.etag)
			w.Header().Set("Content-Type", "image/svg+xml")
			_, _ = io.WriteString(w, cached.svg)
			return
		}
	}

	if s.screenshotForceRedraw {
		_ = session.ForceRedraw()
	}

	snapshot := session.GetScreenSnapshot()
	if hasCached && !snapshot.HasChanges {
		if etagMatches(r.Header.Get("If-None-Match"), cached.etag) {
			w.Header().Set("Cache-Control", "no-cache")
			w.Header().Set("ETag", cached.etag)
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("ETag", cached.etag)
		w.Header().Set("Content-Type", "image/svg+xml")
		_, _ = io.WriteString(w, cached.svg)
		return
	}

	app, _ := s.sessionManager.AppBySlug(routeKey)
	theme := strings.ToLower(strings.TrimSpace(app.Theme))
	if theme == "" {
		theme = strings.ToLower(s.theme)
	}
	palette := ThemePalettes[theme]
	if palette == nil {
		palette = ThemePalettes["xterm"]
	}
	background := palette["background"]
	if background == "" {
		background = ThemeBackgrounds["xterm"]
	}
	foreground := palette["foreground"]
	if foreground == "" {
		foreground = "#e5e5e5"
	}

	svg := RenderTerminalSVG(snapshot.Buffer, snapshot.Width, snapshot.Height, "webterm", background, foreground, palette)
	hash := sha1.Sum([]byte(svg))
	etag := fmt.Sprintf(`"%x"`, hash[:])
	s.mu.Lock()
	s.screenshotCache[routeKey] = screenshotCacheEntry{when: time.Now(), svg: svg, etag: etag}
	s.mu.Unlock()
	if etagMatches(r.Header.Get("If-None-Match"), etag) {
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("ETag", etag)
		w.WriteHeader(http.StatusNotModified)
		return
	}

	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("ETag", etag)
	w.Header().Set("Content-Type", "image/svg+xml")
	_, _ = io.WriteString(w, svg)
}

func (s *LocalServer) handleCPUSparkline(w http.ResponseWriter, r *http.Request) {
	container := r.URL.Query().Get("container")
	if strings.TrimSpace(container) == "" {
		http.Error(w, "Missing container parameter", http.StatusBadRequest)
		return
	}
	width := clampInt(toIntFromQuery(r.URL.Query().Get("width"), 100), 50, 300)
	height := clampInt(toIntFromQuery(r.URL.Query().Get("height"), 20), 10, 100)

	values := []float64{}
	s.mu.RLock()
	stats := s.dockerStats
	serviceName := s.slugToService[container]
	s.mu.RUnlock()
	if serviceName == "" {
		serviceName = container
	}
	if stats != nil {
		values = stats.GetCPUHistory(serviceName)
	}
	w.Header().Set("Cache-Control", "no-cache, max-age=0")
	w.Header().Set("Content-Type", "image/svg+xml")
	_, _ = io.WriteString(w, RenderSparklineSVG(values, width, height))
}

func (s *LocalServer) handleEvents(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	channel := make(chan string, 100)
	s.mu.Lock()
	s.sseSubscribers[channel] = struct{}{}
	s.mu.Unlock()
	defer func() {
		s.mu.Lock()
		delete(s.sseSubscribers, channel)
		s.mu.Unlock()
	}()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case routeKey := <-channel:
			if _, err := fmt.Fprintf(w, "event: activity\ndata: %s\n\n", routeKey); err != nil {
				return
			}
			flusher.Flush()
		case <-ticker.C:
			if _, err := io.WriteString(w, ": keepalive\n\n"); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

func toIntFromQuery(value string, fallback int) int {
	if n, err := strconv.Atoi(strings.TrimSpace(value)); err == nil {
		return n
	}
	return fallback
}

func (s *LocalServer) dashboardTiles() []map[string]string {
	var apps []App
	if s.dockerWatch {
		apps = s.sessionManager.Apps()
	} else {
		apps = append([]App{}, s.landingApps...)
	}
	tiles := make([]map[string]string, 0, len(apps))
	for _, app := range apps {
		command := app.Command
		if command == AutoCommandSentinel {
			command = ""
		}
		tiles = append(tiles, map[string]string{
			"slug":    app.Slug,
			"name":    app.Name,
			"command": command,
		})
	}
	return tiles
}

func (s *LocalServer) handleTiles(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(s.dashboardTiles())
}

func (s *LocalServer) getWSURL(r *http.Request, routeKey string) string {
	header := func(name string) string {
		value := strings.TrimSpace(strings.Split(r.Header.Get(name), ",")[0])
		return strings.ToLower(value)
	}
	forwardedProto := header("X-Forwarded-Proto")
	forwardedHost := header("X-Forwarded-Host")
	forwardedPort := header("X-Forwarded-Port")

	wsProto := "ws"
	if forwardedProto == "https" || forwardedProto == "wss" {
		wsProto = "wss"
	} else if forwardedProto == "" && r.TLS != nil {
		wsProto = "wss"
	}
	host := forwardedHost
	if host == "" {
		host = r.Host
	}
	if host == "" {
		if s.host == "0.0.0.0" {
			host = "localhost"
		} else {
			host = s.host
		}
		if s.port != 80 && s.port != 443 {
			host = fmt.Sprintf("%s:%d", host, s.port)
		}
	}
	if forwardedPort != "" && !strings.Contains(host, ":") && forwardedPort != "80" && forwardedPort != "443" {
		host += ":" + forwardedPort
	}
	return fmt.Sprintf("%s://%s/ws/%s", wsProto, host, routeKey)
}

func (s *LocalServer) handleRoot(w http.ResponseWriter, r *http.Request) {
	routeKeyParam := r.URL.Query().Get("route_key")
	showDashboard := (len(s.landingApps) > 0 || s.dockerWatch) && routeKeyParam == ""
	if showDashboard {
		tilesJSON, _ := json.Marshal(s.dashboardTiles())
		composeModeJS := "false"
		if s.composeMode || s.dockerWatch {
			composeModeJS = "true"
		}
		dockerWatchJS := "false"
		if s.dockerWatch {
			dockerWatchJS = "true"
		}
		html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Session Dashboard</title>
	<link rel="manifest" href="/static/manifest.json">
	<meta name="theme-color" content="#0d1117">
	<link rel="icon" href="/static/icons/webterm-192.png" sizes="192x192">
	<style>
		@font-face { font-family: "FiraCode Nerd Font"; src: url("/static/fonts/FiraCodeNerdFont-Regular.ttf") format("truetype"); font-style: normal; font-weight: 400; font-display: swap; }
		@font-face { font-family: "FiraMono Nerd Font"; src: url("/static/fonts/FiraCodeNerdFont-Regular.ttf") format("truetype"); font-style: normal; font-weight: 400; font-display: swap; }
		:root { --webterm-mono: ui-monospace, "SFMono-Regular", "FiraCode Nerd Font", "FiraMono Nerd Font", "Fira Code", "Roboto Mono", Menlo, Monaco, Consolas, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 16px; background: #0f172a; color: #e2e8f0; }
		h1 { margin-bottom: 8px; }
		.subtitle { color: #64748b; font-size: 14px; margin-bottom: 16px; }
		.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
		.tile { background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.4); cursor: pointer; transition: border-color 0.15s; }
		.tile:hover { border-color: #475569; }
		.tile.selected { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.3); }
		.tile-header { padding: 10px 12px; font-weight: bold; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
		.tile-title { display: flex; align-items: center; gap: 8px; }
		.sparkline { opacity: 0.9; }
		.tile-body { padding: 0; }
		.thumb { width: 100%%; height: 180px; object-fit: contain; background: #0b1220; display: block; }
		.meta { padding: 8px 12px; color: #94a3b8; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
		.empty { color: #64748b; text-align: center; padding: 40px; }
		.floating-results { position: fixed; top: 50%%; left: 50%%; transform: translate(-50%%, -50%%); width: 400px; max-width: 90vw; max-height: 70vh; overflow-y: auto; background: #1e293b; border: 1px solid #475569; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); padding: 16px; z-index: 1000; }
		.floating-results.hidden { display: none; }
		.floating-results .search-header { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 8px; }
		.floating-results .search-query { font-size: 18px; font-weight: bold; color: #3b82f6; }
		.floating-results .result-item { display: flex; align-items: center; gap: 12px; padding: 12px; margin: 6px 0; border: 1px solid #334155; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
		.floating-results .result-item:hover, .floating-results .result-item.active { background: #334155; border-color: #3b82f6; }
		.floating-results .result-thumb { width: 96px; height: 72px; flex: 0 0 auto; border-radius: 4px; border: 1px solid #334155; background: #0b1220; object-fit: contain; }
		.floating-results .result-content { display: flex; flex-direction: column; gap: 2px; }
		.floating-results .result-title { font-weight: bold; margin-bottom: 4px; }
		.floating-results .result-meta { font-size: 12px; color: #94a3b8; }
		.floating-results .no-results { color: #64748b; text-align: center; padding: 20px; }
		.key-indicator { position: fixed; bottom: 16px; left: 16px; display: flex; gap: 4px; z-index: 1000; }
		.key-box { display: inline-flex; align-items: center; justify-content: center; background: #334155; color: #e2e8f0; font-size: 12px; font-weight: bold; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); opacity: 1; transition: opacity 0.3s; }
		.key-box.square { width: 28px; height: 28px; }
		.key-box.rectangle { padding: 4px 8px; }
		.key-box.fade-out { opacity: 0; }
		.help-hint { position: fixed; bottom: 16px; right: 16px; color: #64748b; font-size: 12px; }
	</style>
</head>
<body>
	<h1>Sessions</h1>
	<div class="subtitle" id="subtitle"></div>
	<div class="grid" id="grid"></div>
	<div class="floating-results hidden" id="floating-results"></div>
	<div class="key-indicator" id="key-indicator"></div>
	<div class="help-hint">Type to search • ↑↓ to navigate • Enter to open • Esc to clear</div>
	<script>
		let tiles = %s;
		const composeMode = %s;
		const dockerWatchMode = %s;
		let cardsBySlug = {};

		let searchQuery = '';
		let activeResultIndex = -1;
		let filteredResults = [];
		const floatingResultsEl = document.getElementById('floating-results');
		const keyIndicatorEl = document.getElementById('key-indicator');
		const thumbnailCache = {};
		const activeObjectURLBySlug = {};
		const etagBySlug = {};
		const refreshQueue = [];
		const queuedRefresh = {};
		let screenshotRequestInFlight = false;
		const grid = document.getElementById('grid');
		const subtitle = document.getElementById('subtitle');

		function makeTile(tile) {
			const card = document.createElement('div');
			card.className = 'tile';
			const header = document.createElement('div');
			header.className = 'tile-header';
			const titleSpan = document.createElement('div');
			titleSpan.className = 'tile-title';
			titleSpan.innerHTML = '<span>' + tile.name + '</span>';
			header.appendChild(titleSpan);
			if (composeMode) {
				const sparkline = document.createElement('img');
				sparkline.className = 'sparkline';
				sparkline.width = 80;
				sparkline.height = 16;
				sparkline.alt = 'CPU';
				header.appendChild(sparkline);
				card.sparkline = sparkline;
			}
			const body = document.createElement('div');
			body.className = 'tile-body';
			const img = document.createElement('img');
			img.className = 'thumb';
			img.alt = tile.name;
			const meta = document.createElement('div');
			meta.className = 'meta';
			meta.textContent = tile.command || '';
			meta.title = tile.command || '';
			body.appendChild(img);
			card.appendChild(header);
			card.appendChild(body);
			card.appendChild(meta);
			card.onclick = () => openTile(tile);
			card.img = img;
			return card;
		}

		function normalizeText(value) {
			return (value || '').toString().toLowerCase();
		}

		function getTileTitle(tile) {
			return tile.name || tile.slug || 'Unknown';
		}

		function getTileCommand(tile) {
			return tile.command || '';
		}

		function getThumbnailSrc(tile) {
			const slug = tile.slug || '';
			if (!slug) return '';
			const card = cardsBySlug[slug];
			if (card && card.img && card.img.src) {
				thumbnailCache[slug] = { src: card.img.src, updatedAt: Date.now() };
				return card.img.src;
			}
			const existing = thumbnailCache[slug];
			return existing ? existing.src : '';
		}

		function updateTileSelection() {
			Object.values(cardsBySlug).forEach((c) => c.classList.remove('selected'));
			if (filteredResults.length > 0 && activeResultIndex >= 0) {
				const selected = filteredResults[activeResultIndex];
				if (selected && selected.slug) {
					const card = cardsBySlug[selected.slug];
					if (card) card.classList.add('selected');
				}
			}
		}

		function renderFloatingResults() {
			floatingResultsEl.innerHTML = '';
			if (searchQuery === '') {
				floatingResultsEl.classList.add('hidden');
				activeResultIndex = -1;
				filteredResults = [];
				updateTileSelection();
				return;
			}

			const query = normalizeText(searchQuery);
			filteredResults = tiles.filter((t) => {
				if (!t) return false;
				const name = normalizeText(t.name);
				const command = normalizeText(t.command);
				const slug = normalizeText(t.slug);
				return name.includes(query) || command.includes(query) || slug.includes(query);
			});

			const header = document.createElement('div');
			header.className = 'search-header';
			header.innerHTML = '<span>Search:</span><span class="search-query">' + searchQuery + '</span>';
			floatingResultsEl.appendChild(header);

			if (filteredResults.length === 0) {
				const noResults = document.createElement('div');
				noResults.className = 'no-results';
				noResults.textContent = 'No matches found';
				floatingResultsEl.appendChild(noResults);
			} else {
				if (activeResultIndex < 0 || activeResultIndex >= filteredResults.length) {
					activeResultIndex = 0;
				}
				filteredResults.forEach((tile, index) => {
					const item = document.createElement('div');
					item.className = 'result-item' + (index === activeResultIndex ? ' active' : '');
					const thumb = document.createElement('img');
					thumb.className = 'result-thumb';
					const title = getTileTitle(tile);
					const command = getTileCommand(tile);
					const thumbSrc = getThumbnailSrc(tile);
					thumb.alt = title;
					if (thumbSrc) {
						thumb.src = thumbSrc;
					} else {
						thumb.style.display = 'none';
					}
					const content = document.createElement('div');
					content.className = 'result-content';
					content.innerHTML = '<div class="result-title">' + title + '</div><div class="result-meta">' + command + '</div>';
					item.appendChild(thumb);
					item.appendChild(content);
					item.onclick = () => openTile(tile);
					floatingResultsEl.appendChild(item);
				});
			}

			floatingResultsEl.classList.remove('hidden');
			updateTileSelection();
		}

		function showKeyIndicator(key) {
			const arrowKeyMap = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
			const keyDisplay = arrowKeyMap[key] || key;
			const keyBox = document.createElement('div');
			keyBox.className = 'key-box ' + (key.length > 1 ? 'rectangle' : 'square');
			keyBox.textContent = keyDisplay;
			keyIndicatorEl.appendChild(keyBox);
			setTimeout(() => {
				keyBox.classList.add('fade-out');
				setTimeout(() => keyBox.remove(), 300);
			}, 1500);
		}

		function openTile(tile) {
			if (!tile || !tile.slug) return;
			const url = '/?route_key=' + encodeURIComponent(tile.slug);
			const target = 'webterm-' + tile.slug;
			let win = window.open(url, target);
			if (!win) {
				window.location.href = url;
				return;
			}
			if (win.closed) {
				win = window.open(url, target);
			}
			if (win && typeof win.focus === 'function') {
				win.focus();
			}
			searchQuery = '';
			activeResultIndex = -1;
			renderFloatingResults();
		}

		function handleKeydown(event) {
			if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
			showKeyIndicator(event.key);

			if (event.key === 'Escape') {
				searchQuery = '';
				activeResultIndex = -1;
				renderFloatingResults();
				return;
			}
			if (event.key === 'Backspace') {
				searchQuery = searchQuery.slice(0, -1);
				renderFloatingResults();
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				if (filteredResults.length > 0) {
					activeResultIndex = (activeResultIndex - 1 + filteredResults.length) %% filteredResults.length;
					renderFloatingResults();
				}
				return;
			}
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				if (filteredResults.length > 0) {
					activeResultIndex = (activeResultIndex + 1) %% filteredResults.length;
					renderFloatingResults();
				}
				return;
			}
			if (event.key === 'Enter') {
				if (filteredResults.length > 0 && activeResultIndex >= 0) {
					openTile(filteredResults[activeResultIndex]);
				} else if (filteredResults.length === 1) {
					openTile(filteredResults[0]);
				}
				return;
			}
			if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
				searchQuery += event.key.toLowerCase();
				renderFloatingResults();
			}
		}

		document.addEventListener('keydown', handleKeydown);

		function dashboardCanRequestScreenshots() {
			return document.visibilityState === 'visible';
		}

		function onDashboardFocusChanged() {
			if (dashboardCanRequestScreenshots()) {
				processRefreshQueue();
			}
		}

		document.addEventListener('visibilitychange', onDashboardFocusChanged);
		window.addEventListener('focus', onDashboardFocusChanged);
		window.addEventListener('blur', onDashboardFocusChanged);

		function processRefreshQueue() {
			if (screenshotRequestInFlight || refreshQueue.length === 0 || !dashboardCanRequestScreenshots()) return;
			const slug = refreshQueue.shift();
			delete queuedRefresh[slug];
			const card = cardsBySlug[slug];
			if (!card || !card.img) {
				setTimeout(processRefreshQueue, 0);
				return;
			}
			screenshotRequestInFlight = true;
			const img = card.img;
			const url = '/screenshot.svg?route_key=' + encodeURIComponent(slug);
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 5000);
			const headers = {};
			if (etagBySlug[slug]) {
				headers['If-None-Match'] = etagBySlug[slug];
			}
			fetch(url, { cache: 'no-cache', headers, signal: controller.signal })
				.then((resp) => {
					const nextETag = resp.headers.get('ETag');
					if (nextETag) {
						etagBySlug[slug] = nextETag;
					}
					if (resp.status === 304) return null;
					if (!resp.ok) throw new Error('screenshot fetch failed');
					return resp.blob();
				})
				.then((blob) => {
					if (!blob) return;
					const previous = activeObjectURLBySlug[slug];
					const objectURL = URL.createObjectURL(blob);
					activeObjectURLBySlug[slug] = objectURL;
					img.src = objectURL;
					thumbnailCache[slug] = { src: objectURL, updatedAt: Date.now() };
					if (previous) {
						URL.revokeObjectURL(previous);
					}
				})
				.catch(() => {})
				.finally(() => {
					clearTimeout(timeout);
					screenshotRequestInFlight = false;
					setTimeout(processRefreshQueue, 0);
				});
		}

		function queueTileRefresh(slug) {
			if (!slug || queuedRefresh[slug]) return;
			queuedRefresh[slug] = true;
			refreshQueue.push(slug);
			processRefreshQueue();
		}

		function refreshTile(slug) {
			queueTileRefresh(slug);
		}

		function refreshAll() {
			for (const tile of tiles) {
				queueTileRefresh(tile.slug);
			}
		}

		async function refreshTilesList() {
			try {
				const resp = await fetch('/tiles');
				const newTiles = await resp.json();
				const oldSlugs = tiles.map((t) => t.slug).sort().join(',');
				const newSlugs = newTiles.map((t) => t.slug).sort().join(',');
				if (oldSlugs !== newSlugs) {
					tiles = newTiles;
					renderTiles();
				}
			} catch (_) {}
		}

		function refreshSparklines() {
			if (!composeMode) return;
			for (const tile of tiles) {
				const card = cardsBySlug[tile.slug];
				if (card && card.sparkline) {
					card.sparkline.src = '/cpu-sparkline.svg?container=' + encodeURIComponent(tile.slug) + '&width=80&height=16&_t=' + Date.now();
				}
			}
		}

		const pendingRefresh = {};
		const lastRefresh = {};
		const REFRESH_DEBOUNCE_MS = 500;

		function scheduleRefreshTile(slug) {
			const now = Date.now();
			const last = lastRefresh[slug] || 0;
			if (now - last < REFRESH_DEBOUNCE_MS) {
				if (!pendingRefresh[slug]) {
					pendingRefresh[slug] = setTimeout(() => {
						pendingRefresh[slug] = null;
						refreshTile(slug);
						lastRefresh[slug] = Date.now();
					}, REFRESH_DEBOUNCE_MS - (now - last));
				}
				return;
			}
			refreshTile(slug);
			lastRefresh[slug] = now;
		}

		function renderTiles() {
			grid.innerHTML = '';
			cardsBySlug = {};
			refreshQueue.length = 0;
			screenshotRequestInFlight = false;
			for (const key in queuedRefresh) {
				delete queuedRefresh[key];
			}
			for (const key in activeObjectURLBySlug) {
				URL.revokeObjectURL(activeObjectURLBySlug[key]);
				delete activeObjectURLBySlug[key];
			}
			if (tiles.length === 0) {
				grid.innerHTML = '<div class="empty">No containers found. Start containers with the webterm-command label.</div>';
				subtitle.textContent = dockerWatchMode ? 'Watching for containers with webterm-command label...' : '';
				return;
			}
			subtitle.textContent = '';
			if (dockerWatchMode) {
				console.log(tiles.length + ' container(s) found');
			}
			for (const tile of tiles) {
				const card = makeTile(tile);
				grid.appendChild(card);
				cardsBySlug[tile.slug] = card;
			}
			refreshAll();
			renderFloatingResults();
			refreshSparklines();
		}

		let source = null;
		function startSSE() {
			if (source) return;
			source = new EventSource('/events');
			source.addEventListener('activity', (e) => {
				if (e.data === '__dashboard__') {
					refreshTilesList();
				} else {
					scheduleRefreshTile(e.data);
				}
			});
			source.onerror = () => {
				source.close();
				source = null;
				setTimeout(startSSE, 2000);
			};
		}

		renderTiles();
		if (!document.hidden) startSSE();
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				if (source) {
					source.close();
					source = null;
				}
			} else {
				startSSE();
			}
		});
		if (composeMode) {
			refreshSparklines();
			setInterval(refreshSparklines, 30000);
		}
	</script>
</body>
</html>`, string(tilesJSON), composeModeJS, dockerWatchJS)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.WriteString(w, html)
		return
	}

	var app App
	var ok bool
	if routeKeyParam != "" {
		app, ok = s.sessionManager.AppBySlug(routeKeyParam)
	}
	if !ok {
		app, ok = s.sessionManager.GetDefaultApp()
	}
	if !ok {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.WriteString(w, "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Webterm Server</title></head><body><h2>No Apps Available</h2><p>No terminal applications are configured.</p></body></html>")
		return
	}

	routeKey := routeKeyParam
	if routeKey == "" {
		if runningKey, _, exists := s.sessionManager.GetFirstRunningSession(); exists {
			routeKey = runningKey
		} else {
			routeKey = strings.ToLower(GenerateID(identitySize))
		}
	}
	wsURL := s.getWSURL(r, routeKey)
	theme := app.Theme
	if strings.TrimSpace(theme) == "" {
		theme = s.theme
	}
	themeBG := ThemeBackgrounds[strings.ToLower(theme)]
	if themeBG == "" {
		themeBG = "#000000"
	}
	fontFamily := s.fontFamily
	if strings.TrimSpace(fontFamily) == "" {
		fontFamily = "var(--webterm-mono)"
	}
	escapedFont := strings.ReplaceAll(fontFamily, `"`, "&quot;")
	dataAttrs := fmt.Sprintf(`data-session-websocket-url="%s" data-font-size="%d" data-scrollback="1000" data-theme="%s" data-font-family="%s"`, htmlAttrEscape(wsURL), s.fontSize, htmlAttrEscape(theme), escapedFont)
	page := fmt.Sprintf(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>%s</title><link rel="stylesheet" href="/static/monospace.css"><style>html,body{width:100%%;height:100%%}body{background:%s;margin:0;padding:0;overflow:hidden;font-family:var(--webterm-mono)}.webterm-terminal{width:100%%;height:100%%;display:block;overflow:hidden}</style></head><body><div id="terminal" class="webterm-terminal" %s></div><script type="module" src="/static/js/terminal.js"></script></body></html>`, htmlEscape(app.Name), themeBG, dataAttrs)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = io.WriteString(w, page)
}

func htmlEscape(value string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;").Replace(value)
}

func htmlAttrEscape(value string) string {
	return strings.NewReplacer("&", "&amp;", `"`, "&quot;", "<", "&lt;", ">", "&gt;").Replace(value)
}

func (s *LocalServer) handleHealth(w http.ResponseWriter, _ *http.Request) {
	_, _ = io.WriteString(w, "Local server is running")
}

func (s *LocalServer) setupDockerFeatures() {
	if (s.composeMode && len(s.landingApps) > 0) || s.dockerWatch {
		stats := NewDockerStatsCollector("", s.composeProject)
		if stats.Available() {
			serviceNames := []string{}
			apps := s.landingApps
			if s.dockerWatch {
				apps = s.sessionManager.Apps()
			}
			for _, app := range apps {
				serviceNames = append(serviceNames, app.Name)
				s.slugToService[app.Slug] = app.Name
			}
			stats.Start(serviceNames)
			s.dockerStats = stats
		}
	}
	if s.dockerWatch {
		watcher := NewDockerWatcher(
			s.sessionManager,
			"",
			func(slug, name, _ string) {
				s.mu.Lock()
				s.slugToService[slug] = name
				if s.dockerStats != nil {
					s.dockerStats.AddService(name)
				}
				s.mu.Unlock()
				s.markRouteActivity("__dashboard__")
			},
			func(slug string) {
				s.mu.Lock()
				serviceName := s.slugToService[slug]
				delete(s.slugToService, slug)
				delete(s.screenshotCache, slug)
				if s.dockerStats != nil && serviceName != "" {
					s.dockerStats.RemoveService(serviceName)
				}
				s.mu.Unlock()
				s.markRouteActivity("__dashboard__")
			},
		)
		s.dockerWatcher = watcher
		watcher.Start()
	}
}

func (s *LocalServer) shutdown() {
	if s.dockerWatcher != nil {
		s.dockerWatcher.Stop()
	}
	if s.dockerStats != nil {
		s.dockerStats.Stop()
	}
	s.sessionManager.CloseAll()
	s.mu.Lock()
	clients := map[string]*wsClient{}
	for key, client := range s.wsClients {
		clients[key] = client
	}
	s.wsClients = map[string]*wsClient{}
	s.mu.Unlock()
	for _, client := range clients {
		client.closed.Store(true)
		close(client.send)
		<-client.done
		_ = client.conn.Close()
	}
}

func (s *LocalServer) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws/", s.handleWebSocket)
	mux.HandleFunc("/screenshot.svg", s.handleScreenshot)
	mux.HandleFunc("/cpu-sparkline.svg", s.handleCPUSparkline)
	mux.HandleFunc("/events", s.handleEvents)
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/tiles", s.handleTiles)
	mux.HandleFunc("/", s.handleRoot)
	if strings.TrimSpace(s.staticPath) != "" {
		mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(s.staticPath))))
	} else if staticFS, ok := embeddedStaticFS(); ok {
		mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(staticFS)))
	}
	return s.loggingMiddleware(s.gzipMiddleware(mux))
}

func (s *LocalServer) Run(ctx context.Context) error {
	s.setupDockerFeatures()
	server := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", s.host, s.port),
		Handler: s.Handler(),
	}
	errCh := make(chan error, 1)
	go func() {
		err := server.ListenAndServe()
		if err != nil && err != http.ErrServerClosed {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_ = server.Shutdown(shutdownCtx)
		cancel()
		s.shutdown()
		<-errCh
		return nil
	case err := <-errCh:
		s.shutdown()
		return err
	}
}

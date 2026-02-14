package webterm

import (
	"context"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"io"
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
	c.server.markRouteActivity(c.routeKey)
	c.server.enqueueWSFrame(c.routeKey, websocket.BinaryMessage, data)
}

func (c *localClientConnector) OnBinary(payload []byte) {
	c.server.markRouteActivity(c.routeKey)
	c.server.enqueueWSFrame(c.routeKey, websocket.BinaryMessage, payload)
}

func (c *localClientConnector) OnMeta(_ map[string]any) {}

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
	if now.Sub(last) < 250*time.Millisecond {
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
	for outbound := range client.send {
		_ = client.conn.SetWriteDeadline(time.Now().Add(wsSendTimeout))
		if err := client.conn.WriteMessage(outbound.messageType, outbound.payload); err != nil {
			return
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

func (s *LocalServer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	routeKey := strings.TrimPrefix(r.URL.Path, "/ws/")
	if routeKey == "" {
		http.Error(w, "missing route key", http.StatusBadRequest)
		return
	}
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
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

	_ = conn.SetReadDeadline(time.Time{})
	conn.SetPongHandler(func(string) error { return nil })

	for {
		messageType, payload, err := conn.ReadMessage()
		if err != nil {
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
	}
	if requested == "" {
		if routeKey, session, ok := s.sessionManager.GetFirstRunningSession(); ok {
			return routeKey, session, true
		}
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
	s.mu.RUnlock()
	if hasCached && time.Since(cached.when) < s.screenshotTTL(routeKey) {
		if match := r.Header.Get("If-None-Match"); match != "" && match == cached.etag {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("ETag", cached.etag)
		w.Header().Set("Content-Type", "image/svg+xml")
		_, _ = io.WriteString(w, cached.svg)
		return
	}

	if s.screenshotForceRedraw {
		_ = session.ForceRedraw()
	}

	snapshot := session.GetScreenSnapshot()
	if hasCached && !snapshot.HasChanges {
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
	etag := fmt.Sprintf("%x", hash[:])
	s.mu.Lock()
	s.screenshotCache[routeKey] = screenshotCacheEntry{when: time.Now(), svg: svg, etag: etag}
	s.mu.Unlock()

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
			_, _ = fmt.Fprintf(w, "event: activity\ndata: %s\n\n", routeKey)
			flusher.Flush()
		case <-ticker.C:
			_, _ = io.WriteString(w, ": keepalive\n\n")
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
		html := fmt.Sprintf(`<!DOCTYPE html><html><head><title>Session Dashboard</title><link rel="manifest" href="/static/manifest.json"><meta name="theme-color" content="#0d1117"><link rel="icon" href="/static/icons/webterm-192.png" sizes="192x192"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:16px;background:#0f172a;color:#e2e8f0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}.tile{background:#1e293b;border:1px solid #334155;border-radius:8px;overflow:hidden;cursor:pointer}.tile-header{padding:10px 12px;font-weight:bold;border-bottom:1px solid #334155;display:flex;justify-content:space-between}.thumb{width:100%%;height:180px;object-fit:contain;background:#0b1220;display:block}.meta{padding:8px 12px;color:#94a3b8;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.empty{color:#64748b;text-align:center;padding:40px}</style></head><body><h1>Sessions</h1><div id="subtitle"></div><div class="grid" id="grid"></div><script>let tiles=%s;const composeMode=%s;const dockerWatchMode=%s;let cardsBySlug={};const grid=document.getElementById("grid");const subtitle=document.getElementById("subtitle");function openTile(tile){const url='/?route_key='+encodeURIComponent(tile.slug);const target='webterm-'+tile.slug;let win=window.open(url,target);if(!win){window.location.href=url;return}if(typeof win.focus==='function'){win.focus()}}function makeTile(tile){const card=document.createElement('div');card.className='tile';const header=document.createElement('div');header.className='tile-header';header.innerHTML='<span>'+tile.name+'</span>';if(composeMode){const spark=document.createElement('img');spark.width=80;spark.height=16;spark.alt='CPU';header.appendChild(spark);card.sparkline=spark}const img=document.createElement('img');img.className='thumb';img.alt=tile.name;const meta=document.createElement('div');meta.className='meta';meta.textContent=tile.command||'';const body=document.createElement('div');body.appendChild(img);card.appendChild(header);card.appendChild(body);card.appendChild(meta);card.onclick=()=>openTile(tile);card.img=img;return card}function refreshTile(slug){const card=cardsBySlug[slug];if(card){card.img.src='/screenshot.svg?route_key='+encodeURIComponent(slug)+'&_t='+Date.now()}}function refreshSparklines(){if(!composeMode)return;tiles.forEach(tile=>{const card=cardsBySlug[tile.slug];if(card&&card.sparkline){card.sparkline.src='/cpu-sparkline.svg?container='+encodeURIComponent(tile.slug)+'&width=80&height=16&_t='+Date.now()}})}async function refreshTiles(){try{const resp=await fetch('/tiles');const next=await resp.json();const oldSlugs=tiles.map(t=>t.slug).sort().join(',');const newSlugs=next.map(t=>t.slug).sort().join(',');if(oldSlugs!==newSlugs){tiles=next;render()}}catch(_){}}function render(){grid.innerHTML='';cardsBySlug={};if(!tiles.length){grid.innerHTML='<div class="empty">No containers found. Start containers with the webterm-command label.</div>';subtitle.textContent=dockerWatchMode?'Watching for containers with webterm-command label...':'';return}subtitle.textContent=dockerWatchMode?tiles.length+' container(s) found':'';tiles.forEach(tile=>{const card=makeTile(tile);card.img.src='/screenshot.svg?route_key='+encodeURIComponent(tile.slug);grid.appendChild(card);cardsBySlug[tile.slug]=card});refreshSparklines()}let source=null;function startSSE(){if(source)return;source=new EventSource('/events');source.addEventListener('activity',(e)=>{if(e.data==='__dashboard__'){refreshTiles()}else{refreshTile(e.data)}});source.onerror=()=>{source.close();source=null;setTimeout(startSSE,2000)}}render();if(!document.hidden)startSSE();document.addEventListener('visibilitychange',()=>{if(document.hidden){if(source){source.close();source=null}}else startSSE()});if(composeMode){refreshSparklines();setInterval(refreshSparklines,30000)}</script></body></html>`, string(tilesJSON), composeModeJS, dockerWatchJS)
		w.Header().Set("Content-Type", "text/html")
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
		w.Header().Set("Content-Type", "text/html")
		_, _ = io.WriteString(w, "<!DOCTYPE html><html><head><title>Webterm Server</title></head><body><h2>No Apps Available</h2><p>No terminal applications are configured.</p></body></html>")
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
	page := fmt.Sprintf(`<!DOCTYPE html><html><head><title>%s</title><link rel="stylesheet" href="/static/monospace.css"><style>html,body{width:100%%;height:100%%}body{background:%s;margin:0;padding:0;overflow:hidden;font-family:var(--webterm-mono)}.webterm-terminal{width:100%%;height:100%%;display:block;overflow:hidden}</style></head><body><div id="terminal" class="webterm-terminal" %s></div><script type="module" src="/static/js/terminal.js"></script></body></html>`, htmlEscape(app.Name), themeBG, dataAttrs)
	w.Header().Set("Content-Type", "text/html")
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
	}
	return mux
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

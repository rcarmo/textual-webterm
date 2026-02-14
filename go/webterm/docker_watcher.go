package webterm

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	WebtermLabelName  = "webterm-command"
	WebtermThemeLabel = "webterm-theme"
)

type DockerWatcher struct {
	sessionManager *SessionManager
	socketPath     string

	onContainerAdded   func(slug, name, command string)
	onContainerRemoved func(slug string)

	mu         sync.RWMutex
	managed    map[string]string
	running    bool
	cancel     context.CancelFunc
	waitDone   chan struct{}
	httpClient *http.Client
}

func NewDockerWatcher(
	sessionManager *SessionManager,
	socketPath string,
	onAdded func(slug, name, command string),
	onRemoved func(slug string),
) *DockerWatcher {
	if socketPath == "" {
		socketPath = DockerSocketPath()
	}
	return &DockerWatcher{
		sessionManager:     sessionManager,
		socketPath:         socketPath,
		onContainerAdded:   onAdded,
		onContainerRemoved: onRemoved,
		managed:            map[string]string{},
		waitDone:           make(chan struct{}),
		httpClient:         newUnixHTTPClient(socketPath, 0),
	}
}

func hasWebtermLabel(labels map[string]string) bool {
	_, hasCommand := labels[WebtermLabelName]
	_, hasTheme := labels[WebtermThemeLabel]
	return hasCommand || hasTheme
}

func isAutoLabel(value string) bool {
	if strings.TrimSpace(value) == "" {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(value), "auto")
}

func (w *DockerWatcher) getContainerCommand(container map[string]any) string {
	labels := toStringMap(container["Labels"])
	value := labels[WebtermLabelName]
	if isAutoLabel(value) {
		return AutoCommandSentinel
	}
	return value
}

func (w *DockerWatcher) getContainerTheme(container map[string]any) string {
	labels := toStringMap(container["Labels"])
	return strings.TrimSpace(labels[WebtermThemeLabel])
}

func (w *DockerWatcher) getContainerName(container map[string]any) string {
	names := toStringSlice(container["Names"])
	if len(names) > 0 {
		return strings.TrimPrefix(names[0], "/")
	}
	id := asString(container["Id"])
	if len(id) > 12 {
		id = id[:12]
	}
	return id
}

func (w *DockerWatcher) containerToSlug(container map[string]any) string {
	name := w.getContainerName(container)
	return strings.NewReplacer("_", "-", ".", "-").Replace(name)
}

func (w *DockerWatcher) addContainer(container map[string]any) {
	slug := w.containerToSlug(container)
	name := w.getContainerName(container)
	command := w.getContainerCommand(container)
	theme := w.getContainerTheme(container)
	containerID := asString(container["Id"])

	w.mu.Lock()
	if _, exists := w.managed[slug]; exists {
		w.mu.Unlock()
		return
	}
	w.managed[slug] = containerID
	w.mu.Unlock()

	w.sessionManager.AddApp(name, command, slug, true, theme)
	log.Printf("docker event: added container id=%s slug=%s name=%s", containerID, slug, name)
	if w.onContainerAdded != nil {
		w.onContainerAdded(slug, name, command)
	}
}

func (w *DockerWatcher) removeContainer(containerID string) {
	w.mu.Lock()
	slug := ""
	for s, id := range w.managed {
		if id == containerID || strings.HasPrefix(id, containerID) {
			slug = s
			delete(w.managed, s)
			break
		}
	}
	w.mu.Unlock()
	if slug == "" {
		return
	}

	if sessionID, ok := w.sessionManager.GetSessionIDByRouteKey(slug); ok {
		w.sessionManager.CloseSession(sessionID)
	}
	w.sessionManager.RemoveApp(slug)
	log.Printf("docker event: removed container id=%s slug=%s", containerID, slug)
	if w.onContainerRemoved != nil {
		w.onContainerRemoved(slug)
	}
}

func (w *DockerWatcher) listLabeledContainers() ([]map[string]any, error) {
	seen := map[string]bool{}
	containers := []map[string]any{}
	for _, label := range []string{WebtermLabelName, WebtermThemeLabel} {
		path := fmt.Sprintf(`/containers/json?filters={"label":["%s"]}`, label)
		status, body, err := unixJSONRequest(w.socketPath, http.MethodGet, path, nil)
		if err != nil || status != http.StatusOK {
			continue
		}
		var payload []map[string]any
		if err := json.Unmarshal(body, &payload); err != nil {
			continue
		}
		for _, container := range payload {
			id := asString(container["Id"])
			if id == "" || seen[id] {
				continue
			}
			seen[id] = true
			containers = append(containers, container)
		}
	}
	return containers, nil
}

func (w *DockerWatcher) handleEvent(event map[string]any) {
	action := asString(event["Action"])
	actor := toAnyMap(event["Actor"])
	containerID := asString(actor["ID"])
	if containerID == "" {
		return
	}
	switch action {
	case "start":
		log.Printf("docker event: action=start container=%s", containerID)
		path := fmt.Sprintf("/containers/%s/json", url.PathEscape(containerID))
		status, body, err := unixJSONRequest(w.socketPath, http.MethodGet, path, nil)
		if err != nil || status != http.StatusOK {
			log.Printf("docker event: start inspect failed container=%s status=%d err=%v", containerID, status, err)
			return
		}
		var detail map[string]any
		if err := json.Unmarshal(body, &detail); err != nil {
			log.Printf("docker event: start decode failed container=%s err=%v", containerID, err)
			return
		}
		config := toAnyMap(detail["Config"])
		labels := toStringMap(config["Labels"])
		if !hasWebtermLabel(labels) {
			return
		}
		container := map[string]any{
			"Id":     containerID,
			"Names":  []any{"/" + strings.TrimPrefix(asString(detail["Name"]), "/")},
			"Labels": config["Labels"],
		}
		w.addContainer(container)
	case "die":
		log.Printf("docker event: action=die container=%s", containerID)
		w.removeContainer(containerID)
	}
}

func (w *DockerWatcher) watchEvents(ctx context.Context, waitDone chan struct{}) {
	defer close(waitDone)
	filters := url.QueryEscape(`{"event":["start","die"],"type":["container"]}`)
	requestURL := "http://unix/events?filters=" + filters
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
		resp, err := w.httpClient.Do(req)
		if err != nil {
			log.Printf("docker event stream connect failed err=%v", err)
			select {
			case <-ctx.Done():
				return
			case <-time.After(5 * time.Second):
				continue
			}
		}
		log.Printf("docker event stream connected")
		decoder := json.NewDecoder(resp.Body)
		for {
			var event map[string]any
			if err := decoder.Decode(&event); err != nil {
				log.Printf("docker event stream decode error err=%v", err)
				break
			}
			w.handleEvent(event)
		}
		_ = resp.Body.Close()
		select {
		case <-ctx.Done():
			return
		case <-time.After(2 * time.Second):
		}
	}
}

func (w *DockerWatcher) ScanExisting() {
	containers, err := w.listLabeledContainers()
	if err != nil {
		log.Printf("docker scan failed err=%v", err)
		return
	}
	log.Printf("docker scan found %d labeled container(s)", len(containers))
	for _, container := range containers {
		w.addContainer(container)
	}
}

func (w *DockerWatcher) Start() {
	w.mu.Lock()
	if w.running {
		w.mu.Unlock()
		return
	}
	waitDone := make(chan struct{})
	ctx, cancel := context.WithCancel(context.Background())
	w.cancel = cancel
	w.waitDone = waitDone
	w.running = true
	w.mu.Unlock()
	log.Printf("docker watcher started")
	w.ScanExisting()
	go w.watchEvents(ctx, waitDone)
}

func (w *DockerWatcher) Stop() {
	w.mu.Lock()
	if !w.running {
		w.mu.Unlock()
		return
	}
	w.running = false
	cancel := w.cancel
	waitDone := w.waitDone
	w.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	<-waitDone
	log.Printf("docker watcher stopped")
}

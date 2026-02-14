package webterm

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	StatsHistorySize = 180
	PollInterval     = 10 * time.Second
)

type DockerStatsCollector struct {
	socketPath     string
	composeProject string

	mu          sync.RWMutex
	cpuHistory  map[string][]float64
	prevCPU     map[string][2]uint64
	serviceList []string

	running bool
	stopCh  chan struct{}
	doneCh  chan struct{}
}

func NewDockerStatsCollector(socketPath, composeProject string) *DockerStatsCollector {
	if socketPath == "" {
		socketPath = DockerSocketPath()
	}
	return &DockerStatsCollector{
		socketPath:     socketPath,
		composeProject: composeProject,
		cpuHistory:     map[string][]float64{},
		prevCPU:        map[string][2]uint64{},
		stopCh:         make(chan struct{}),
		doneCh:         make(chan struct{}),
	}
}

func (d *DockerStatsCollector) Available() bool {
	path := d.socketPath
	if !filepath.IsAbs(path) {
		path = filepath.Clean(path)
	}
	if _, err := os.Stat(path); err != nil {
		return false
	}
	client := newUnixHTTPClient(d.socketPath, 2*time.Second)
	resp, err := client.Get("http://unix/_ping")
	if err != nil {
		return false
	}
	_ = resp.Body.Close()
	return true
}

func (d *DockerStatsCollector) Start(serviceNames []string) {
	d.mu.Lock()
	if d.running {
		d.mu.Unlock()
		return
	}
	d.stopCh = make(chan struct{})
	d.doneCh = make(chan struct{})
	d.serviceList = append([]string{}, serviceNames...)
	d.running = true
	d.mu.Unlock()
	go d.pollLoop()
}

func (d *DockerStatsCollector) Stop() {
	d.mu.Lock()
	if !d.running {
		d.mu.Unlock()
		return
	}
	d.running = false
	close(d.stopCh)
	d.mu.Unlock()
	<-d.doneCh
}

func (d *DockerStatsCollector) AddService(name string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	for _, existing := range d.serviceList {
		if existing == name {
			return
		}
	}
	d.serviceList = append(d.serviceList, name)
}

func (d *DockerStatsCollector) RemoveService(name string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	filtered := d.serviceList[:0]
	for _, item := range d.serviceList {
		if item != name {
			filtered = append(filtered, item)
		}
	}
	d.serviceList = filtered
	delete(d.cpuHistory, name)
	delete(d.prevCPU, name)
}

func (d *DockerStatsCollector) GetCPUHistory(name string) []float64 {
	d.mu.RLock()
	defer d.mu.RUnlock()
	history := d.cpuHistory[name]
	out := make([]float64, len(history))
	copy(out, history)
	return out
}

func (d *DockerStatsCollector) pollLoop() {
	defer close(d.doneCh)
	ticker := time.NewTicker(PollInterval)
	defer ticker.Stop()
	serviceToContainer := map[string]string{}
	refreshCounter := 0

	for {
		select {
		case <-d.stopCh:
			return
		default:
		}

		d.mu.RLock()
		services := append([]string{}, d.serviceList...)
		d.mu.RUnlock()
		if refreshCounter%30 == 0 || len(serviceToContainer) != len(services) {
			serviceToContainer = d.discoverContainers(services)
		}
		refreshCounter++
		for _, service := range services {
			containerID := serviceToContainer[service]
			if containerID == "" {
				continue
			}
			d.pollContainer(service, containerID)
		}
		select {
		case <-d.stopCh:
			return
		case <-ticker.C:
		}
	}
}

func (d *DockerStatsCollector) discoverContainers(serviceNames []string) map[string]string {
	status, body, err := unixJSONRequest(d.socketPath, "GET", "/containers/json", nil)
	if err != nil || status != 200 {
		return map[string]string{}
	}
	var containers []map[string]any
	if err := json.Unmarshal(body, &containers); err != nil {
		return map[string]string{}
	}
	mapping := map[string]string{}
	for _, container := range containers {
		labels := toStringMap(container["Labels"])
		if d.composeProject != "" && labels["com.docker.compose.project"] != d.composeProject {
			continue
		}
		service := labels["com.docker.compose.service"]
		containerID := asString(container["Id"])
		if len(containerID) > 12 {
			containerID = containerID[:12]
		}
		for _, target := range serviceNames {
			if service == target {
				mapping[target] = containerID
				break
			}
			names := toStringSlice(container["Names"])
			for _, name := range names {
				clean := strings.TrimPrefix(name, "/")
				if clean == target || strings.Contains(clean, target) {
					mapping[target] = containerID
					break
				}
			}
		}
	}
	return mapping
}

func (d *DockerStatsCollector) pollContainer(serviceName, containerID string) {
	path := fmt.Sprintf("/containers/%s/stats?stream=false", containerID)
	status, body, err := unixJSONRequest(d.socketPath, "GET", path, nil)
	if err != nil || status != 200 {
		return
	}
	var stats map[string]any
	if err := json.Unmarshal(body, &stats); err != nil {
		return
	}
	cpuStats := toAnyMap(stats["cpu_stats"])
	precpuStats := toAnyMap(stats["precpu_stats"])
	value, ok := d.calculateCPUPercent(serviceName, cpuStats, precpuStats)
	if !ok {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	history := append(d.cpuHistory[serviceName], value)
	if len(history) > StatsHistorySize {
		history = history[len(history)-StatsHistorySize:]
	}
	d.cpuHistory[serviceName] = history
}

func (d *DockerStatsCollector) calculateCPUPercent(container string, cpuStats, precpuStats map[string]any) (float64, bool) {
	cpuUsage := toAnyMap(cpuStats["cpu_usage"])
	precpuUsage := toAnyMap(precpuStats["cpu_usage"])
	cpuTotal := toUint(cpuUsage["total_usage"])
	preTotal := toUint(precpuUsage["total_usage"])
	systemCPU := toUint(cpuStats["system_cpu_usage"])
	preSystem := toUint(precpuStats["system_cpu_usage"])

	d.mu.Lock()
	if preTotal == 0 {
		if previous, ok := d.prevCPU[container]; ok {
			preTotal = previous[0]
			preSystem = previous[1]
		}
	}
	d.prevCPU[container] = [2]uint64{cpuTotal, systemCPU}
	d.mu.Unlock()

	cpuDelta := int64(cpuTotal) - int64(preTotal)
	systemDelta := int64(systemCPU) - int64(preSystem)
	if cpuDelta < 0 || systemDelta <= 0 {
		return 0, false
	}
	onlineCPUs := toInt(cpuStats["online_cpus"])
	if onlineCPUs <= 0 {
		perCPU := toAnySlice(cpuUsage["percpu_usage"])
		if len(perCPU) == 0 {
			onlineCPUs = 1
		} else {
			onlineCPUs = len(perCPU)
		}
	}
	percent := (float64(cpuDelta) / float64(systemDelta)) * float64(onlineCPUs) * 100.0
	maxValue := float64(onlineCPUs) * 100.0
	return math.Min(percent, maxValue), true
}

func RenderSparklineSVG(values []float64, width, height int) string {
	if width <= 0 {
		width = 100
	}
	if height <= 0 {
		height = 20
	}
	if len(values) == 0 {
		return fmt.Sprintf(`<svg width="%d" height="%d" xmlns="http://www.w3.org/2000/svg"></svg>`, width, height)
	}
	points := make([]float64, 0, len(values)+1)
	points = append(points, 0)
	points = append(points, values...)
	maxValue := 1.0
	for _, value := range points {
		if value > maxValue {
			maxValue = value
		}
	}
	if maxValue <= 0 {
		maxValue = 1
	}
	xStep := float64(width) / float64(max(1, len(points)-1))
	line := strings.Builder{}
	fill := strings.Builder{}
	for i, value := range points {
		x := float64(i) * xStep
		y := float64(height) - ((value / maxValue) * float64(height-2)) - 1
		if i > 0 {
			line.WriteByte(' ')
			fill.WriteByte(' ')
		}
		line.WriteString(fmt.Sprintf("%.1f,%.1f", x, y))
		fill.WriteString(fmt.Sprintf("%.1f,%.1f", x, y))
	}
	fill.WriteString(fmt.Sprintf(" %d,%d 0,%d", width, height, height))
	return fmt.Sprintf(`<svg width="%d" height="%d" xmlns="http://www.w3.org/2000/svg"><polygon points="%s" fill="rgba(74, 222, 128, 0.2)" /><polyline points="%s" fill="none" stroke="#4ade80" stroke-width="1.5" /></svg>`, width, height, fill.String(), line.String())
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func toAnyMap(value any) map[string]any {
	switch raw := value.(type) {
	case map[string]any:
		return raw
	case map[any]any:
		out := map[string]any{}
		for key, val := range raw {
			if text, ok := key.(string); ok {
				out[text] = val
			}
		}
		return out
	default:
		return map[string]any{}
	}
}

func toStringMap(value any) map[string]string {
	out := map[string]string{}
	for key, val := range toAnyMap(value) {
		out[key] = asString(val)
	}
	return out
}

func toAnySlice(value any) []any {
	switch raw := value.(type) {
	case []any:
		return raw
	default:
		return nil
	}
}

func toStringSlice(value any) []string {
	raw := toAnySlice(value)
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		if text, ok := item.(string); ok {
			out = append(out, text)
		}
	}
	return out
}

func toUint(value any) uint64 {
	switch v := value.(type) {
	case uint64:
		return v
	case int:
		if v > 0 {
			return uint64(v)
		}
	case int64:
		if v > 0 {
			return uint64(v)
		}
	case float64:
		if v > 0 {
			return uint64(v)
		}
	case json.Number:
		n, _ := v.Int64()
		if n > 0 {
			return uint64(n)
		}
	}
	return 0
}

func toInt(value any) int {
	switch v := value.(type) {
	case int:
		return v
	case int64:
		return int(v)
	case float64:
		return int(v)
	case json.Number:
		n, _ := v.Int64()
		return int(n)
	}
	return 0
}

package webterm

import (
	"strings"
	"testing"
)

func TestRenderSparklineSVG(t *testing.T) {
	svg := RenderSparklineSVG([]float64{10, 20, 30}, 120, 24)
	if !strings.Contains(svg, "<polyline") {
		t.Fatalf("expected polyline in sparkline svg")
	}
	if !strings.Contains(svg, `width="120"`) {
		t.Fatalf("expected width to be present")
	}
}

func TestCalculateCPUPercentUsesPreviousStats(t *testing.T) {
	collector := NewDockerStatsCollector("/tmp/does-not-exist.sock", "")
	cpuStats := map[string]any{
		"cpu_usage": map[string]any{
			"total_usage":  float64(200),
			"percpu_usage": []any{1, 2},
		},
		"system_cpu_usage": float64(400),
		"online_cpus":      float64(2),
	}
	preCPU := map[string]any{
		"cpu_usage":        map[string]any{"total_usage": float64(100)},
		"system_cpu_usage": float64(200),
	}
	value, ok := collector.calculateCPUPercent("svc", cpuStats, preCPU)
	if !ok || value <= 0 {
		t.Fatalf("expected cpu percent, got ok=%v value=%v", ok, value)
	}
}

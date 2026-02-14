package webterm

import (
	"encoding/json"
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

func TestDockerStatsHelperConversions(t *testing.T) {
	m := toAnyMap(map[any]any{"a": 1, "b": "x", 7: "ignored"})
	if len(m) != 2 || m["a"] != 1 || m["b"] != "x" {
		t.Fatalf("unexpected map conversion: %+v", m)
	}
	if got := toAnyMap("not-map"); len(got) != 0 {
		t.Fatalf("expected empty map for invalid input")
	}

	if got := toAnySlice([]any{1, "x"}); len(got) != 2 {
		t.Fatalf("unexpected slice conversion: %+v", got)
	}
	if got := toAnySlice("not-slice"); got != nil {
		t.Fatalf("expected nil for non-slice input")
	}

	ss := toStringSlice([]any{"a", 1, "b"})
	if len(ss) != 2 || ss[0] != "a" || ss[1] != "b" {
		t.Fatalf("unexpected string slice conversion: %+v", ss)
	}

	if got := toUint(uint64(9)); got != 9 {
		t.Fatalf("toUint(uint64) mismatch: %d", got)
	}
	if got := toUint(int64(5)); got != 5 {
		t.Fatalf("toUint(int64) mismatch: %d", got)
	}
	if got := toUint(float64(7)); got != 7 {
		t.Fatalf("toUint(float64) mismatch: %d", got)
	}
	if got := toUint(json.Number("11")); got != 11 {
		t.Fatalf("toUint(json.Number) mismatch: %d", got)
	}
	if got := toUint(int(-1)); got != 0 {
		t.Fatalf("toUint should clamp negatives to zero: %d", got)
	}

	if got := toInt(int64(3)); got != 3 {
		t.Fatalf("toInt(int64) mismatch: %d", got)
	}
	if got := toInt(float64(4)); got != 4 {
		t.Fatalf("toInt(float64) mismatch: %d", got)
	}
	if got := toInt(json.Number("6")); got != 6 {
		t.Fatalf("toInt(json.Number) mismatch: %d", got)
	}
	if got := toInt("bad"); got != 0 {
		t.Fatalf("toInt invalid should fallback to 0, got %d", got)
	}

	if got := max(1, 2); got != 2 {
		t.Fatalf("max mismatch: %d", got)
	}
	if got := max(5, 2); got != 5 {
		t.Fatalf("max mismatch: %d", got)
	}
}

func TestDockerStatsCollectorCanRestart(t *testing.T) {
	collector := NewDockerStatsCollector("/tmp/does-not-exist.sock", "")
	collector.Start([]string{"svc"})
	collector.Stop()
	collector.Start([]string{"svc"})
	collector.Stop()
}

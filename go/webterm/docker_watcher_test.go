package webterm

import "testing"

func TestDockerWatcherCommandAndThemeParsing(t *testing.T) {
	watcher := NewDockerWatcher(NewSessionManager(nil), "/tmp/docker.sock", nil, nil)
	container := map[string]any{
		"Labels": map[string]any{
			WebtermLabelName:  "auto",
			WebtermThemeLabel: "nord",
		},
		"Names": []any{"/my_container.1"},
	}
	if cmd := watcher.getContainerCommand(container); cmd != AutoCommandSentinel {
		t.Fatalf("expected auto command sentinel, got %q", cmd)
	}
	if theme := watcher.getContainerTheme(container); theme != "nord" {
		t.Fatalf("unexpected theme: %q", theme)
	}
	if slug := watcher.containerToSlug(container); slug != "my-container-1" {
		t.Fatalf("unexpected slug: %q", slug)
	}
}

func TestDockerWatcherCanRestart(t *testing.T) {
	watcher := NewDockerWatcher(NewSessionManager(nil), "/tmp/does-not-exist.sock", nil, nil)
	watcher.Start()
	watcher.Stop()
	watcher.Start()
	watcher.Stop()
}

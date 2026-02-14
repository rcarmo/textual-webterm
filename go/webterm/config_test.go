package webterm

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadLandingYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "landing.yaml")
	content := `
- name: Shell
  command: /bin/sh
  slug: shell
- name: Missing Command
`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	apps, err := LoadLandingYAML(path)
	if err != nil {
		t.Fatalf("LoadLandingYAML() error = %v", err)
	}
	if len(apps) != 1 {
		t.Fatalf("expected 1 app, got %d", len(apps))
	}
	if apps[0].Slug != "shell" || apps[0].Command != "/bin/sh" {
		t.Fatalf("unexpected app: %+v", apps[0])
	}
}

func TestLoadComposeManifestReadsLabels(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "compose.yaml")
	content := `
services:
  web:
    labels:
      webterm-command: auto
      webterm-theme: monokai
  db:
    labels:
      - webterm-command=docker exec -it db psql
`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	apps, project, err := LoadComposeManifest(path)
	if err != nil {
		t.Fatalf("LoadComposeManifest() error = %v", err)
	}
	if project != filepath.Base(dir) {
		t.Fatalf("unexpected project name: %q", project)
	}
	if len(apps) != 2 {
		t.Fatalf("expected 2 apps, got %d", len(apps))
	}
	if apps[0].Theme != "monokai" && apps[1].Theme != "monokai" {
		t.Fatalf("expected theme to be parsed")
	}
}

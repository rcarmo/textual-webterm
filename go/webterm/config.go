package webterm

import (
	"errors"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type App struct {
	Name     string `yaml:"name" json:"name"`
	Slug     string `yaml:"slug" json:"slug"`
	Path     string `yaml:"path" json:"-"`
	Color    string `yaml:"color" json:"-"`
	Command  string `yaml:"command" json:"command"`
	Terminal bool   `yaml:"terminal" json:"-"`
	Theme    string `yaml:"theme" json:"-"`
}

type Config struct {
	Apps []App
}

func DefaultConfig() Config {
	return Config{Apps: []App{}}
}

func LoadLandingYAML(manifestPath string) ([]App, error) {
	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, err
	}
	var entries []map[string]any
	if err := yaml.Unmarshal(data, &entries); err != nil {
		return nil, err
	}
	apps := make([]App, 0, len(entries))
	for _, entry := range entries {
		name, _ := entry["name"].(string)
		command, _ := entry["command"].(string)
		if name == "" || command == "" {
			continue
		}
		slug := asString(entry["slug"])
		if slug == "" {
			slug = Slugify(name)
		}
		path := asString(entry["path"])
		if path == "" {
			path = "./"
		}
		terminal := true
		if value, ok := entry["terminal"].(bool); ok {
			terminal = value
		}
		apps = append(apps, App{
			Name:     name,
			Slug:     slug,
			Command:  command,
			Path:     path,
			Color:    asString(entry["color"]),
			Terminal: terminal,
			Theme:    asString(entry["theme"]),
		})
	}
	return apps, nil
}

func LoadComposeManifest(manifestPath string) ([]App, string, error) {
	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, "", err
	}
	var root map[string]any
	if err := yaml.Unmarshal(data, &root); err != nil {
		return nil, "", err
	}
	servicesAny, ok := root["services"]
	if !ok {
		return []App{}, filepath.Base(filepath.Dir(manifestPath)), nil
	}
	services, ok := servicesAny.(map[string]any)
	if !ok {
		return nil, "", errors.New("compose services must be mapping")
	}
	apps := make([]App, 0, len(services))
	for name, serviceAny := range services {
		service, ok := serviceAny.(map[string]any)
		if !ok {
			continue
		}
		command := extractLabel(service["labels"], "webterm-command")
		if command == "" {
			continue
		}
		theme := extractLabel(service["labels"], "webterm-theme")
		workingDir := asString(service["working_dir"])
		if workingDir == "" {
			workingDir = "./"
		}
		apps = append(apps, App{
			Name:     name,
			Slug:     Slugify(name),
			Command:  command,
			Path:     workingDir,
			Terminal: true,
			Theme:    theme,
		})
	}
	return apps, filepath.Base(filepath.Dir(manifestPath)), nil
}

func extractLabel(labels any, key string) string {
	switch raw := labels.(type) {
	case map[string]any:
		return asString(raw[key])
	case []any:
		for _, item := range raw {
			text, ok := item.(string)
			if !ok {
				continue
			}
			for i := 0; i < len(text); i++ {
				if text[i] != '=' {
					continue
				}
				if text[:i] == key {
					return text[i+1:]
				}
				break
			}
		}
	}
	return ""
}

func asString(value any) string {
	if value == nil {
		return ""
	}
	if s, ok := value.(string); ok {
		return os.ExpandEnv(s)
	}
	return ""
}

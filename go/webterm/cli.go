package webterm

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
)

func RunCLI(args []string) error {
	fs := flag.NewFlagSet("webterm", flag.ContinueOnError)
	fs.SetOutput(os.Stdout)

	port := DefaultPort
	host := DefaultHost
	landingManifest := ""
	composeManifest := ""
	dockerWatch := false
	theme := DefaultTheme
	fontFamily := ""
	fontSize := DefaultFontSize
	showVersion := false

	fs.IntVar(&port, "port", DefaultPort, "Port for server.")
	fs.IntVar(&port, "p", DefaultPort, "Port for server.")
	fs.StringVar(&host, "host", DefaultHost, "Host for server.")
	fs.StringVar(&host, "H", DefaultHost, "Host for server.")
	fs.StringVar(&landingManifest, "landing-manifest", "", "YAML manifest describing landing page tiles.")
	fs.StringVar(&landingManifest, "L", "", "YAML manifest describing landing page tiles.")
	fs.StringVar(&composeManifest, "compose-manifest", "", "Docker compose YAML; services with label \"webterm-command\" become landing tiles.")
	fs.StringVar(&composeManifest, "C", "", "Docker compose YAML; services with label \"webterm-command\" become landing tiles.")
	fs.BoolVar(&dockerWatch, "docker-watch", false, "Watch Docker for containers with labels and add/remove sessions dynamically.")
	fs.BoolVar(&dockerWatch, "D", false, "Watch Docker for containers with labels and add/remove sessions dynamically.")
	fs.StringVar(&theme, "theme", DefaultTheme, "Terminal color theme.")
	fs.StringVar(&theme, "t", DefaultTheme, "Terminal color theme.")
	fs.StringVar(&fontFamily, "font-family", "", "Terminal font family (CSS font stack).")
	fs.StringVar(&fontFamily, "f", "", "Terminal font family (CSS font stack).")
	fs.IntVar(&fontSize, "font-size", DefaultFontSize, "Terminal font size in pixels.")
	fs.IntVar(&fontSize, "s", DefaultFontSize, "Terminal font size in pixels.")
	fs.BoolVar(&showVersion, "version", false, "Print version and exit.")
	fs.BoolVar(&showVersion, "v", false, "Print version and exit.")

	if err := fs.Parse(args); err != nil {
		return err
	}
	if showVersion {
		_, _ = fmt.Fprintln(os.Stdout, "0.0.0")
		return nil
	}

	command := strings.TrimSpace(strings.Join(fs.Args(), " "))
	config := DefaultConfig()
	landingApps := []App{}
	composeMode := false
	composeProject := ""

	if landingManifest != "" {
		apps, err := LoadLandingYAML(landingManifest)
		if err != nil {
			return err
		}
		landingApps = apps
	}
	if composeManifest != "" {
		apps, project, err := LoadComposeManifest(composeManifest)
		if err != nil {
			return err
		}
		landingApps = apps
		composeMode = true
		composeProject = project
	}
	if composeProject == "" && composeManifest != "" {
		composeProject = filepath.Base(filepath.Dir(composeManifest))
	}

	server := NewLocalServer(config, ServerOptions{
		Host:           host,
		Port:           port,
		Theme:          theme,
		FontFamily:     fontFamily,
		FontSize:       fontSize,
		LandingApps:    landingApps,
		ComposeMode:    composeMode,
		ComposeProject: composeProject,
		DockerWatch:    dockerWatch,
	})

	if command != "" {
		server.sessionManager.AddApp("Terminal", command, "", true, "")
	} else if !dockerWatch && len(landingApps) == 0 {
		shell := os.Getenv("SHELL")
		if shell == "" {
			shell = "/bin/sh"
		}
		server.sessionManager.AddApp("Terminal", shell, "", true, "")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	return server.Run(ctx)
}

package webterm

import (
	"fmt"
	"os"
	"strings"
	"sync"
)

type SessionManager struct {
	mu         sync.RWMutex
	apps       []App
	appsBySlug map[string]App
	sessions   map[string]Session
	routes     *TwoWayMap[string, string]

	sessionFactory func(app App, sessionID string) Session
}

func NewSessionManager(apps []App) *SessionManager {
	m := &SessionManager{
		apps:       append([]App{}, apps...),
		appsBySlug: map[string]App{},
		sessions:   map[string]Session{},
		routes:     NewTwoWayMap[string, string](),
	}
	for _, app := range m.apps {
		m.appsBySlug[app.Slug] = app
	}
	m.sessionFactory = m.defaultSessionFactory
	return m
}

func (m *SessionManager) SetSessionFactory(factory func(app App, sessionID string) Session) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessionFactory = factory
}

func (m *SessionManager) defaultSessionFactory(app App, sessionID string) Session {
	if app.Command == AutoCommandSentinel {
		auto := os.Getenv(DockerAutoCommandEnv)
		if strings.TrimSpace(auto) == "" {
			auto = "/bin/bash"
		}
		auto = strings.ReplaceAll(auto, "{container}", app.Name)
		spec := DockerExecSpec{
			Container: app.Name,
			Command:   splitCommand(auto),
			User:      os.Getenv(DockerUsernameEnv),
		}
		return NewDockerExecSession(sessionID, spec, "")
	}
	return NewTerminalSession(sessionID, app.Command)
}

func splitCommand(command string) []string {
	argv, err := shlexSplit(command)
	if err != nil || len(argv) == 0 {
		return []string{"/bin/sh", "-lc", command}
	}
	return argv
}

func shlexSplit(command string) ([]string, error) {
	return shlexSplitImpl(command)
}

func (m *SessionManager) AddApp(name, command, slug string, terminal bool, theme string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	if strings.TrimSpace(slug) == "" {
		slug = strings.ToLower(GenerateID(12))
	}
	app := App{
		Name:     name,
		Slug:     slug,
		Path:     "./",
		Command:  command,
		Terminal: terminal,
		Theme:    theme,
	}
	m.apps = append(m.apps, app)
	m.appsBySlug[slug] = app
	return slug
}

func (m *SessionManager) RemoveApp(slug string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.appsBySlug, slug)
	filtered := m.apps[:0]
	for _, app := range m.apps {
		if app.Slug != slug {
			filtered = append(filtered, app)
		}
	}
	m.apps = filtered
}

func (m *SessionManager) Apps() []App {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return append([]App{}, m.apps...)
}

func (m *SessionManager) AppBySlug(slug string) (App, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	app, ok := m.appsBySlug[slug]
	return app, ok
}

func (m *SessionManager) GetDefaultApp() (App, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if len(m.apps) == 0 {
		return App{}, false
	}
	return m.apps[0], true
}

func (m *SessionManager) NewSession(slug, sessionID, routeKey string, width, height int) (Session, error) {
	m.mu.Lock()
	app, ok := m.appsBySlug[slug]
	if !ok {
		m.mu.Unlock()
		return nil, fmt.Errorf("app not found")
	}
	// Check if this routeKey already has an active session
	if existingID, exists := m.routes.UnsafeForward()[routeKey]; exists {
		if existingSession, alive := m.sessions[existingID]; alive && existingSession.IsRunning() {
			m.mu.Unlock()
			return existingSession, nil
		}
		// Stale mapping — clean up
		delete(m.sessions, existingID)
		m.routes.DeleteKey(routeKey)
	}
	factory := m.sessionFactory
	m.mu.Unlock()

	session := factory(app, sessionID)
	if session == nil {
		return nil, fmt.Errorf("session factory returned nil")
	}
	if err := session.Open(width, height); err != nil {
		return nil, err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	// Re-check after re-acquiring lock
	if existingID, exists := m.routes.UnsafeForward()[routeKey]; exists {
		if existingSession, alive := m.sessions[existingID]; alive && existingSession.IsRunning() {
			// Another goroutine won the race; close ours and return theirs
			go func() { _ = session.Close() }()
			return existingSession, nil
		}
		delete(m.sessions, existingID)
		m.routes.DeleteKey(routeKey)
	}
	m.sessions[sessionID] = session
	_ = m.routes.Set(routeKey, sessionID)
	return session, nil
}

func (m *SessionManager) OnSessionEnd(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, sessionID)
	if route, ok := m.routes.GetKey(sessionID); ok {
		m.routes.DeleteKey(route)
	}
}

func (m *SessionManager) CloseAll() {
	m.mu.RLock()
	sessionIDs := make([]string, 0, len(m.sessions))
	for sessionID := range m.sessions {
		sessionIDs = append(sessionIDs, sessionID)
	}
	m.mu.RUnlock()
	for _, sessionID := range sessionIDs {
		m.CloseSession(sessionID)
	}
}

func (m *SessionManager) CloseSession(sessionID string) {
	m.mu.RLock()
	session := m.sessions[sessionID]
	m.mu.RUnlock()
	if session == nil {
		return
	}
	_ = session.Close()
	_ = session.Wait()
	m.OnSessionEnd(sessionID)
}

func (m *SessionManager) GetSession(sessionID string) Session {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.sessions[sessionID]
}

func (m *SessionManager) GetSessionByRouteKey(routeKey string) Session {
	m.mu.RLock()
	defer m.mu.RUnlock()
	sessionID, ok := m.routes.Get(routeKey)
	if !ok {
		return nil
	}
	return m.sessions[sessionID]
}

func (m *SessionManager) GetSessionIDByRouteKey(routeKey string) (string, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.routes.Get(routeKey)
}

func (m *SessionManager) GetFirstRunningSession() (string, Session, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for routeKey, sessionID := range m.routes.UnsafeForward() {
		session := m.sessions[sessionID]
		if session != nil && session.IsRunning() {
			return routeKey, session, true
		}
	}
	return "", nil, false
}

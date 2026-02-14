package webterm

import (
	"testing"
)

func TestSessionManagerRouteMappingAndCleanup(t *testing.T) {
	manager := NewSessionManager([]App{{Name: "Shell", Slug: "shell", Command: "/bin/sh", Terminal: true}})
	var created *fakeSession
	manager.SetSessionFactory(func(app App, sessionID string) Session {
		created = newFakeSession()
		return created
	})

	session, err := manager.NewSession("shell", "sid-1", "route-1", 80, 24)
	if err != nil {
		t.Fatalf("NewSession() error = %v", err)
	}
	if session == nil || created == nil {
		t.Fatalf("expected session to be created")
	}
	if got := manager.GetSessionByRouteKey("route-1"); got == nil {
		t.Fatalf("expected session lookup by route key")
	}
	manager.OnSessionEnd("sid-1")
	if got := manager.GetSessionByRouteKey("route-1"); got != nil {
		t.Fatalf("expected route mapping to be removed")
	}
}

func TestSplitCommandWithFallback(t *testing.T) {
	parts := splitCommand(`echo "hello world"`)
	if len(parts) != 2 || parts[1] != "hello world" {
		t.Fatalf("unexpected split command: %#v", parts)
	}
}

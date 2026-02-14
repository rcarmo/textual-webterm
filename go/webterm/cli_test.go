package webterm

import "testing"

func TestRunCLIVersion(t *testing.T) {
	if err := RunCLI([]string{"--version"}); err != nil {
		t.Fatalf("RunCLI(--version) error = %v", err)
	}
}

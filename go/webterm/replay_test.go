package webterm

import "testing"

func TestReplayBufferTrimsOldData(t *testing.T) {
	buffer := NewReplayBuffer(5)
	buffer.Add([]byte("abc"))
	buffer.Add([]byte("de"))
	buffer.Add([]byte("f"))
	if got := string(buffer.Bytes()); got != "def" {
		t.Fatalf("expected trimmed replay buffer, got %q", got)
	}
}

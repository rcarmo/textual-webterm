package webterm

import "sync"

const replayBufferSize = 256 * 1024

type ReplayBuffer struct {
	mu    sync.Mutex
	parts [][]byte
	size  int
	limit int
}

func NewReplayBuffer(limit int) *ReplayBuffer {
	if limit <= 0 {
		limit = replayBufferSize
	}
	return &ReplayBuffer{limit: limit}
}

func (r *ReplayBuffer) Add(data []byte) {
	if len(data) == 0 {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	chunk := append([]byte{}, data...)
	r.parts = append(r.parts, chunk)
	r.size += len(chunk)
	evicted := 0
	for r.size > r.limit && evicted < len(r.parts) {
		r.size -= len(r.parts[evicted])
		evicted++
	}
	if evicted > 0 {
		// Copy remaining to a new slice to release old backing array
		remaining := make([][]byte, len(r.parts)-evicted)
		copy(remaining, r.parts[evicted:])
		r.parts = remaining
	}
}

func (r *ReplayBuffer) Bytes() []byte {
	r.mu.Lock()
	defer r.mu.Unlock()
	joined := make([]byte, 0, r.size)
	for _, chunk := range r.parts {
		joined = append(joined, chunk...)
	}
	return joined
}

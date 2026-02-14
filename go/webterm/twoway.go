package webterm

import (
	"fmt"
	"sync"
)

type TwoWayMap[K comparable, V comparable] struct {
	mu      sync.RWMutex
	forward map[K]V
	reverse map[V]K
}

func NewTwoWayMap[K comparable, V comparable]() *TwoWayMap[K, V] {
	return &TwoWayMap[K, V]{
		forward: map[K]V{},
		reverse: map[V]K{},
	}
}

func (m *TwoWayMap[K, V]) Set(key K, value V) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if old, ok := m.forward[key]; ok && old != value {
		delete(m.reverse, old)
	}
	if existingKey, ok := m.reverse[value]; ok && existingKey != key {
		return fmt.Errorf("value already mapped")
	}
	m.forward[key] = value
	m.reverse[value] = key
	return nil
}

func (m *TwoWayMap[K, V]) DeleteKey(key K) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if value, ok := m.forward[key]; ok {
		delete(m.forward, key)
		delete(m.reverse, value)
	}
}

func (m *TwoWayMap[K, V]) Get(key K) (V, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	v, ok := m.forward[key]
	return v, ok
}

func (m *TwoWayMap[K, V]) GetKey(value V) (K, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	k, ok := m.reverse[value]
	return k, ok
}

func (m *TwoWayMap[K, V]) Keys() []K {
	m.mu.RLock()
	defer m.mu.RUnlock()
	keys := make([]K, 0, len(m.forward))
	for key := range m.forward {
		keys = append(keys, key)
	}
	return keys
}

// UnsafeForward returns the forward map directly. Caller must hold external synchronization.
func (m *TwoWayMap[K, V]) UnsafeForward() map[K]V {
	return m.forward
}

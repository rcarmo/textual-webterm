package webterm

import (
	"crypto/rand"
)

const (
	identityAlphabet = "0123456789ABCDEFGHJKMNPQRSTUVWYZ"
	identitySize     = 12
)

func GenerateID(size int) string {
	if size <= 0 {
		size = identitySize
	}
	const alphabetLen = len(identityAlphabet) // 31
	// Largest multiple of 31 that fits in a byte: 31*8 = 248
	const maxUnbiased = alphabetLen * (256 / alphabetLen) // 248
	out := make([]byte, size)
	buf := make([]byte, size+16) // extra bytes for rejection sampling
	filled := 0
	for filled < size {
		_, _ = rand.Read(buf)
		for _, b := range buf {
			if int(b) >= maxUnbiased {
				continue // reject to avoid modulo bias
			}
			out[filled] = identityAlphabet[int(b)%alphabetLen]
			filled++
			if filled >= size {
				break
			}
		}
	}
	return string(out)
}

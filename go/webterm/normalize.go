package webterm

import (
	"bytes"
	"regexp"
)

var (
	daResponsePattern = regexp.MustCompile(`\x1b\[[?>=][\d;]*c`)
	daPartialPattern  = regexp.MustCompile(`\x1b(?:\[(?:[?>=][\d;]*)?)?$`)
)

func NormalizeC1Controls(data []byte, utf8Buffer []byte) ([]byte, []byte) {
	if len(data) == 0 && len(utf8Buffer) == 0 {
		return nil, nil
	}
	merged := append(append([]byte{}, utf8Buffer...), data...)
	out := make([]byte, 0, len(merged))
	pending := make([]byte, 0, 4)
	expectedContinuations := 0

	c1Map := map[byte][]byte{
		0x9B: []byte("\x1b["),
		0x9D: []byte("\x1b]"),
		0x9C: []byte("\x1b\\"),
		0x90: []byte("\x1bP"),
		0x98: []byte("\x1bX"),
		0x9E: []byte("\x1b^"),
		0x9F: []byte("\x1b_"),
	}

	for i := 0; i < len(merged); {
		b := merged[i]
		if expectedContinuations > 0 {
			if b >= 0x80 && b <= 0xBF {
				pending = append(pending, b)
				expectedContinuations--
				i++
				if expectedContinuations == 0 {
					out = append(out, pending...)
					pending = pending[:0]
				}
				continue
			}
			out = append(out, pending...)
			pending = pending[:0]
			expectedContinuations = 0
			continue
		}
		switch {
		case b >= 0xC2 && b <= 0xDF:
			pending = append(pending, b)
			expectedContinuations = 1
			i++
			continue
		case b >= 0xE0 && b <= 0xEF:
			pending = append(pending, b)
			expectedContinuations = 2
			i++
			continue
		case b >= 0xF0 && b <= 0xF4:
			pending = append(pending, b)
			expectedContinuations = 3
			i++
			continue
		}
		if replacement, ok := c1Map[b]; ok {
			out = append(out, replacement...)
		} else {
			out = append(out, b)
		}
		i++
	}
	if len(pending) > 0 {
		return out, pending
	}
	return out, nil
}

func FilterDASequences(data []byte, escapeBuffer []byte) ([]byte, []byte) {
	merged := append(append([]byte{}, escapeBuffer...), data...)
	if len(merged) == 0 {
		return nil, nil
	}
	filtered := daResponsePattern.ReplaceAll(merged, nil)
	if len(filtered) == 0 {
		return nil, nil
	}
	match := daPartialPattern.FindIndex(filtered)
	if match == nil {
		return filtered, nil
	}
	if match[0] == len(filtered)-1 || bytes.HasPrefix(filtered[match[0]:], []byte("\x1b[")) || bytes.Equal(filtered[match[0]:], []byte("\x1b")) {
		return filtered[:match[0]], filtered[match[0]:]
	}
	return filtered, nil
}

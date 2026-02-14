package webterm

import "testing"

func TestNormalizeC1Controls(t *testing.T) {
	input := []byte{0x9B, '3', '1', 'm', 'A'}
	normalized, pending := NormalizeC1Controls(input, nil)
	if string(pending) != "" {
		t.Fatalf("expected no pending bytes, got %q", string(pending))
	}
	if string(normalized) != "\x1b[31mA" {
		t.Fatalf("unexpected normalized output: %q", string(normalized))
	}
}

func TestNormalizeC1ControlsPreservesSplitUTF8(t *testing.T) {
	first := []byte{0xC3}
	normalized, pending := NormalizeC1Controls(first, nil)
	if len(normalized) != 0 {
		t.Fatalf("expected no output for incomplete utf8")
	}
	second, pending2 := NormalizeC1Controls([]byte{0xA9}, pending)
	if len(pending2) != 0 {
		t.Fatalf("expected no pending bytes after completion")
	}
	if string(second) != "é" {
		t.Fatalf("unexpected utf8 output: %q", string(second))
	}
}

func TestFilterDASequencesCompleteAndPartial(t *testing.T) {
	data := []byte("a\x1b[?1;10;0cb")
	filtered, buffer := FilterDASequences(data, nil)
	if string(buffer) != "" {
		t.Fatalf("expected empty buffer, got %q", string(buffer))
	}
	if string(filtered) != "ab" {
		t.Fatalf("unexpected filtered output: %q", string(filtered))
	}

	part1, partBuffer := FilterDASequences([]byte("x\x1b[?1;10"), nil)
	if string(part1) != "x" {
		t.Fatalf("unexpected part1 output: %q", string(part1))
	}
	if string(partBuffer) == "" {
		t.Fatalf("expected buffered partial sequence")
	}
	part2, partBuffer2 := FilterDASequences([]byte(";0cy"), partBuffer)
	if string(partBuffer2) != "" {
		t.Fatalf("expected empty buffer after completion")
	}
	if string(part2) != "y" {
		t.Fatalf("unexpected part2 output: %q", string(part2))
	}
}

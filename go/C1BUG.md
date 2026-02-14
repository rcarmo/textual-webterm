# Bug: ByteStream in UTF-8 mode permanently stalls on C1 control bytes

## Summary

`ByteStream.Feed()` in UTF-8 mode (the default) permanently stalls when it encounters a raw C1 control byte (0x80–0x9F). The invalid byte remains in the internal buffer and blocks all subsequent input from being processed, effectively freezing the terminal emulator. The buffer also grows without bound as new data is appended but never consumed.

This is despite `Stream.handleGround()` having correct and complete C1 handling at the rune level.

## Affected code

`pkg/te/byte_stream.go`, lines 17–29:

```go
func (st *ByteStream) Feed(data []byte) error {
    if st.useUTF8 {
        st.buffer = append(st.buffer, data...)
        var out []rune
        for len(st.buffer) > 0 {
            r, size := utf8.DecodeRune(st.buffer)
            if r == utf8.RuneError && size == 1 {
                break    // ← BUG: stops forever, bad byte stays in buffer
            }
            st.buffer = st.buffer[size:]
            out = append(out, r)
        }
        return st.Stream.Feed(string(out))
    }
    // ...non-UTF8 path works correctly...
}
```

## Root cause

Bytes in the range 0x80–0xBF are not valid UTF-8 lead bytes. When `utf8.DecodeRune()` encounters one, it returns `(RuneError, 1)`. The current code responds by **breaking out of the loop** without consuming the byte. On the next call to `Feed()`, new data is appended to the buffer, but the loop immediately hits the same stalled byte and breaks again.

This creates two problems:

1. **Permanent parser stall** — no further input is ever processed.
2. **Unbounded memory growth** — every `Feed()` call appends to the buffer but nothing is ever consumed.

## Why C1 bytes appear in real terminal output

C1 control codes (0x80–0x9F) are part of the ISO/IEC 6429 (ECMA-48) standard and are actively used by:

- **tmux** — sends `0x9B` (CSI) instead of `ESC [` in certain configurations
- **screen** — similarly uses 8-bit C1 controls
- **Some SSH servers** — may emit C1 codes depending on locale/terminfo
- **Legacy applications** — programs that assume 8-bit terminal support

The `Stream.handleGround()` function already handles these correctly:

```go
case '\x9b':  st.state = stateCSI;  st.resetCSI()    // CSI
case '\x9d':  st.state = stateOSC;  st.current = ""   // OSC
case '\x90':  st.state = stateDCS;  st.dcsData = ""    // DCS
case '\x98':  st.state = stateSOS                      // SOS
case '\x9e':  st.state = statePM                       // PM
case '\x9f':  st.state = stateAPC                      // APC
case '\x9a':  st.listener.ReportDeviceAttributes(...)  // DECID
case '\x84':  st.listener.Index()                      // IND
case '\x85':  st.listener.LineFeed(); ...CarriageReturn // NEL
case '\x88':  st.listener.SetTabStop()                 // HTS
case '\x8d':  st.listener.ReverseIndex()               // RI
case '\x96':  st.listener.StartProtectedArea()         // SPA
case '\x97':  st.listener.EndProtectedArea()           // EPA
```

The bug is only in the byte-to-rune conversion layer (`ByteStream`), not in the parser itself.

## Reproduction

```go
package main

import (
    "fmt"
    "github.com/rcarmo/go-te/pkg/te"
)

func main() {
    screen := te.NewDiffScreen(20, 3)
    stream := te.NewByteStream(screen, false)

    // 0x9B is C1 CSI — equivalent to ESC [
    // This should render "A" in red (SGR 31)
    stream.Feed([]byte{0x9B, '3', '1', 'm', 'A'})
    fmt.Printf("Cell[0][0]: %q\n", screen.Buffer[0][0].Data)
    // Got: " " (empty) — the 0x9B stalled the parser

    // All subsequent input is silently dropped
    stream.Feed([]byte("Hello World"))
    fmt.Printf("Cell[0][0]: %q\n", screen.Buffer[0][0].Data)
    // Got: " " (still empty) — parser is permanently frozen

    // Prove that Stream (rune-level) handles it correctly
    screen2 := te.NewDiffScreen(20, 3)
    stream2 := te.NewStream(screen2, false)
    stream2.Feed(string([]rune{0x9B, '3', '1', 'm', 'A'}))
    fmt.Printf("Stream cell: %q fg=%s\n",
        screen2.Buffer[0][0].Data,
        screen2.Buffer[0][0].Attr.Fg.Name)
    // Got: "A" fg=red — works perfectly at rune level
}
```

Output:
```
Cell[0][0]: " "
Cell[0][0]: " "
Stream cell: "A" fg=red
```

## Suggested fix

When `DecodeRune` returns `RuneError`, treat the byte as a Latin-1 code point (i.e., `rune(st.buffer[0])`) and advance by one byte. This passes the raw value to `Stream.handleGround()` where the existing C1 switch cases handle it correctly.

```go
func (st *ByteStream) Feed(data []byte) error {
    if st.useUTF8 {
        st.buffer = append(st.buffer, data...)
        var out []rune
        for len(st.buffer) > 0 {
            r, size := utf8.DecodeRune(st.buffer)
            if r == utf8.RuneError && size == 1 {
                // Treat invalid UTF-8 byte as Latin-1 code point.
                // This allows C1 controls (0x80-0x9F) to reach
                // Stream.handleGround() where they are handled correctly.
                out = append(out, rune(st.buffer[0]))
                st.buffer = st.buffer[1:]
                continue
            }
            st.buffer = st.buffer[size:]
            out = append(out, r)
        }
        return st.Stream.Feed(string(out))
    }
    out := make([]rune, len(data))
    for i, b := range data {
        out[i] = rune(b)
    }
    return st.Stream.Feed(string(out))
}
```

This matches the behavior of the non-UTF8 code path (line 31–34) which already does `rune(b)` for each byte, and is consistent with how real terminal emulators (xterm, VTE, etc.) handle C1 bytes in UTF-8 mode.

## Impact

Any application using `ByteStream` (the standard way to feed raw PTY output to go-te) will silently freeze if the child process or terminal multiplexer emits a single C1 control byte. The workaround is to pre-process all input with a C1→7-bit normalizer before calling `Feed()`, which is what we do in the webterm Go port via `NormalizeC1Controls()`.

## Affected C1 bytes

| Byte | Name | Stream handler |
|------|------|----------------|
| 0x84 | IND (Index) | `listener.Index()` |
| 0x85 | NEL (Next Line) | `listener.LineFeed()` + `CarriageReturn()` |
| 0x88 | HTS (Horizontal Tab Set) | `listener.SetTabStop()` |
| 0x8D | RI (Reverse Index) | `listener.ReverseIndex()` |
| 0x90 | DCS (Device Control String) | enters DCS state |
| 0x96 | SPA (Start Protected Area) | `listener.StartProtectedArea()` |
| 0x97 | EPA (End Protected Area) | `listener.EndProtectedArea()` |
| 0x98 | SOS (Start of String) | enters SOS state |
| 0x9A | DECID | `listener.ReportDeviceAttributes()` |
| 0x9B | CSI (Control Sequence Introducer) | enters CSI state |
| 0x9D | OSC (Operating System Command) | enters OSC state |
| 0x9E | PM (Privacy Message) | enters PM state |
| 0x9F | APC (Application Program Command) | enters APC state |

All 13 of these are unreachable via `ByteStream` in UTF-8 mode despite having working handlers in `Stream`.

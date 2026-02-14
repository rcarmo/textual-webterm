# Screenshot Debugging Skill

## Purpose
Diagnose terminal screenshot corruption caused by incomplete terminal-state updates.

## When to Use
- SVG screenshots show stale or overlaid text.
- Live WebSocket output looks correct but `/screenshot.svg` does not.
- Issues appear with full-screen TUIs (tmux/vim/less).

## Procedure
1. **Capture terminal bytes**
   - Capture PTY output around the failing action.
2. **Replay into the Go tracker**
   - Feed bytes through `internal/terminalstate` (go-te based).
   - Confirm whether buffer state diverges from expected terminal behavior.
3. **Check preprocessing/filtering**
   - Validate DA filtering and any partial-sequence buffering logic.
4. **Check dirty/refresh logic**
   - Verify tracker updates happen before screenshot cache decisions.
5. **Add regression coverage**
   - Add a focused Go test and (when useful) fuzz corpus seed.
6. **Verify**
   - Run `make check` and re-test the real scenario.

## Notes
- Prefer reproductions from real PTY captures over synthetic minimal sequences.
- If rendering differs only in dashboard thumbnails, inspect SSE activity gating and screenshot cache TTL/invalidations.

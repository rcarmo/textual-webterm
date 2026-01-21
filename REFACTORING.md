# Refactoring & Audit Checklist

## Tooling
- [x] Makefile restored (install, lint, format, test, coverage, check)
- [x] Coverage gate at fail_under=80 (current ~88%)

## Dead Code Removal
- [x] Removed packets/environment protocol code
- [x] Removed unused Account model
- [x] Removed retry.py and related tests

## LocalServer / Protocol
- [x] JSON WS protocol enforced (stdin/resize/ping/pong)
- [x] Static assets delegated to textual-serve
- [x] /screenshot.svg renders replay buffer to SVG
- [x] Disconnect triggers resize to 132x45
- [ ] Narrow WebSocket error handling (avoid bare Exception)
- [ ] Consider TaskGroup/cleanup context for aiohttp runner

## Sessions
- [x] Session.is_running() added
- [x] AppSession double JSON parse fixed; payload capped (16MB)
- [x] TerminalSession replay buffer; resize on disconnect
- [ ] TerminalSession set_terminal_size is blocking; consider run_in_executor

## Poller
- [x] OSError-only read handling; write error handling added
- [x] TwoWayDict enforces 1:1 mapping (raises on duplicate value)

## CLI / Config
- [x] File-path detection helper deduped
- [x] Config uses tomllib (py311+)

## Tests
- [x] 135 tests passing; coverage ~88%

## Remaining Ideas (Low Priority)
- [ ] Consolidate WS dispatch table
- [ ] Simplify _get_ws_url_from_request
- [ ] Normalize logging style (f-string vs %%)

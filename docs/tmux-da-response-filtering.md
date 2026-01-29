# Fix for "1;10;0c" Display Issue in tmux

## Problem
When entering or refreshing a webterm session running tmux, the text "1;10;0c" 
appears on the screen. This is a terminal Device Attributes (DA) response that 
should be filtered out.

## Root Cause
1. **Tmux sends a DA2 query** (`ESC[>c`) when it initializes to detect terminal capabilities
2. The terminal responds with `ESC[>1;10;0c` (DA2 response format)
3. The filtering code only handled DA1 responses (`ESC[?...c`) but **not DA2** (`ESC[>...c`)
4. The unfiltered DA2 response appeared as visible text "1;10;0c" in the replay buffer

## Solution
Updated the DA response filtering patterns in three files to handle all DA variants:

- **DA1** (Primary): `ESC[?...c` - already handled ✓
- **DA2** (Secondary): `ESC[>...c` - **NOW FIXED** ✓  
- **DA3** (Tertiary): `ESC[=...c` - added for completeness ✓

### Changed Files
1. `src/webterm/terminal_session.py`
2. `src/webterm/docker_exec_session.py`
3. `src/webterm/local_server.py`

### Pattern Changes
**Before:**
```python
DA_RESPONSE_PATTERN = re.compile(rb"\x1b\[\?[\d;]+c")
DA_PARTIAL_PATTERN = re.compile(rb"\x1b(?:\[(?:\?[\d;]*)?)?$")
```

**After:**
```python
DA_RESPONSE_PATTERN = re.compile(rb"\x1b\[[?>=][\d;]*c")
DA_PARTIAL_PATTERN = re.compile(rb"\x1b(?:\[(?:[?>=][\d;]*)?)?$")
```

## Testing
- All 342 existing tests pass ✓
- Verified the pattern matches DA1, DA2, and DA3 responses ✓
- Confirmed partial buffering works for all variants ✓

## Technical Details
Device Attributes queries/responses:
- **DA1**: `ESC[c` → `ESC[?1;10;0c` (terminal capabilities)
- **DA2**: `ESC[>c` → `ESC[>1;10;0c` (terminal version - **sent by tmux**)
- **DA3**: `ESC[=c` → `ESC[=1;0c` (rarely used)

The fix ensures all three variants are filtered from both live output and 
replay buffers when clients reconnect.

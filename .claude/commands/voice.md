# /voice — Toggle voice announcement hook

Toggle the macOS native voice announcement that plays when the agent finishes.
Uses `say` (macOS TTS) — no API key needed, works offline, zero latency.

## Usage

```
/voice          → show status (default)
/voice status   → show status
/voice on       → enable voice announcements
/voice off      → silence voice announcements
```

The toggle is instant — it writes/removes a flag file that the Stop hook checks
before doing anything. No session restart required.

## Mechanism

Flag file: `~/.ultrathink/voice-disabled` (presence = silenced)
Hook: `.claude/hooks/voice-announce.sh` exits early if the flag exists.
TTS: macOS `say -v Samantha -r 180` (native, no network needed)

## Steps

### 1. Parse argument

Read `$ARGUMENTS`. Accept: `on`, `off`, `status`, or empty (= status).
Anything else → print usage and stop.

### 2. Run the toggle

```bash
set -eo pipefail
ARG="${ARGUMENTS:-status}"
FLAG="$HOME/.ultrathink/voice-disabled"
mkdir -p "$HOME/.ultrathink"

case "$ARG" in
  on)
    if [[ -f "$FLAG" ]]; then
      rm -f "$FLAG"
      echo "[voice] ON — announcements enabled (macOS say)"
    else
      echo "[voice] already ON"
    fi
    ;;
  off)
    if [[ ! -f "$FLAG" ]]; then
      touch "$FLAG"
      echo "[voice] OFF — announcements silenced"
    else
      echo "[voice] already OFF"
    fi
    ;;
  status|"")
    if [[ -f "$FLAG" ]]; then
      echo "[voice] OFF  (flag: $FLAG)"
    else
      echo "[voice] ON   (no flag file)"
    fi
    if command -v say &>/dev/null; then
      echo "[voice] tts: macOS say (ready)"
    else
      echo "[voice] tts: say command not found (macOS only)"
    fi
    ;;
  *)
    echo "Usage: /voice [on|off|status]"
    exit 1
    ;;
esac
```

### 3. Report

Print the single-line result from the bash block. Do not add commentary.

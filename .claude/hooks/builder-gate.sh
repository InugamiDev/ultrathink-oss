#!/usr/bin/env bash
# intent: utility script sourced by Builder hooks to check session token validity
# status: done
# confidence: high
# usage: source "$(dirname "$0")/builder-gate.sh" && builder_check || exit 0

TOKEN_FILE="/tmp/ultrathink-builder-token-$USER"

builder_check() {
  # No token file → not a builder
  if [ ! -f "$TOKEN_FILE" ]; then
    return 1
  fi

  # Read expiry
  local expires_at
  expires_at=$(jq -r '.expires_at // ""' "$TOKEN_FILE" 2>/dev/null || echo "")

  if [ -z "$expires_at" ]; then
    return 1
  fi

  # Compare timestamps — convert to epoch seconds
  local expires_epoch now_epoch

  # macOS date vs GNU date
  if date -jf "%Y-%m-%dT%H:%M:%SZ" "$expires_at" +%s >/dev/null 2>&1; then
    expires_epoch=$(date -jf "%Y-%m-%dT%H:%M:%SZ" "$expires_at" +%s 2>/dev/null || echo "0")
  else
    expires_epoch=$(date -d "$expires_at" +%s 2>/dev/null || echo "0")
  fi

  now_epoch=$(date +%s)

  if [ "$expires_epoch" -gt "$now_epoch" ] 2>/dev/null; then
    return 0
  else
    return 1
  fi
}

#!/usr/bin/env bash
# intent: SessionStart hook — validate builder key against API, write session token
# status: done
# confidence: high
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
CONFIG_FILE="$HOME/.ultrathink/config.json"
TOKEN_FILE="/tmp/ultrathink-builder-token-$USER"
API_URL="${ULTRATHINK_API_URL:-http://localhost:3333}"

# ─── Guard: OSS users skip silently ──────────────────────────────────────────
if [ ! -f "$CONFIG_FILE" ]; then
  exit 0
fi

TIER=$(jq -r '.tier // ""' "$CONFIG_FILE" 2>/dev/null || echo "")
BUILDER_KEY=$(jq -r '.builder_key // ""' "$CONFIG_FILE" 2>/dev/null || echo "")

if [ "$TIER" != "builder" ] || [ -z "$BUILDER_KEY" ]; then
  exit 0
fi

# ─── Validate key against API ─────────────────────────────────────────────────
response=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"key\": \"$BUILDER_KEY\"}" \
  "$API_URL/api/builder/validate" 2>/dev/null) || {
  # API unreachable — remove stale token, warn
  rm -f "$TOKEN_FILE"
  cat <<'WARN'
{"additionalContext":"Builder API unreachable. Running in OSS mode."}
WARN
  exit 0
}

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

valid=$(echo "$body" | jq -r '.valid // false' 2>/dev/null || echo "false")

if [ "$http_code" = "200" ] && [ "$valid" = "true" ]; then
  # Extract validated_at and expires_at from API response
  validated_at=$(echo "$body" | jq -r '.validated_at // ""' 2>/dev/null || echo "")
  expires_at=$(echo "$body" | jq -r '.expires_at // ""' 2>/dev/null || echo "")

  # Fallback: generate timestamps locally if API didn't return them
  if [ -z "$validated_at" ]; then
    validated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  fi
  if [ -z "$expires_at" ]; then
    # +24h: macOS and GNU date differ
    if date -v+24H >/dev/null 2>&1; then
      expires_at=$(date -u -v+24H +%Y-%m-%dT%H:%M:%SZ)
    else
      expires_at=$(date -u -d '+24 hours' +%Y-%m-%dT%H:%M:%SZ)
    fi
  fi

  # Write token with restrictive permissions
  (
    umask 077
    cat > "$TOKEN_FILE" <<TOKEN
{"valid":true,"key":"$BUILDER_KEY","validated_at":"$validated_at","expires_at":"$expires_at"}
TOKEN
  )
else
  # Invalid or expired — clean up and warn
  rm -f "$TOKEN_FILE"
  cat <<'WARN'
{"additionalContext":"Builder key invalid or expired. Running in OSS mode."}
WARN
fi

exit 0

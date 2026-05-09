#!/usr/bin/env bash
# UltraThink Builder Upgrade — requires activation key
# intent: Key-gated upgrade script for Builder tier
# status: done
# next: Replace placeholder package delivery with real download
# confidence: high
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── Config ───────────────────────────────────────────────────────────────────
API_URL="${ULTRATHINK_API_URL:-http://localhost:3333}"
CONFIG_DIR="$HOME/.ultrathink"
CONFIG_FILE="$CONFIG_DIR/config.json"
CAMPAIGN_URL="https://ultrathink.dev/builder-campaign"

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()    { printf "${YELLOW}[info]${RESET}  %s\n" "$1"; }
success() { printf "${GREEN}[ok]${RESET}    %s\n" "$1"; }
error()   { printf "${RED}[error]${RESET} %s\n" "$1"; }
step()    { printf "${CYAN}[step]${RESET}  %s\n" "$1"; }

die() {
  error "$1"
  if [ "${2:-}" = "campaign" ]; then
    echo ""
    info "Apply for a Builder key at:"
    printf "  ${BOLD}%s${RESET}\n" "$CAMPAIGN_URL"
  fi
  exit 1
}

# ─── Dependency check ─────────────────────────────────────────────────────────
check_deps() {
  local missing=()

  if ! command -v curl &>/dev/null; then
    missing+=("curl")
  fi

  if ! command -v jq &>/dev/null; then
    missing+=("jq")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    error "Missing required tools: ${missing[*]}"
    echo ""
    info "Install them first:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
      info "  brew install ${missing[*]}"
    else
      info "  sudo apt-get install ${missing[*]}"
    fi
    exit 1
  fi
}

# ─── Parse key from args or prompt ───────────────────────────────────────────
get_key() {
  local key=""

  # Check for --key=XXX flag
  for arg in "$@"; do
    case "$arg" in
      --key=*)
        key="${arg#--key=}"
        ;;
    esac
  done

  # If no flag, prompt interactively
  if [ -z "$key" ]; then
    echo ""
    printf "${BOLD}Enter your Builder activation key:${RESET} "
    read -r key
  fi

  if [ -z "$key" ]; then
    die "No key provided." "campaign"
  fi

  echo "$key"
}

# ─── Validate key against API ────────────────────────────────────────────────
validate_key() {
  local key="$1"

  step "Validating your key..."

  local response
  local http_code

  # Make the API call, capture both body and HTTP status
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"key\": \"$key\"}" \
    "$API_URL/api/builder/validate" 2>/dev/null) || {
    die "Could not reach the UltraThink API at $API_URL. Check your connection and try again."
  }

  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  case "$http_code" in
    200)
      success "Key validated."
      echo "$body"
      ;;
    401|403)
      local msg
      msg=$(echo "$body" | jq -r '.error // "Invalid or expired key."' 2>/dev/null || echo "Invalid or expired key.")
      die "$msg" "campaign"
      ;;
    404)
      die "Validation endpoint not found. Make sure you're running the latest UltraThink dashboard."
      ;;
    *)
      die "Unexpected response from API (HTTP $http_code). Try again later."
      ;;
  esac
}

# ─── Write config ────────────────────────────────────────────────────────────
write_config() {
  local key="$1"
  local tier="builder"

  step "Updating configuration..."

  mkdir -p "$CONFIG_DIR"

  # If config exists, merge; otherwise create fresh
  if [ -f "$CONFIG_FILE" ]; then
    local tmp
    tmp=$(jq \
      --arg key "$key" \
      --arg bkey "$key" \
      --arg tier "$tier" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '. + {key: $key, builder_key: $bkey, tier: $tier, upgradedAt: $ts}' \
      "$CONFIG_FILE" 2>/dev/null) || {
      # jq failed — file might be malformed, overwrite
      tmp=""
    }

    if [ -n "$tmp" ]; then
      echo "$tmp" > "$CONFIG_FILE"
    else
      write_fresh_config "$key" "$tier"
    fi
  else
    write_fresh_config "$key" "$tier"
  fi

  success "Config saved to $CONFIG_FILE"
}

write_fresh_config() {
  local key="$1"
  local tier="$2"

  cat > "$CONFIG_FILE" <<CONF
{
  "key": "$key",
  "builder_key": "$key",
  "tier": "$tier",
  "upgradedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
CONF
}

# ─── Main ────────────────────────────────────────────────────────────────────
main() {
  echo ""
  printf "${BOLD}${CYAN}UltraThink Builder Upgrade${RESET}\n"
  echo "─────────────────────────────"
  echo ""

  check_deps

  local key
  key=$(get_key "$@")

  validate_key "$key" >/dev/null

  write_config "$key"

  # Placeholder: actual package delivery will be added here
  echo ""
  printf "${GREEN}${BOLD}Builder features unlocked!${RESET}\n"
  echo ""
  info "Tier: Builder"
  info "Config: $CONFIG_FILE"
  info "Your key will be validated at each session start."
  echo ""
  success "You're all set. Restart your Claude session to use Builder features."
  echo ""
}

main "$@"

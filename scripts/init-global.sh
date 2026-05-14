#!/usr/bin/env bash
# intent: keep the legacy init-global entrypoint as a safe wrapper around install.sh
# status: done
# next: remove external docs that still mention init-global when old releases age out
# blockers: none
# confidence: high
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/install.sh" "$@"

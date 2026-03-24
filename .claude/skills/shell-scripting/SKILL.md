---
name: shell-scripting
description: Bash/Zsh script generation, debugging, POSIX compliance, and automation patterns
layer: utility
category: devtools
triggers:
  - "shell script"
  - "bash script"
  - "zsh script"
  - "write a script"
  - "automate with bash"
  - "cron job"
  - "makefile"
inputs:
  - task: What the script should accomplish
  - environment: Target shell (bash, zsh, sh/POSIX), OS (Linux, macOS)
  - constraints: Portability requirements, available tools, permissions
outputs:
  - script: Shell script with error handling and documentation
  - makefile: Makefile for project automation (if applicable)
  - cron_entry: Crontab entry for scheduled execution (if applicable)
  - test_commands: Commands to verify script behavior
linksTo:
  - linux-admin
  - docker
  - cicd
  - git-workflow
linkedFrom:
  - cook
  - ship
  - cicd
preferredNextSkills:
  - linux-admin
  - cicd
fallbackSkills:
  - debug
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - Scripts may modify filesystem
  - Scripts may install packages
  - Scripts may interact with external services
---

# Shell Scripting Skill

## Purpose

Generate robust, portable shell scripts for automation tasks. This skill covers Bash and Zsh scripting with proper error handling, argument parsing, logging, and POSIX compliance. Scripts produced by this skill are safe by default: they fail on errors, quote variables, and validate inputs.

## Key Concepts

### Script Header Template

Every script starts with this foundation:

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# -------------------------------------------------------------------
# Script: deploy.sh
# Description: Deploy application to production
# Usage: ./deploy.sh [--env production|staging] [--dry-run]
# -------------------------------------------------------------------

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
```

### Safety Flags Explained

```bash
set -e          # Exit immediately on any command failure
set -u          # Treat unset variables as errors
set -o pipefail # Pipe fails if ANY command in the pipeline fails
IFS=$'\n\t'     # Safer word splitting (no space splitting)

# Combined:
set -euo pipefail
```

### Variable Best Practices

```bash
# ALWAYS quote variables (prevents word splitting and globbing)
echo "$my_var"         # Good
echo $my_var           # Bad -- breaks on spaces and wildcards

# Use readonly for constants
readonly MAX_RETRIES=3
readonly CONFIG_DIR="/etc/myapp"

# Use local in functions
my_function() {
  local result=""
  local -r timeout=30  # local + readonly
  result=$(some_command)
  echo "$result"
}

# Default values
name="${1:-default_value}"
env="${DEPLOY_ENV:-production}"

# Required variables (fail if unset)
: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${API_KEY:?API_KEY must be set}"
```

## Patterns

### Argument Parsing

```bash
usage() {
  cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS]

Options:
  -e, --env ENV       Target environment (production|staging) [default: staging]
  -d, --dry-run       Show what would be done without executing
  -v, --verbose        Enable verbose output
  -h, --help           Show this help message

Examples:
  $SCRIPT_NAME --env production
  $SCRIPT_NAME --dry-run --verbose
EOF
}

# Defaults
env="staging"
dry_run=false
verbose=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env)
      env="$2"
      shift 2
      ;;
    -d|--dry-run)
      dry_run=true
      shift
      ;;
    -v|--verbose)
      verbose=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: Unknown option $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

# Validate
if [[ "$env" != "production" && "$env" != "staging" ]]; then
  echo "Error: --env must be 'production' or 'staging'" >&2
  exit 1
fi
```

### Logging Functions

```bash
readonly RED='\033[0;31m'
readonly YELLOW='\033[0;33m'
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*" >&2; }
log_fatal() { log_error "$@"; exit 1; }
```

### Cleanup Traps

```bash
cleanup() {
  local exit_code=$?
  log_info "Cleaning up..."
  [[ -f "$tmp_file" ]] && rm -f "$tmp_file"
  [[ -n "${original_branch:-}" ]] && git checkout "$original_branch" 2>/dev/null
  exit "$exit_code"
}

trap cleanup EXIT ERR INT TERM

# Now create temp files safely
tmp_file="$(mktemp)"
```

### Retry Logic

```bash
retry() {
  local max_attempts="${1:?}"
  local delay="${2:?}"
  shift 2
  local attempt=1

  until "$@"; do
    if (( attempt >= max_attempts )); then
      log_error "Command failed after $max_attempts attempts: $*"
      return 1
    fi
    log_warn "Attempt $attempt/$max_attempts failed. Retrying in ${delay}s..."
    sleep "$delay"
    (( attempt++ ))
    (( delay *= 2 ))  # Exponential backoff
  done
}

# Usage
retry 3 2 curl -sf "https://api.example.com/health"
```

### Parallel Execution

```bash
pids=()
for server in "${servers[@]}"; do
  deploy_to_server "$server" &
  pids+=($!)
done

failures=0
for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    (( failures++ ))
  fi
done

if (( failures > 0 )); then
  log_error "$failures deployments failed"
  exit 1
fi
```

### Interactive Confirmation

```bash
confirm() {
  local prompt="${1:-Are you sure?}"
  local response
  if [[ "${FORCE:-false}" == "true" ]]; then return 0; fi
  read -rp "$prompt [y/N] " response
  case "$response" in
    [yY][eE][sS]|[yY]) return 0 ;;
    *) return 1 ;;
  esac
}

if confirm "Deploy to production?"; then
  deploy
else
  log_info "Deployment cancelled"
  exit 0
fi
```

## Makefile Patterns

```makefile
.PHONY: dev build test lint clean deploy
.DEFAULT_GOAL := help

NODE_ENV ?= development
PORT ?= 3000

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development server
	NODE_ENV=development npm run dev

build: ## Build for production
	NODE_ENV=production npm run build

test: ## Run test suite
	npm test

lint: ## Run linter
	npm run lint

clean: ## Remove build artifacts
	rm -rf .next node_modules/.cache

deploy: build test ## Deploy (builds and tests first)
	./scripts/deploy.sh --env production
```

## Best Practices

1. **Always use `set -euo pipefail`** -- catches 90% of script bugs automatically
2. **Always quote variables** -- `"$var"` not `$var` to prevent word splitting
3. **Use `[[ ]]` not `[ ]`** -- double brackets are safer and more featureful in Bash
4. **Use `$(command)` not backticks** -- backticks do not nest and are harder to read
5. **Validate inputs early** -- check required arguments and environment variables before doing work
6. **Use `trap` for cleanup** -- temporary files and state changes must be cleaned up on exit
7. **Write errors to stderr** -- `echo "Error" >&2` keeps stdout clean for piping
8. **Use `readonly` for constants** -- prevents accidental reassignment
9. **Use `local` in functions** -- prevents variable leakage to global scope
10. **ShellCheck everything** -- run `shellcheck script.sh` before committing

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Unquoted variables | Word splitting breaks on spaces | Always use `"$var"` |
| Missing `set -e` | Script continues after errors | Add `set -euo pipefail` |
| `cd` without error check | Operates in wrong directory | Use `cd dir \|\| exit 1` or `set -e` |
| Parsing `ls` output | Breaks on special chars in filenames | Use `find` or glob patterns |
| `cat file \| grep` | Useless use of cat | `grep pattern file` directly |
| No cleanup trap | Temp files left on failure | Add `trap cleanup EXIT` |
| Hardcoded paths | Breaks on different systems | Use `$(dirname "$0")` or `which` |
| Missing shebang | Script runs in wrong shell | Always start with `#!/usr/bin/env bash` |

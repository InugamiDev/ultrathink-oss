# /ut-setup — Install or Update UltraThink OSS

Detect the user's OS, verify prerequisites, and run the appropriate installer script.

Usage: `/ut-setup [flags]`

Supported flags (passed through to the installer):
- `--db=URL` — Neon Postgres connection string
- `--vault=PATH` — Obsidian vault location (default: ~/.ultrathink/vault)
- `--dry-run` — Print what would change without modifying anything
- `--uninstall` — Remove UltraThink from the system
- `--no-identity` — Skip adding UltraThink section to ~/.claude/CLAUDE.md
- `--yes` / `-y` — Auto-approve all prompts

## Steps

### 1. Detect the user's operating system

Run this to determine OS and architecture:
```bash
uname_out="$(uname -s 2>/dev/null || echo 'Unknown')"
case "$uname_out" in
  Linux*)
    if grep -qi microsoft /proc/version 2>/dev/null; then
      echo "OS=WSL"
    else
      echo "OS=Linux"
    fi
    ;;
  Darwin*)  echo "OS=macOS" ;;
  CYGWIN*|MINGW*|MSYS*) echo "OS=Windows-shell" ;;
  *)        echo "OS=Unknown ($uname_out)" ;;
esac
echo "ARCH=$(uname -m 2>/dev/null || echo 'unknown')"
```

If the command fails entirely (e.g., `uname` not found), assume Windows (PowerShell).

### 2. Check prerequisites

Run these checks and report results:

```bash
echo "--- Prerequisites ---"

# Node.js 18+
if command -v node &>/dev/null; then
  NODE_VER="$(node -v)"
  NODE_MAJOR="${NODE_VER#v}"
  NODE_MAJOR="${NODE_MAJOR%%.*}"
  if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
    echo "OK  node $NODE_VER"
  else
    echo "FAIL  node $NODE_VER (need 18+)"
  fi
else
  echo "FAIL  node not found"
fi

# git
if command -v git &>/dev/null; then
  echo "OK  git $(git --version | head -1)"
else
  echo "FAIL  git not found"
fi

# jq
if command -v jq &>/dev/null; then
  echo "OK  jq $(jq --version 2>&1 | head -1)"
else
  echo "WARN  jq not found (optional but recommended)"
fi
```

If any FAIL results appear, **stop** and tell the user what to install. Provide install commands:
- macOS: `brew install node git jq`
- Ubuntu/Debian: `sudo apt install -y nodejs git jq`
- WSL: same as Ubuntu
- Windows: `winget install OpenJS.NodeJS Git.Git jqlang.jq`

Do NOT proceed if Node.js < 18 or git is missing. jq is optional (warn only).

### 3. Locate the UltraThink OSS repo

The installer scripts are relative to this project. Determine the repo root:

```bash
# This command file lives at <repo>/.claude/commands/ut-setup.md
# The repo root is two levels up from .claude/commands/
REPO_ROOT="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")"/../.. 2>/dev/null && pwd)"
# Fallback: check common locations
for candidate in "." "$(pwd)" "$HOME/ultrathink-oss" "$HOME/Documents/ultrathink-oss"; do
  if [ -f "$candidate/scripts/install.sh" ]; then
    REPO_ROOT="$candidate"
    break
  fi
done
echo "REPO_ROOT=$REPO_ROOT"
ls "$REPO_ROOT/scripts/install.sh" 2>/dev/null && echo "Installer found" || echo "Installer NOT found"
```

If the installer is not found, tell the user to `cd` into the ultrathink-oss repo directory first, or clone it:
```
git clone https://github.com/InuVerse/ultrathink-oss.git
cd ultrathink-oss
```

### 4. Run the appropriate installer

Parse the user's flags from $ARGUMENTS. The raw user input after `/ut-setup` is available as flags.

**macOS / Linux / WSL:**
```bash
cd "$REPO_ROOT" && chmod +x scripts/install.sh && ./scripts/install.sh $FLAGS
```

Where `$FLAGS` are the user's flags passed through verbatim (e.g., `--db=postgresql://... --dry-run`).

**Windows (native PowerShell, not WSL):**
Tell the user to run in PowerShell:
```powershell
cd $REPO_ROOT
.\scripts\install.ps1 $FLAGS
```

Since Claude Code runs in a shell, if on Windows without WSL, execute:
```bash
powershell.exe -ExecutionPolicy Bypass -File "$REPO_ROOT/scripts/install.ps1" $FLAGS
```

### 5. Report the result

After the installer finishes, check the exit code and summarize:

**On success (exit 0):**
```
UltraThink installed successfully.

Installed to:
  ~/.claude/skills/     — skill definitions
  ~/.claude/hooks/      — tool hooks
  ~/.claude/references/ — reference docs
  ~/.ultrathink/        — data directory

Next steps:
  1. Restart Claude Code to load the new skills
  2. Run /ut-setup --dry-run to preview without changes (if they haven't already)
  3. Optionally connect a database: /ut-setup --db=postgresql://...
```

**On failure (non-zero exit):**
- Show the last 30 lines of output
- Identify the failing step from the installer's `[N/7]` step markers
- Suggest fixes based on common issues:
  - Permission denied → `chmod +x scripts/install.sh`
  - Node modules missing → `npm install` in the repo root
  - DB connection failed → verify the `--db=URL` string
  - Symlink errors → check if `~/.claude/skills/` already has conflicting files

### Error handling

If any step fails unexpectedly:
1. Show the error output
2. Do NOT retry automatically
3. Suggest the user run the installer manually: `./scripts/install.sh --help`

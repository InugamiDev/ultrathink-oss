# Install — Windows

UltraThink on Windows via WSL2 (full support) or native PowerShell (limited).

## Recommended: WSL2 (Full Support)

WSL2 gives you a full Linux environment. All UltraThink features work: hooks, skills, memory, statusline, dashboard, MCP servers.

### 1. Install WSL2

```powershell
# PowerShell (Admin)
wsl --install -d Ubuntu
# Restart your machine, then set up your Ubuntu user
```

### 2. Install prerequisites in WSL

```bash
# Inside WSL (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs jq curl git
node --version  # Should be 22.x+
```

### 3. Install your CLI agent

Pick one (or both):

```bash
# Claude Code
npm install -g @anthropic-ai/claude-code

# Codex CLI
npm install -g @openai/codex
```

### 4. Clone and install UltraThink

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
npm install
```

### 5. Run the installer

```bash
# Full install — links skills, hooks, references into ~/.claude/
./scripts/install.sh

# With database (recommended — enables memory + vault sync)
./scripts/install.sh --db="postgresql://user:pass@host/db"

# Preview what it does first
./scripts/install.sh --dry-run
```

### 6. Configure .env (if you didn't pass --db)

```bash
cp .env.example .env
nano .env
# Set DATABASE_URL to your Neon Postgres connection string
```

### 7. Codex-specific (optional)

```bash
mkdir -p ~/.codex
cp ~/ultrathink/.codex/config.toml ~/.codex/config.toml
cp ~/ultrathink/.codex/hooks.json ~/.codex/hooks.json
```

### 8. Verify

```bash
claude  # or codex
# UltraThink statusline should appear at the bottom
# Skills and memory should load automatically
```

### 9. Dashboard

```bash
cd ~/ultrathink
npm run dashboard:dev
```

Access from Windows browser at `http://localhost:3333` — WSL2 automatically forwards ports.

## Windows-Specific Notes

### File paths

WSL mounts Windows drives at `/mnt/c/`, `/mnt/d/`, etc.:

```bash
# Access Windows files from WSL
cd /mnt/c/Users/YourName/Projects/my-app
claude  # UltraThink works on Windows filesystem via WSL
```

For best performance, keep projects inside the WSL filesystem (`~/`) rather than on `/mnt/c/` — the cross-filesystem bridge is 10-50x slower.

### Git credential sharing

Share Git credentials between Windows and WSL:

```bash
# In WSL
git config --global credential.helper "/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager.exe"
```

### VS Code integration

VS Code's WSL extension works seamlessly:

1. Install [WSL extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl)
2. Open WSL terminal, navigate to project, run `code .`
3. Claude Code / Codex CLI runs in the integrated terminal with full UltraThink support

### Windows Terminal

For the best experience, use [Windows Terminal](https://aka.ms/terminal) with a WSL profile:
- Multiple tabs (WSL + PowerShell side by side)
- Proper Unicode rendering (required for UltraThink statusline glyphs)
- GPU-accelerated text rendering

### Notifications

Desktop notifications use `notify-send` which doesn't work natively on WSL. Options:

1. **Ignore** — notifications are non-critical, the dashboard shows everything
2. **wsl-notify-send** — forwards to Windows toast notifications:
   ```bash
   # Download from https://github.com/stuartleeks/wsl-notify-send
   sudo ln -sf /usr/local/bin/wsl-notify-send.exe /usr/local/bin/notify-send
   ```

## Alternative: Native Windows (PowerShell)

If you can't use WSL2, a subset of features works natively via the PowerShell installer.

### What works

- Dashboard (Next.js runs on Windows)
- Memory CLI commands (`npx tsx memory/scripts/memory-runner.ts`)
- Vault sync (`npx tsx scripts/vault-sync.ts`)
- Skill browsing (skills are copied, not symlinked)
- Database migrations

### What doesn't work

- Shell hooks (`.sh` scripts need bash)
- Auto-trigger (prompt-analyzer uses shell pipes)
- Statusline widget (bash-based)
- Privacy hook enforcement
- VFS MCP server (Go binary — needs separate Windows build)

### Native install

```powershell
# PowerShell
git clone https://github.com/InugamiDev/ultrathink-oss.git C:\ultrathink
cd C:\ultrathink
npm install

# Run the PowerShell installer
.\scripts\install.ps1

# With database
.\scripts\install.ps1 -DbUrl "postgresql://user:pass@host/db"

# Preview first
.\scripts\install.ps1 -DryRun
```

The installer copies skills and references into `~\.claude\`, creates `~\.ultrathink\` with config and vault templates, and runs a smoke test.

### Run migrations and dashboard

```powershell
# Database migrations (if using memory features)
npx tsx memory/src/migrate.ts

# Dashboard
npm run dashboard:dev
# Open http://localhost:3333
```

### Uninstall

```powershell
.\scripts\install.ps1 -Uninstall
```

For full UltraThink functionality, use WSL2. The native path is for dashboard access and manual memory/vault operations.

## Troubleshooting

### "Permission denied" on scripts (WSL)

```bash
chmod +x scripts/setup.sh scripts/install.sh scripts/init-global.sh
```

### WSL2 port forwarding not working

```powershell
# PowerShell (Admin)
netsh interface portproxy show v4tov4
# If empty, WSL2 should auto-forward. Try restarting:
wsl --shutdown
```

### Slow file I/O on /mnt/c/

Known WSL2 limitation. Keep projects in `~/` (Linux filesystem) for 10-50x faster I/O.

### Node.js version too old

```bash
# WSL/Linux
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

```powershell
# Windows — download from https://nodejs.org/ or:
winget install OpenJS.NodeJS.LTS
```

### PowerShell execution policy blocks install.ps1

```powershell
# Run once (Admin):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

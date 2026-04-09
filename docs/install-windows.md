# Install — Windows

UltraThink on Windows via WSL2 or native PowerShell (limited).

## Recommended: WSL2 (Full Support)

WSL2 gives you a full Linux environment. All UltraThink features work: hooks, skills, memory, dashboard, MCP servers.

### 1. Install WSL2

```powershell
# In PowerShell (Admin)
wsl --install -d Ubuntu
# Restart, then set up your Ubuntu user
```

### 2. Install Node.js in WSL

```bash
# Inside WSL (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
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

### 4. Install UltraThink

```bash
git clone https://github.com/InugamiDev/ultrathink-oss.git ~/ultrathink
cd ~/ultrathink
./scripts/setup.sh
./scripts/init-global.sh
```

### 5. Configure .env

```bash
cp .env.example .env
nano .env
# Set DATABASE_URL to your Neon Postgres connection string
```

### 6. Codex-specific (optional)

```bash
mkdir -p ~/.codex
cp ~/ultrathink/.codex/config.toml ~/.codex/config.toml
cp ~/ultrathink/.codex/hooks.json ~/.codex/hooks.json
```

### 7. Verify

```bash
claude  # or codex
# UltraThink statusline should appear (Claude Code)
# Skills and memory should load
```

### 8. Dashboard

```bash
cd ~/ultrathink
npm run dashboard:dev
```

Access from Windows browser at `http://localhost:3333` — WSL2 automatically forwards ports.

## Windows-Specific Notes

### File paths

WSL mounts your Windows drives at `/mnt/c/`, `/mnt/d/`, etc. When working on Windows files:

```bash
# Access Windows files from WSL
cd /mnt/c/Users/YourName/Projects/my-app
claude  # UltraThink works on Windows filesystem via WSL
```

For best performance, keep your projects inside the WSL filesystem (`~/`) rather than on `/mnt/c/`.

### Notifications

Desktop notifications use `notify-send` which doesn't work natively on WSL. Options:

1. **Ignore** — Notifications are non-critical, dashboard shows everything
2. **wsl-notify-send** — Drop-in replacement that forwards to Windows toast notifications:
   ```bash
   # Download from https://github.com/stuartleeks/wsl-notify-send
   # Place in /usr/local/bin/
   sudo ln -sf /usr/local/bin/wsl-notify-send.exe /usr/local/bin/notify-send
   ```

### Git credential sharing

Share Git credentials between Windows and WSL:

```bash
# In WSL
git config --global credential.helper "/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager.exe"
```

### VS Code integration

VS Code's WSL extension works seamlessly:

1. Install [Remote - WSL](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl) extension
2. Open WSL terminal, navigate to project, run `code .`
3. Claude Code / Codex CLI runs in the integrated terminal

### Windows Terminal

For the best experience, use [Windows Terminal](https://aka.ms/terminal) with a WSL profile. It supports:
- Multiple tabs (WSL + PowerShell side by side)
- Proper Unicode rendering (important for UltraThink statusline)
- GPU-accelerated text rendering

## Alternative: Native Windows (Limited)

If you can't use WSL2, some features work natively:

### What works

- Dashboard (Next.js runs on Windows)
- Memory CLI commands
- Vault sync
- Skill reading/browsing

### What doesn't work

- Shell hooks (`.sh` scripts need bash)
- Privacy hook enforcement
- Auto-trigger (prompt-analyzer.ts uses shell pipes)
- Statusline widget (macOS/Linux only)
- VFS MCP server (Go binary, needs separate Windows build)

### Native setup

```powershell
# PowerShell
git clone https://github.com/InugamiDev/ultrathink-oss.git C:\ultrathink
cd C:\ultrathink
npm install

# Copy .env
copy .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations
npx tsx memory/src/migrate.ts

# Dashboard only
npm run dashboard:dev
```

For full UltraThink functionality, use WSL2. The native path is only for dashboard access and manual memory queries.

## Troubleshooting

### "Permission denied" on setup.sh

```bash
chmod +x scripts/setup.sh scripts/init-global.sh
./scripts/setup.sh
```

### WSL2 port forwarding not working

```powershell
# PowerShell (Admin) — check if port 3333 is forwarded
netsh interface portproxy show v4tov4
# If empty, WSL2 should auto-forward. Try restarting WSL:
wsl --shutdown
```

### Slow file I/O on /mnt/c/

This is a known WSL2 limitation. Keep projects in `~/` (Linux filesystem) for 10-50x faster I/O.

### Node.js version too old

```bash
# Check version
node --version
# If <18, update:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

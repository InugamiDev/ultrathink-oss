#Requires -Version 5.1
# intent: UltraThink OSS installer for Windows — open source tier only
# status: done
# confidence: high

[CmdletBinding()]
param(
    [string]$Db = '',

    [string]$Vault = '',

    [switch]$Uninstall,

    [switch]$Update,

    [switch]$DryRun,

    [switch]$NoIdentity,

    [switch]$NoPull,

    [Alias('y')]
    [switch]$Yes,

    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$UltraRoot = Split-Path -Parent $ScriptDir
$ClaudeDir = Join-Path $env:USERPROFILE '.claude'
$UltraData = Join-Path $env:USERPROFILE '.ultrathink'
$Version = '3.0.0'
$Tier = 'oss'
$TierUpper = 'OSS'
$TotalSteps = 8

# ── OSS tier guard ──
if (Test-Path (Join-Path $UltraRoot 'scripts\upgrade-to-builder.sh')) {
    Write-Host '[ERROR] This is the Core repo - use the Core installer instead' -ForegroundColor Red
    exit 1
}

# ── Logging ──

function Log-Info  { param([string]$Msg) Write-Host "[INFO]  $Msg" -ForegroundColor Blue }
function Log-Ok    { param([string]$Msg) Write-Host "[OK]    $Msg" -ForegroundColor Green }
function Log-Warn  { param([string]$Msg) Write-Host "[WARN]  $Msg" -ForegroundColor Yellow }
function Log-Error { param([string]$Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red }
function Log-Step  { param([int]$N, [string]$Msg) Write-Host "`n[$N/$TotalSteps] $Msg" -ForegroundColor Cyan }
function Log-Dry   { param([string]$Msg) Write-Host "[DRY]   $Msg" -ForegroundColor Yellow }

# ── Help ──

if ($Help) {
    Write-Host @"

Usage: install.ps1 [OPTIONS]

Options:
  -Db URL           Neon Postgres connection string
  -Vault PATH       Obsidian vault location (default: ~\.ultrathink\vault)
  -NoIdentity       Skip adding UltraThink section to ~\.claude\CLAUDE.md
  -NoPull           Skip auto-pull even if git repo is behind
  -Yes (-y)         Auto-approve all prompts
  -DryRun           Print what would be changed without modifying anything
  -Update           Pull latest changes and re-install
  -Uninstall        Remove UltraThink from ~\.claude\ and ~\.ultrathink\
  -Help             Show this help

This is UltraThink OSS. For Core features (Tekio, Code Intelligence,
Agent Identity, Decision Engine), see: https://github.com/InugamiDev/ultrathink-core

"@
    exit 0
}

# ── Helpers ──

function Ensure-Dir {
    param([string[]]$Paths)
    foreach ($p in $Paths) {
        if ($DryRun) { Log-Dry "mkdir $p" }
        else { New-Item -ItemType Directory -Path $p -Force | Out-Null }
    }
}

function Make-Junction {
    param([string]$Target, [string]$Link)
    if ($DryRun) {
        Log-Dry "junction $Link -> $Target"
        return
    }
    if (Test-Path $Link) {
        $item = Get-Item $Link -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            Remove-Item $Link -Force
        } elseif ($item.PSIsContainer) {
            Rename-Item $Link "$Link.bak.$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
        } else {
            Remove-Item $Link -Force
        }
    }
    if (Test-Path $Target -PathType Container) {
        New-Item -ItemType Junction -Path $Link -Target $Target -Force | Out-Null
    } else {
        try {
            New-Item -ItemType SymbolicLink -Path $Link -Target $Target -Force | Out-Null
        } catch {
            Copy-Item $Target $Link -Force
        }
    }
}

function Remove-Link {
    param([string]$Path)
    if ($DryRun) { Log-Dry "remove $Path" }
    elseif (Test-Path $Path) { Remove-Item $Path -Force -Recurse }
}

# ── Set vault default ──

if (-not $Vault) { $Vault = Join-Path $UltraData 'vault' }

if ($DryRun) {
    Write-Host ''
    Log-Warn 'DRY RUN - no files will be modified'
}

# ════════════════════════════════════════════════════════════════════════════
# ── UNINSTALL ──
# ════════════════════════════════════════════════════════════════════════════

if ($Uninstall) {
    Write-Host ''
    Log-Info 'Uninstalling UltraThink OSS...'
    $Removed = @()

    # 1. Remove skill junctions
    $skillsDir = Join-Path $ClaudeDir 'skills'
    if (Test-Path $skillsDir) {
        Get-ChildItem $skillsDir -Directory | ForEach-Object {
            if ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                Remove-Link $_.FullName
                $Removed += "skill: $($_.Name)"
            }
        }
        $regLink = Join-Path $skillsDir '_registry.json'
        if (Test-Path $regLink) {
            Remove-Link $regLink
            $Removed += 'skills/_registry.json'
        }
    }

    # 2. Remove references + agents
    foreach ($name in @('references', 'agents')) {
        $link = Join-Path $ClaudeDir $name
        if (Test-Path $link) {
            Remove-Link $link
            $Removed += "$name/"
        }
    }

    # 3. Remove hook copies/links
    $hooksDir = Join-Path $ClaudeDir 'hooks'
    if (Test-Path $hooksDir) {
        Get-ChildItem $hooksDir -Filter 'ultrathink-*' | ForEach-Object {
            Remove-Link $_.FullName
            $Removed += "hook: $($_.Name)"
        }
    }

    # 4. Remove UltraThink section from CLAUDE.md
    $claudeMd = Join-Path $ClaudeDir 'CLAUDE.md'
    if ((Test-Path $claudeMd) -and (Select-String -Path $claudeMd -Pattern 'UltraThink Integration' -Quiet)) {
        if ($DryRun) {
            Log-Dry "would remove UltraThink section from $claudeMd"
        } else {
            $lines = Get-Content $claudeMd
            $out = @()
            $inBlock = $false
            $pendingSep = $false
            foreach ($line in $lines) {
                if ($line -eq '---' -and -not $inBlock) {
                    $pendingSep = $true
                    continue
                }
                if ($pendingSep) {
                    if ($line -match '^\s*$') { continue }
                    if ($line -match '^## UltraThink Integration') {
                        $inBlock = $true
                        $pendingSep = $false
                        continue
                    }
                    $out += '---'
                    $out += $line
                    $pendingSep = $false
                    continue
                }
                if ($inBlock) {
                    if ($line -match '^## ' -or $line -eq '---') {
                        $inBlock = $false
                        $out += $line
                    }
                    continue
                }
                $out += $line
            }
            $out | Set-Content $claudeMd -Encoding UTF8
        }
        $Removed += 'UltraThink section from CLAUDE.md'
    }

    # 5. Remove hooks from settings.json
    $settingsPath = Join-Path $ClaudeDir 'settings.json'
    if ((Test-Path $settingsPath) -and (Select-String -Path $settingsPath -Pattern 'ultrathink-' -Quiet)) {
        if ($DryRun) {
            Log-Dry "would remove UltraThink hooks from $settingsPath"
        } else {
            $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
            if ($settings.hooks) {
                $hookProps = $settings.hooks | Get-Member -MemberType NoteProperty
                foreach ($prop in $hookProps) {
                    $event = $prop.Name
                    $entries = @($settings.hooks.$event | Where-Object {
                        if ($_.id -and $_.id.StartsWith('ut:')) { return $false }
                        $cmds = @($_.hooks | ForEach-Object { $_.command })
                        return -not ($cmds | Where-Object { $_ -like '*ultrathink-*' })
                    })
                    if ($entries.Count -eq 0) {
                        $settings.hooks.PSObject.Properties.Remove($event)
                    } else {
                        $settings.hooks.$event = $entries
                    }
                }
                $remaining = $settings.hooks | Get-Member -MemberType NoteProperty
                if ($remaining.Count -eq 0) {
                    $settings.PSObject.Properties.Remove('hooks')
                }
            }
            $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
        }
        $Removed += 'UltraThink hooks from settings.json'
    }

    # 6. Remove ~/.ultrathink/
    if (Test-Path $UltraData) {
        if ($DryRun) {
            Log-Dry "would prompt to remove $UltraData"
        } elseif ($Yes) {
            Remove-Item $UltraData -Recurse -Force
            $Removed += '~\.ultrathink\ directory'
        } else {
            Write-Host ''
            $confirm = Read-Host "  Remove $UltraData (vault, config, decisions)? This is irreversible. [y/N]"
            if ($confirm -match '^[Yy]$') {
                Remove-Item $UltraData -Recurse -Force
                $Removed += '~\.ultrathink\ directory'
            } else {
                Log-Info 'Kept ~\.ultrathink\'
            }
        }
    }

    Write-Host ''
    if ($Removed.Count -gt 0) {
        Log-Ok "Removed $($Removed.Count) items:"
        $Removed | ForEach-Object { Write-Host "    - $_" }
    } else {
        Log-Info 'Nothing to remove'
    }
    Write-Host ''
    exit 0
}

# ════════════════════════════════════════════════════════════════════════════
# ── INSTALL / UPDATE ──
# ════════════════════════════════════════════════════════════════════════════

if ($Update) {
    Write-Host ''
    Log-Info 'Updating UltraThink OSS...'
}

Write-Host ''
Log-Info "Installing UltraThink $TierUpper"
Log-Info "Source: $UltraRoot"

# ── Step 1: Auto-pull ──

Log-Step 1 'Checking for updates'

$Pulled = $false
$gitDir = Join-Path $UltraRoot '.git'
$gitAvailable = [bool](Get-Command git -ErrorAction SilentlyContinue)

if ((Test-Path $gitDir) -and $gitAvailable -and -not $NoPull) {
    Push-Location $UltraRoot
    try {
        $currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
        if ($currentBranch) {
            if ($DryRun) {
                Log-Dry "would run: git fetch origin $currentBranch"
            } else {
                git fetch origin $currentBranch 2>$null
            }

            $local = git rev-parse HEAD 2>$null
            $remote = git rev-parse "origin/$currentBranch" 2>$null

            if ($local -and $remote -and $local -ne $remote) {
                $behind = git rev-list --count "HEAD..origin/$currentBranch" 2>$null
                if ([int]$behind -gt 0) {
                    if ($Update -or $Yes) {
                        if ($DryRun) {
                            Log-Dry "would run: git pull origin $currentBranch"
                        } else {
                            Log-Info "Pulling $behind new commit(s)..."
                            git pull origin $currentBranch --ff-only 2>$null
                            if ($LASTEXITCODE -eq 0) { $Pulled = $true }
                            else {
                                Log-Warn 'Fast-forward pull failed - you may have local changes'
                                Log-Info 'Run git pull manually to resolve, then re-run installer'
                            }
                        }
                    } else {
                        Log-Warn "$behind update(s) available - run with -Update to pull, or -NoPull to skip"
                    }
                } else {
                    Log-Ok 'Already up to date'
                }
            } else {
                Log-Ok 'Already up to date'
            }
        }
    } finally {
        Pop-Location
    }
} elseif ($NoPull) {
    Log-Info 'Skipping update check (-NoPull)'
} elseif (-not (Test-Path $gitDir)) {
    Log-Info 'Not a git repo - skipping update check'
} else {
    Log-Info 'git not available - skipping update check'
}

if ($Pulled) { Log-Ok 'Updated to latest' }

# ── Step 2: Prerequisites ──

Log-Step 2 'Checking prerequisites'

$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
$claudeCodeCmd = Get-Command claude-code -ErrorAction SilentlyContinue
if (-not $claudeCmd -and -not $claudeCodeCmd) {
    Log-Warn 'Claude Code CLI not found - install from https://claude.ai/download'
}

$nodeVersion = $null
try { $nodeVersion = (node --version 2>$null) -replace '^v', '' } catch {}
if ($nodeVersion) {
    $nodeMajor = [int]($nodeVersion.Split('.')[0])
    if ($nodeMajor -lt 18) {
        Log-Error "Node.js 18+ required (found: $nodeVersion)"
        exit 1
    }
    Log-Ok "Node.js $nodeVersion"
} else {
    Log-Error 'Node.js not found - install from https://nodejs.org'
    exit 1
}

# Check for Git Bash (needed to run .sh hooks)
$bashAvailable = [bool](Get-Command bash -ErrorAction SilentlyContinue)
if ($bashAvailable) { Log-Ok 'bash available (Git Bash)' }
else { Log-Warn 'bash not found - install Git for Windows for hook support: https://git-scm.com/download/win' }

$jqAvailable = [bool](Get-Command jq -ErrorAction SilentlyContinue)
if ($jqAvailable) { Log-Ok 'jq available' }
else { Log-Info 'jq not found (optional on Windows - using PowerShell JSON)' }

# ── Step 3: Create directories ──

Log-Step 3 'Creating directory structure'

Ensure-Dir @(
    (Join-Path $ClaudeDir 'skills'),
    (Join-Path $ClaudeDir 'hooks'),
    (Join-Path $UltraData 'forge\projects'),
    (Join-Path $UltraData 'decisions\projects'),
    (Join-Path $Vault 'memories'),
    (Join-Path $Vault 'decisions'),
    (Join-Path $Vault '_templates')
)

Log-Ok '~\.claude\ and ~\.ultrathink\ ready'

# ── Step 4: Link skills ──

Log-Step 4 'Linking skills'

$skillCount = 0
$srcSkills = Join-Path $UltraRoot '.claude\skills'

Get-ChildItem $srcSkills -Directory | ForEach-Object {
    $target = Join-Path $ClaudeDir "skills\$($_.Name)"
    if ((Test-Path $target) -and -not ((Get-Item $target -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        Log-Warn "Skipping skill '$($_.Name)' - existing directory"
        return
    }
    Make-Junction -Target $_.FullName -Link $target
    $script:skillCount++
}

Make-Junction -Target (Join-Path $srcSkills '_registry.json') -Link (Join-Path $ClaudeDir 'skills\_registry.json')
Log-Ok "Linked $skillCount skills"

# ── Step 5: Link references + agents ──

Log-Step 5 'Linking references and agents'

$srcRefs = Join-Path $UltraRoot '.claude\references'
$dstRefs = Join-Path $ClaudeDir 'references'
Make-Junction -Target $srcRefs -Link $dstRefs
$refCount = @(Get-ChildItem $srcRefs -Filter '*.md' -ErrorAction SilentlyContinue).Count
Log-Ok "Linked $refCount references"

$srcAgents = Join-Path $UltraRoot '.claude\agents'
$dstAgents = Join-Path $ClaudeDir 'agents'
if (Test-Path $srcAgents) {
    Make-Junction -Target $srcAgents -Link $dstAgents
    Log-Ok 'Linked agents'
}

# ── Step 6: Link hooks (OSS only) ──

Log-Step 6 'Linking hooks'

$OssHooks = @(
    'privacy-hook.sh', 'format-check.sh', 'notify.sh', 'memory-auto-save.sh',
    'memory-session-start.sh', 'memory-session-end.sh', 'pre-compact.sh',
    'prompt-analyzer.ts', 'prompt-submit.sh', 'hook-log.sh', 'statusline.sh',
    'suggest-compact.sh', 'context-monitor.sh', 'tool-observe.sh',
    'agent-tracker-pre.sh', 'progress-display.sh', 'subagent-verify.sh',
    'gsd-utils.sh', 'post-edit-quality.sh', 'registry-sync.sh',
    'search-cap.sh', 'vfs-enforce.sh',
    'gateguard.sh', 'config-protection.sh', 'batch-quality.sh', 'hook-flags.sh'
)

# Core-only hooks that must NEVER exist in OSS install
$CoreOnlyHooks = @(
    'tool-failure-log.sh', 'codeintel-session-check.sh', 'post-edit-codeintel.sh',
    'decision-inject.sh', 'forge-hydrate.sh', 'decision-extract.sh',
    'decision-engine.ts', 'builder-gate.sh', 'builder-session.sh', 'tekio-prevent.sh'
)

$hookCount = 0
$srcHooks = Join-Path $UltraRoot '.claude\hooks'

foreach ($hook in $OssHooks) {
    $src = Join-Path $srcHooks $hook
    if (-not (Test-Path $src)) { continue }
    Make-Junction -Target $src -Link (Join-Path $ClaudeDir "hooks\ultrathink-$hook")
    $hookCount++
}

# Safety: remove any Core hooks from prior Core install
foreach ($hook in $CoreOnlyHooks) {
    $target = Join-Path $ClaudeDir "hooks\ultrathink-$hook"
    if (Test-Path $target) {
        Remove-Link $target
        Log-Warn "Removed Core-only hook: ultrathink-$hook (not available in OSS)"
    }
}

Log-Ok "Linked $hookCount hooks (OSS tier)"

# ── Step 7: Configure ──

Log-Step 7 'Writing configuration'

$configPath = Join-Path $UltraData 'config.json'
if ($DryRun) {
    Log-Dry "write file: $configPath"
} else {
    @{
        tier = $Tier
        version = $Version
        installed_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        source_repo = $UltraRoot
        vault_path = $Vault
        database_url = $Db
    } | ConvertTo-Json | Set-Content $configPath -Encoding UTF8
}
Log-Ok "Wrote ~\.ultrathink\config.json (tier=$Tier)"

# Write DB URL to .env if provided
if ($Db) {
    $envPath = Join-Path $UltraRoot '.env'
    if (-not (Test-Path $envPath)) {
        if ($DryRun) { Log-Dry 'write DATABASE_URL to .env' }
        else { "DATABASE_URL=$Db" | Set-Content $envPath -Encoding UTF8 }
        Log-Ok 'Wrote DATABASE_URL to .env'
    }
}

# CLAUDE.md identity section
$claudeMd = Join-Path $ClaudeDir 'CLAUDE.md'
$skipIdentity = $false

if ($NoIdentity) {
    $skipIdentity = $true
    Log-Info 'Skipping CLAUDE.md identity section (-NoIdentity)'
} elseif ((Test-Path $claudeMd) -and (Select-String -Path $claudeMd -Pattern 'UltraThink' -Quiet)) {
    $skipIdentity = $true
    Log-Info 'CLAUDE.md already has UltraThink section - skipping'
} elseif (-not $Yes -and -not $DryRun) {
    Write-Host ''
    $confirm = Read-Host "  Add UltraThink identity to ~\.claude\CLAUDE.md? [y/N]"
    if ($confirm -notmatch '^[Yy]$') {
        $skipIdentity = $true
        Log-Info 'Skipped CLAUDE.md identity section'
    }
}

if (-not $skipIdentity) {
    if ($DryRun) {
        Log-Dry "would append UltraThink section to $claudeMd"
    } else {
        $identityBlock = @"

---

## UltraThink Integration ($TierUpper tier)

UltraThink is your active agent harness. Skills in ``~/.claude/skills/<name>/SKILL.md``.
Registry: ``~/.claude/skills/_registry.json`` ($skillCount skills across 4 layers).
References in ``~/.claude/references/`` - read on demand, not auto-loaded.
Data directory: ``~/.ultrathink/`` (vault, forge state, decisions).
"@
        Add-Content $claudeMd $identityBlock -Encoding UTF8
    }
    Log-Ok 'Appended UltraThink section to CLAUDE.md'
}

# Merge hooks into settings.json (OSS only — no Core hook IDs)
$settingsPath = Join-Path $ClaudeDir 'settings.json'
if (-not $DryRun) {
    if (-not (Test-Path $settingsPath)) { '{}' | Set-Content $settingsPath -Encoding UTF8 }
}

if ($DryRun) {
    Log-Dry "would add UltraThink hooks to $settingsPath"
} else {
    $hookJs = Join-Path $env:TEMP 'ut-install-hooks.js'
    @'
const fs = require('fs');
const settingsPath = process.argv[2];
const home = process.env.USERPROFILE || process.env.HOME;
const s = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
s.hooks = s.hooks || {};

const add = (event, id, description, matcher, cmd, timeout) => {
  s.hooks[event] = s.hooks[event] || [];
  if (s.hooks[event].some(e => e.id === id)) return;
  const entry = { id, description, hooks: [{ type: 'command', command: cmd }] };
  if (matcher) entry.matcher = matcher;
  if (timeout) entry.hooks[0].timeout = timeout;
  s.hooks[event].push(entry);
};

// Remove any Core-only hooks from prior Core install
const coreOnlyIds = [
  'ut:post:codeintel', 'ut:session:codeintel',
  'ut:post:tool-failure', 'ut:session:decisions'
];
for (const event of Object.keys(s.hooks)) {
  s.hooks[event] = (s.hooks[event] || []).filter(entry => {
    return !(entry.id && coreOnlyIds.includes(entry.id));
  });
  if (s.hooks[event].length === 0) delete s.hooks[event];
}

const H = home.replace(/\\/g, '/');

// OSS hooks only
add('SessionStart', 'ut:session:start', 'UltraThink: load memory on session start', null, 'bash "'+H+'/.claude/hooks/ultrathink-memory-session-start.sh"', 10000);
add('Stop', 'ut:stop:session-end', 'UltraThink: persist session memory on stop', null, 'bash "'+H+'/.claude/hooks/ultrathink-memory-session-end.sh"', 5000);
add('PreToolUse', 'ut:pre:privacy', 'UltraThink: enforce file-access privacy rules', 'Read|Edit|Write', 'bash "'+H+'/.claude/hooks/ultrathink-privacy-hook.sh"');
add('PostToolUse', 'ut:post:format-check', 'UltraThink: validate formatting after edits', 'Edit|Write', 'bash "'+H+'/.claude/hooks/ultrathink-format-check.sh"');
add('PostToolUse', 'ut:post:search-cap', 'UltraThink: cap search result output size', 'Bash|Grep|Glob', 'bash "'+H+'/.claude/hooks/ultrathink-search-cap.sh"');
add('PreToolUse', 'ut:pre:gateguard', 'UltraThink: enforce read-before-write (GateGuard)', 'Edit|Write|MultiEdit|Read', 'bash "'+H+'/.claude/hooks/ultrathink-gateguard.sh"');
add('PreToolUse', 'ut:pre:config-protect', 'UltraThink: block linter/formatter config modifications', 'Edit|Write|MultiEdit', 'bash "'+H+'/.claude/hooks/ultrathink-config-protection.sh"');
add('Stop', 'ut:stop:batch-quality', 'UltraThink: batch format + typecheck edited files', null, 'bash "'+H+'/.claude/hooks/ultrathink-batch-quality.sh"', 60000);
add('PostToolUse', 'ut:post:batch-accumulate', 'UltraThink: track edited files for batch quality check', 'Edit|Write|MultiEdit', 'bash "'+H+'/.claude/hooks/ultrathink-batch-quality.sh"');
add('PreCompact', 'ut:pre:compact', 'UltraThink: save context before compaction', null, 'bash "'+H+'/.claude/hooks/ultrathink-pre-compact.sh"', 10000);

fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');
'@ | Set-Content $hookJs -Encoding UTF8

    try {
        node $hookJs $settingsPath 2>$null
        Log-Ok 'Added hooks to settings.json'
    } catch {
        Log-Warn 'Could not merge hooks - add manually'
    } finally {
        Remove-Item $hookJs -ErrorAction SilentlyContinue
    }
}

# Vault templates
if ($DryRun) {
    Log-Dry "write vault templates to $Vault\_templates\"
} else {
    @'
---
id: mem_{{id}}
type: memory
confidence: 0.8
importance: 5
scope: global
source: user
created: {{date}}
tags: []
---

# {{title}}

{{content}}

## Related
- [[]]
'@ | Set-Content (Join-Path $Vault '_templates\memory.md') -Encoding UTF8

    @'
---
id: dec_{{id}}
type: decision
priority: 5
scope: global
source: user
created: {{date}}
tags: []
---

# {{title}}

{{rule}}

## Context
Why this decision was made.

## Related
- [[]]
'@ | Set-Content (Join-Path $Vault '_templates\decision.md') -Encoding UTF8
}

Log-Ok 'Wrote vault templates'

# ── Step 8: Smoke test ──

Log-Step 8 'Running smoke test'

if ($DryRun) {
    Log-Dry 'skipping smoke test in dry-run mode'
    Write-Host ''
    Log-Warn 'DRY RUN complete - no files were modified'
    Write-Host ''
    exit 0
}

$Errors = 0

# Check skills linked
$linkedSkills = @(Get-ChildItem (Join-Path $ClaudeDir 'skills') -Directory -ErrorAction SilentlyContinue).Count
if ($linkedSkills -gt 0) { Log-Ok "Skills: $linkedSkills linked" }
else { Log-Error 'No skills linked'; $Errors++ }

# Check registry valid JSON
$regPath = Join-Path $ClaudeDir 'skills\_registry.json'
try {
    Get-Content $regPath -Raw | ConvertFrom-Json | Out-Null
    Log-Ok 'Registry: valid JSON'
} catch {
    Log-Error 'Registry: invalid JSON'
    $Errors++
}

# Check hooks linked
$linkedHooks = @(Get-ChildItem (Join-Path $ClaudeDir 'hooks') -Filter 'ultrathink-*' -ErrorAction SilentlyContinue).Count
if ($linkedHooks -gt 0) { Log-Ok "Hooks: $linkedHooks linked" }
else { Log-Error 'No hooks linked'; $Errors++ }

# Check vault directory
if (Test-Path (Join-Path $Vault 'memories')) { Log-Ok "Vault: ready at $Vault" }
else { Log-Error 'Vault directory not created'; $Errors++ }

# Check config
if (Test-Path $configPath) {
    $configTier = (Get-Content $configPath -Raw | ConvertFrom-Json).tier
    Log-Ok "Config: tier=$configTier"
} else {
    Log-Error 'Config not written'
    $Errors++
}

# OSS boundary: verify no Core artifacts
$leaked = $false
foreach ($coreHook in @('tool-failure-log.sh', 'codeintel-session-check.sh', 'post-edit-codeintel.sh', 'decision-inject.sh')) {
    $target = Join-Path $ClaudeDir "hooks\ultrathink-$coreHook"
    if (Test-Path $target) {
        Log-Warn "Core artifact found: ultrathink-$coreHook (should not exist in OSS)"
        $leaked = $true
    }
}
if (-not $leaked) { Log-Ok 'OSS boundary: clean (no Core artifacts)' }

Write-Host ''
if ($Errors -eq 0) {
    Write-Host ('=' * 50) -ForegroundColor Green
    Write-Host "  UltraThink OSS installed successfully!" -ForegroundColor Green
    Write-Host ('=' * 50) -ForegroundColor Green
} else {
    Write-Host "  UltraThink installed with $Errors warning(s)" -ForegroundColor Yellow
}

Write-Host @"

  Tier:       $TierUpper
  Skills:     $skillCount in ~\.claude\skills\
  Hooks:      $hookCount in ~\.claude\hooks\
  References: $refCount in ~\.claude\references\
  Vault:      $Vault
  Config:     $configPath

  Open any project directory and run 'claude' - UltraThink is active.
"@

if (Test-Path $Vault) {
    Write-Host "  Open $Vault in Obsidian to browse your memory graph."
}

Write-Host ''
Write-Host "  To update:    $($MyInvocation.MyCommand.Definition) -Update"
Write-Host "  To uninstall: $($MyInvocation.MyCommand.Definition) -Uninstall"
Write-Host ''

#Requires -Version 5.1
<#
.SYNOPSIS
  UltraThink OSS installer for native Windows (no WSL).
  Limited feature set: dashboard, memory CLI, vault sync, skill browsing.
  For full features (hooks, statusline, auto-trigger), use WSL2 with install.sh.

.PARAMETER DbUrl
  Neon Postgres connection string.

.PARAMETER VaultPath
  Obsidian vault location (default: ~\.ultrathink\vault).

.PARAMETER DryRun
  Print what would change without modifying anything.

.PARAMETER Uninstall
  Remove UltraThink from the system.

.EXAMPLE
  .\install.ps1 -DbUrl "postgresql://user:pass@host/db"
#>
param(
  [string]$DbUrl = "",
  [string]$VaultPath = "",
  [switch]$DryRun,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

# --- Paths ---
$UltraRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $UltraRoot) { $UltraRoot = Split-Path -Parent $PSScriptRoot }
# Handle running from scripts/ dir
if (Test-Path (Join-Path $PSScriptRoot ".." ".claude")) {
  $UltraRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$ClaudeDir = Join-Path $env:USERPROFILE ".claude"
$UltraData = Join-Path $env:USERPROFILE ".ultrathink"
if (-not $VaultPath) { $VaultPath = Join-Path $UltraData "vault" }

# --- Logging ---
function Log-Info  { param($Msg) Write-Host "[INFO]  $Msg" -ForegroundColor Blue }
function Log-Ok    { param($Msg) Write-Host "[OK]    $Msg" -ForegroundColor Green }
function Log-Warn  { param($Msg) Write-Host "[WARN]  $Msg" -ForegroundColor Yellow }
function Log-Error { param($Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red }
function Log-Step  { param($N, $Total, $Msg) Write-Host "`n[$N/$Total] $Msg" -ForegroundColor Cyan }
function Log-Dry   { param($Msg) Write-Host "[DRY]   $Msg" -ForegroundColor Yellow }

$TotalSteps = 6

if ($DryRun) {
  Write-Host ""
  Log-Warn "DRY RUN - no files will be modified"
}

# --- Uninstall ---
if ($Uninstall) {
  Write-Host ""
  Log-Info "Uninstalling UltraThink..."
  $Removed = @()

  # Remove skill copies
  $SkillsDir = Join-Path $ClaudeDir "skills"
  if (Test-Path $SkillsDir) {
    if ($DryRun) { Log-Dry "would remove $SkillsDir" }
    else { Remove-Item -Recurse -Force $SkillsDir; $Removed += "skills/" }
  }

  # Remove references copy
  $RefsDir = Join-Path $ClaudeDir "references"
  if (Test-Path $RefsDir) {
    if ($DryRun) { Log-Dry "would remove $RefsDir" }
    else { Remove-Item -Recurse -Force $RefsDir; $Removed += "references/" }
  }

  # Remove data dir (with confirmation)
  if (Test-Path $UltraData) {
    if ($DryRun) {
      Log-Dry "would prompt to remove $UltraData"
    } else {
      $Confirm = Read-Host "Remove ~\.ultrathink\ (vault, config)? This is irreversible. [y/N]"
      if ($Confirm -match "^[Yy]$") {
        Remove-Item -Recurse -Force $UltraData
        $Removed += "~\.ultrathink\"
      } else {
        Log-Info "Kept ~\.ultrathink\"
      }
    }
  }

  Write-Host ""
  if ($Removed.Count -gt 0) {
    Log-Ok "Removed $($Removed.Count) items:"
    $Removed | ForEach-Object { Write-Host "    - $_" }
  } else {
    Log-Info "Nothing to remove"
  }
  exit 0
}

# === INSTALL ===
Write-Host ""
Log-Info "Installing UltraThink OSS (native Windows - limited features)"
Log-Info "Source: $UltraRoot"
Log-Warn "Native Windows: dashboard + memory CLI + vault sync only"
Log-Warn "For full features (hooks, statusline, auto-trigger), use WSL2"

# --- Step 1: Prerequisites ---
Log-Step 1 $TotalSteps "Checking prerequisites"

try {
  $NodeVersion = (node --version 2>$null) -replace "^v", ""
  $NodeMajor = [int]($NodeVersion.Split(".")[0])
  if ($NodeMajor -lt 18) {
    Log-Error "Node.js 18+ required (found: $NodeVersion)"
    Log-Info "Download from https://nodejs.org/"
    exit 1
  }
  Log-Ok "Node.js $NodeVersion"
} catch {
  Log-Error "Node.js not found. Download from https://nodejs.org/"
  exit 1
}

# jq is optional on Windows — used by statusline (which doesn't run natively anyway)
$HasJq = $null -ne (Get-Command jq -ErrorAction SilentlyContinue)
if ($HasJq) { Log-Ok "jq available" }
else { Log-Warn "jq not found (optional on Windows) — install via winget install jqlang.jq" }

# --- Step 2: Create directories ---
Log-Step 2 $TotalSteps "Creating directory structure"

$Dirs = @(
  (Join-Path $ClaudeDir "skills"),
  (Join-Path $UltraData "forge\projects"),
  (Join-Path $UltraData "decisions\projects"),
  (Join-Path $VaultPath "memories"),
  (Join-Path $VaultPath "decisions"),
  (Join-Path $VaultPath "_templates")
)

foreach ($Dir in $Dirs) {
  if ($DryRun) { Log-Dry "mkdir $Dir" }
  elseif (-not (Test-Path $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
}

Log-Ok "~\.claude\ and ~\.ultrathink\ ready"

# --- Step 3: Copy skills (no symlinks — Windows symlinks need admin) ---
Log-Step 3 $TotalSteps "Copying skills"

$SkillsSrc = Join-Path $UltraRoot ".claude" "skills"
$SkillsDst = Join-Path $ClaudeDir "skills"
$SkillCount = 0

if (Test-Path $SkillsSrc) {
  Get-ChildItem -Path $SkillsSrc -Directory | ForEach-Object {
    $Target = Join-Path $SkillsDst $_.Name
    if ($DryRun) { Log-Dry "copy $($_.FullName) -> $Target" }
    else {
      if (Test-Path $Target) { Remove-Item -Recurse -Force $Target }
      Copy-Item -Recurse -Force $_.FullName $Target
    }
    $SkillCount++
  }

  # Copy registry
  $RegSrc = Join-Path $SkillsSrc "_registry.json"
  $RegDst = Join-Path $SkillsDst "_registry.json"
  if (Test-Path $RegSrc) {
    if ($DryRun) { Log-Dry "copy registry" }
    else { Copy-Item -Force $RegSrc $RegDst }
  }
}

Log-Ok "Copied $SkillCount skills"

# --- Step 4: Copy references ---
Log-Step 4 $TotalSteps "Copying references"

$RefsSrc = Join-Path $UltraRoot ".claude" "references"
$RefsDst = Join-Path $ClaudeDir "references"

if (Test-Path $RefsSrc) {
  if ($DryRun) { Log-Dry "copy references" }
  else {
    if (Test-Path $RefsDst) { Remove-Item -Recurse -Force $RefsDst }
    Copy-Item -Recurse -Force $RefsSrc $RefsDst
  }
  $RefCount = (Get-ChildItem -Path $RefsSrc -Filter "*.md" -Recurse).Count
  Log-Ok "Copied $RefCount references"
} else {
  Log-Warn "No references directory found"
}

# --- Step 5: Configuration ---
Log-Step 5 $TotalSteps "Writing configuration"

$ConfigPath = Join-Path $UltraData "config.json"
$Config = @{
  tier = "oss"
  version = "2.0.0"
  platform = "windows-native"
  installed_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
  source_repo = $UltraRoot
  vault_path = $VaultPath
  database_url = $DbUrl
} | ConvertTo-Json -Depth 3

if ($DryRun) { Log-Dry "write $ConfigPath" }
else { $Config | Out-File -Encoding utf8 $ConfigPath }

Log-Ok "Wrote config.json (tier=oss, platform=windows-native)"

# Write .env if DB provided
if ($DbUrl) {
  $EnvPath = Join-Path $UltraRoot ".env"
  if (-not (Test-Path $EnvPath)) {
    if ($DryRun) { Log-Dry "write DATABASE_URL to .env" }
    else { "DATABASE_URL=$DbUrl" | Out-File -Encoding utf8 $EnvPath }
    Log-Ok "Wrote DATABASE_URL to .env"
  }
}

# Vault templates
$MemTpl = Join-Path $VaultPath "_templates" "memory.md"
$DecTpl = Join-Path $VaultPath "_templates" "decision.md"

if ($DryRun) { Log-Dry "write vault templates" }
else {
  @"
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
"@ | Out-File -Encoding utf8 $MemTpl

  @"
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
"@ | Out-File -Encoding utf8 $DecTpl
}

Log-Ok "Wrote vault templates"

# --- Step 6: Smoke test ---
Log-Step 6 $TotalSteps "Running smoke test"

if ($DryRun) {
  Log-Dry "skipping smoke test in dry-run mode"
  Write-Host ""
  Log-Warn "DRY RUN complete - no files were modified"
  exit 0
}

$Errors = 0

# Check skills
$LinkedSkills = (Get-ChildItem -Path (Join-Path $ClaudeDir "skills") -Directory -ErrorAction SilentlyContinue).Count
if ($LinkedSkills -gt 0) { Log-Ok "Skills: $LinkedSkills copied" }
else { Log-Error "No skills found"; $Errors++ }

# Check registry
$RegPath = Join-Path $ClaudeDir "skills" "_registry.json"
if (Test-Path $RegPath) {
  try {
    Get-Content $RegPath -Raw | ConvertFrom-Json | Out-Null
    Log-Ok "Registry: valid JSON"
  } catch {
    Log-Error "Registry: invalid JSON"
    $Errors++
  }
} else {
  Log-Error "Registry not found"
  $Errors++
}

# Check vault
if (Test-Path (Join-Path $VaultPath "memories")) { Log-Ok "Vault: ready at $VaultPath" }
else { Log-Error "Vault directory not created"; $Errors++ }

# Check config
if (Test-Path $ConfigPath) { Log-Ok "Config: tier=oss" }
else { Log-Error "Config not written"; $Errors++ }

Write-Host ""
if ($Errors -eq 0) {
  Write-Host "  UltraThink OSS installed successfully! (native Windows)" -ForegroundColor Green
} else {
  Write-Host "  UltraThink installed with $Errors warning(s)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Skills:     $SkillCount in ~\.claude\skills\"
Write-Host "  References: $RefCount in ~\.claude\references\"
Write-Host "  Vault:      $VaultPath"
Write-Host "  Config:     $ConfigPath"
Write-Host ""
Write-Host "  Available commands:"
Write-Host "    npm run dashboard:dev    # Start dashboard at localhost:3333"
Write-Host "    npx tsx memory/src/migrate.ts  # Run database migrations"
Write-Host "    npx tsx scripts/vault-sync.ts  # Sync vault with database"
Write-Host ""
Write-Host "  For full UltraThink (hooks, statusline, auto-trigger): use WSL2"
Write-Host "    See: docs/install-windows.md"
Write-Host ""
Write-Host "  To uninstall: .\scripts\install.ps1 -Uninstall"
Write-Host ""

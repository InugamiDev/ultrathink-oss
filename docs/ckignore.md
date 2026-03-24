# .ckignore File Format

## Overview

`.ckignore` defines file patterns that the privacy hook blocks from access. It uses **gitignore-like syntax** with one key addition: lines starting with `!` create **allow overrides** that permit access to files that would otherwise be blocked.

**Location**: Project root (`.ckignore`)

The privacy hook checks this file on every file access operation. Patterns in `.ckignore` are additive to the built-in blocked patterns that are always enforced regardless of this file's contents.

## Syntax

### Basic Rules

- One pattern per line
- Empty lines are ignored
- Lines starting with `#` are comments
- Lines starting with `!` are allow overrides (negate a block)
- Patterns are matched against the full file path and the basename

### Pattern Matching

| Pattern | Matches | Example Files Matched |
|---------|---------|----------------------|
| `.env` | Exact basename match | `.env` |
| `.env.*` | Basename with any suffix | `.env.production`, `.env.local` |
| `*.pem` | Any file ending in `.pem` | `server.pem`, `ca-cert.pem` |
| `**/credentials*` | `credentials` in any directory | `config/credentials.json`, `src/credentials.ts` |
| `~/.ssh/` | User SSH directory | `~/.ssh/id_rsa`, `~/.ssh/config` |
| `vault/**` | Everything under vault directory | `vault/secrets.json`, `vault/keys/master.key` |

### Allow Overrides

Lines starting with `!` **override blocks**, allowing access to files that match blocked patterns:

```gitignore
# Block all .env files
.env
.env.*

# But allow templates
!.env.example
!.env.template
```

Allow overrides are processed **before** block checks. If a file matches both a block and an allow, the allow wins.

## Built-in Blocked Patterns

These patterns are **always enforced** by the privacy hook, regardless of `.ckignore` contents. You cannot override them with `!` patterns in `.ckignore`:

```
.env
.env.*
*.pem
*.key
*.p12
*.pfx
*/credentials*
*/secrets*
*/tokens*
*/.auth*
*.keystore
```

The only built-in exceptions are:

```
.env.example      (safe template)
.env.template     (safe template)
*.example.*       (example files)
```

## Default .ckignore

UltraThink ships with this default `.ckignore`:

```gitignore
# UltraThink Privacy Rules
# Files matching these patterns are blocked by the privacy hook.
# Uses gitignore-like syntax.

# Environment variables and secrets
.env
.env.*
!.env.example
!.env.template

# Cryptographic keys
*.pem
*.key
*.p12
*.pfx
*.jks
*.keystore

# Credentials and tokens
**/credentials*
**/secrets*
**/tokens*
**/.auth*
**/service-account*.json

# SSH and cloud config
~/.ssh/
~/.aws/
~/.gcloud/
~/.azure/
~/.kube/config

# Database dumps with potential PII
*.sql.gz
*.dump
**/backups/*.sql

# IDE and OS secrets
.idea/dataSources*
.vscode/settings.json

# Application secrets
**/config/production.json
**/config/secrets.json
**/vault/**

# Allow overrides (safe templates and examples)
!.env.example
!.env.template
!**/config/example.json
!**/credentials.example.*
```

## Common Customizations

### Block a Custom Secrets Directory

```gitignore
# Block internal secrets vault
internal/secrets/**
deploy/keys/**
```

### Allow Specific Config Files

```gitignore
# Block all production configs
**/config/production.*

# But allow the schema/type definition
!**/config/production.schema.json
!**/config/production.types.ts
```

### Block Database Connection Files

```gitignore
# Block database configs that may contain credentials
**/database.yml
**/database.json
**/knexfile.*
**/ormconfig.*

# Allow the example
!**/database.example.yml
```

### Block CI/CD Secrets

```gitignore
# GitHub Actions secrets
.github/workflows/secrets.*
.github/environments/**

# GitLab CI variables
.gitlab-ci-variables.*
```

### Block Backup Files

```gitignore
# Database backups
**/backups/**
*.bak
*.backup
*.sql.gz
*.dump
```

## How the Hook Processes `.ckignore`

The privacy hook (`privacy-hook.sh`) reads `.ckignore` line by line:

1. **Skip** empty lines and comments (lines starting with `#`)
2. **Process allow overrides first** -- lines starting with `!`:
   - Strip the `!` prefix
   - If the file path matches this pattern, immediately **allow** (exit 0)
3. **Process block patterns** -- all other lines:
   - If the file path matches this pattern, **block** (exit 1 with error message)
4. **If no pattern matches**, the file is **allowed** (exit 0)

### Important: The order within `.ckignore` does not matter for allow vs. block priority. Allow overrides are always checked before blocks. However, the order matters among allow patterns and among block patterns -- the first match wins.

## Editing via Dashboard

The Settings page at `localhost:3333/settings` includes a `.ckignore` editor with:
- Syntax highlighting for patterns and comments
- Live validation against test file paths
- Preview of what would be blocked/allowed

## Testing Patterns

To test whether a specific file would be blocked:

```bash
# Run the privacy hook with a test path
.claude/hooks/privacy-hook.sh /path/to/test/file.env
# Exit code 0 = allowed, 1 = blocked
echo $?
```

Check the log output:

```bash
# View recent hook events
tail -5 reports/hook-events.jsonl | jq .
```

## Relationship to Sensitivity Levels

The `.ckignore` file works in concert with the sensitivity level configured in `ck.json`:

| Level | .ckignore Behavior |
|-------|--------------------|
| `standard` | Check `.ckignore` patterns normally |
| `strict` | Check `.ckignore` + prompt for any file outside project root |
| `paranoid` | Check `.ckignore` + prompt for ALL file reads |

At `standard` level, only files matching `.ckignore` or built-in patterns are blocked. At higher levels, additional restrictions apply beyond what `.ckignore` defines.

## Related Documentation

- [Hooks and Privacy](./hooks-and-privacy.md) -- Full hook system documentation
- [ck.json Config](./ck-json-config.md) -- Privacy hook sensitivity configuration
- [Troubleshooting](./troubleshooting.md) -- Debugging blocked file access

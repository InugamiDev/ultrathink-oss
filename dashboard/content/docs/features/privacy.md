# Privacy

UltraThink enforces a privacy-first stance through the privacy hook, `.ckignore` patterns, and configurable sensitivity levels. Every file access is checked before it occurs.

## The Privacy Hook

The `privacy-hook.sh` fires as a `PreToolUse` hook on every file read or write operation:

1. Receives the target file path
2. Resolves to absolute path
3. Checks allow overrides first (e.g., `.env.example`)
4. Checks built-in blocked patterns (always enforced)
5. Checks `.ckignore` user-defined patterns
6. Logs the decision to `reports/hook-events.jsonl`
7. Exits 0 (allowed) or exits 1 (blocked)

## Built-in Blocked Patterns

These are **always enforced** and cannot be overridden:

| Pattern | Protects |
|---------|----------|
| `.env`, `.env.*` | Environment variables |
| `*.pem`, `*.key` | TLS/SSL certificates and private keys |
| `*.p12`, `*.pfx` | PKCS#12 keystores |
| `*/credentials*` | Credential files |
| `*/secrets*` | Secret configuration |
| `*/tokens*` | Token storage |
| `*/.auth*` | Auth configuration |
| `*.keystore` | Java keystores |

**Built-in exceptions** (bypass blocks):

| Pattern | Reason |
|---------|--------|
| `.env.example` | Template, no real secrets |
| `.env.template` | Template, no real secrets |
| `*.example.*` | Example files are safe |

## The `.ckignore` File

Located at the project root, `.ckignore` defines custom blocked and allowed patterns using gitignore-like syntax.

### Syntax

- One pattern per line
- Empty lines and `#` comments are ignored
- Lines starting with `!` are allow overrides (negate a block)
- Patterns match against the full file path and the basename

### Example

```gitignore
# Block custom secrets
config/production.json
vault/**

# Allow specific overrides
!config/example.json
```

### Default `.ckignore`

```gitignore
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

# Allow overrides
!.env.example
!.env.template
!**/config/example.json
!**/credentials.example.*
```

### Processing Order

Allow overrides (`!` patterns) are **always checked before** block patterns. If a file matches both, the allow wins. Within each group, first match wins.

## Sensitivity Levels

Configured in `ck.json` under `privacyHook.sensitivityLevel`:

| Level | Behavior |
|-------|----------|
| `standard` (default) | Block known secret patterns, check `.ckignore`, log all access |
| `strict` | + prompt for files outside project root, block external reads |
| `paranoid` | + prompt for ALL file reads, block all network without approval |

```json
{
  "privacyHook": {
    "enabled": true,
    "sensitivityLevel": "standard",
    "logEvents": true
  }
}
```

## Testing Patterns

```bash
# Test whether a file would be blocked
.claude/hooks/privacy-hook.sh /path/to/test/file.env
echo $?   # 0 = allowed, 1 = blocked

# View recent hook events
tail -5 reports/hook-events.jsonl | jq .
```

## Dashboard Integration

The Settings page at `localhost:3333/settings` includes a `.ckignore` editor with syntax highlighting, live validation against test file paths, and a preview of what would be blocked or allowed.

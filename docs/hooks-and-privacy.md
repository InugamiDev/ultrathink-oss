# Hooks and Privacy

## Overview

UltraThink enforces a privacy-first stance through a hook system. Four shell-script hooks run at specific points in the workflow lifecycle to enforce security, persist memory, validate formatting, and dispatch notifications. All hooks live in `.claude/hooks/`.

The privacy hook is the most critical -- it checks every file access against blocked patterns before the access occurs, logging all decisions to an audit trail.

## The Four Hooks

### 1. Privacy Hook (`privacy-hook.sh`)

**Type**: Pre-tool hook (runs before file access)

**Purpose**: Checks file paths against `.ckignore` patterns and built-in blocklists. Blocks access to sensitive files and logs all decisions.

**Trigger**: Any file read or write operation.

**Behavior**:
1. Receives the target file path as argument `$1`
2. Resolves to absolute path
3. Checks allow overrides first (e.g., `.env.example`)
4. Checks built-in blocked patterns (always enforced)
5. Checks `.ckignore` user-defined patterns
6. Logs the decision to `reports/hook-events.jsonl`
7. Exits 0 (allowed) or exits 1 (blocked, with error message to stderr)

**Built-in Blocked Patterns** (always enforced, cannot be overridden):

| Pattern | Protects |
|---------|----------|
| `.env` | Environment variables |
| `.env.*` | Environment variable variants |
| `*.pem` | TLS/SSL certificates |
| `*.key` | Private keys |
| `*.p12`, `*.pfx` | PKCS#12 keystores |
| `*/credentials*` | Credential files |
| `*/secrets*` | Secret configuration |
| `*/tokens*` | Token storage |
| `*/.auth*` | Auth configuration |
| `*.keystore` | Java keystores |

**Built-in Allow Overrides** (these bypass blocks):

| Pattern | Reason |
|---------|--------|
| `.env.example` | Template, no real secrets |
| `.env.template` | Template, no real secrets |
| `*.example.*` | Example files are safe |

**Log Format** (JSONL in `reports/hook-events.jsonl`):

```json
{
  "timestamp": "2026-03-02T10:30:00Z",
  "severity": "warning",
  "action": "blocked",
  "path": "/project/.env.production",
  "description": "Built-in pattern matched: .env.*"
}
```

### 2. Memory Save Hook (`memory-save.sh`)

**Type**: Post-session hook (runs after a session ends)

**Purpose**: Persists pending session memories to the Postgres database.

**Behavior**:
1. Checks for `DATABASE_URL` environment variable (tries loading from `.env` if not set)
2. Looks for pending memory files in the session temp directory (`/tmp/ultrathink-session/`)
3. Reads each `.memory.json` file, extracting `content`, `category`, `importance`, `scope`
4. Skips empty content files
5. Marks processed files as `.saved`
6. Logs the save operation to `reports/hook-events.jsonl`

**Memory File Format** (JSON in session temp directory):

```json
{
  "content": "React Server Components cannot use useState or useEffect",
  "category": "pattern",
  "importance": 7,
  "scope": "nextjs/frontend"
}
```

### 3. Format Check Hook (`format-check.sh`)

**Type**: Post-edit hook (runs after a file is modified)

**Purpose**: Validates and auto-fixes formatting of modified files.

**Supported File Types**:

| Extension | Check | Auto-fix |
|-----------|-------|----------|
| `ts`, `tsx`, `js`, `jsx`, `mjs`, `cjs` | Prettier format check | Yes (if Prettier available) |
| `json` | JSON syntax validation via `jq` | No (warns only) |
| `sql` | Manual review recommendation | No |
| `sh`, `bash`, `zsh` | Shell syntax check via `bash -n` | No (warns only) |
| `md` | Logs modification | No |

### 4. Notification Hook (`notify.sh`)

**Type**: Event-driven hook (called explicitly by other hooks or skills)

**Purpose**: Dispatches notifications to configured channels (Telegram, Discord, Slack).

**Usage**:
```bash
./notify.sh <message> [channel] [priority]
```

**Parameters**:
- `message` (required): The notification text
- `channel` (optional): `telegram`, `discord`, `slack`, or `all` (default: `all`)
- `priority` (optional): `low`, `normal`, `high`, `critical` (default: `normal`)

**Priority Prefixes**:
- `critical` -> `[CRITICAL] UltraThink: <message>`
- `high` -> `[HIGH] UltraThink: <message>`
- `normal` -> `UltraThink: <message>`
- `low` -> `[low] UltraThink: <message>`

**Channel Configuration** (in `.claude/ck.json`):
```json
{
  "notifications": {
    "telegram": {
      "token": "bot-token-here",
      "chatId": "chat-id-here"
    },
    "discord": "https://discord.com/api/webhooks/...",
    "slack": "https://hooks.slack.com/services/..."
  }
}
```

## Sensitivity Levels

Configured in `.claude/ck.json` under `privacyHook.sensitivityLevel`:

### `standard` (default)

- Block known secret patterns (the built-in list)
- Check `.ckignore` patterns
- Log all access events
- No prompts for normal project files

### `strict`

- Everything in `standard`
- Prompt for any file access outside the project root
- Block all external file reads without explicit approval
- Enhanced logging with full path context

### `paranoid`

- Everything in `strict`
- Prompt for ALL file reads, even within the project
- Block all network requests without explicit approval
- Full audit trail of every operation
- Recommended only for high-security environments

## Hook Event Logging

All hooks write events to `reports/hook-events.jsonl` in a consistent JSON format. The database also stores events in the `hook_events` table with additional fields:

### JSONL Format (file-based)

```json
{"timestamp":"2026-03-02T10:30:00Z","severity":"warning","action":"blocked","path":"/project/.env","description":"Built-in pattern matched: .env"}
```

### Database Format (`hook_events` table)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique event ID |
| `event_type` | VARCHAR(50) | `file_read`, `file_write`, `file_blocked`, `file_approved` |
| `severity` | VARCHAR(20) | `info`, `warning`, `critical` |
| `description` | TEXT | Human-readable description |
| `path_accessed` | TEXT | File path involved |
| `action_taken` | VARCHAR(50) | `allowed`, `blocked`, `prompted`, `approved`, `denied` |
| `hook_name` | VARCHAR(100) | Which hook generated this event |
| `session_id` | UUID | Session that triggered the event |
| `created_at` | TIMESTAMPTZ | Event timestamp |

## The `.ckignore` File

The `.ckignore` file (at project root) defines custom blocked and allowed patterns for the privacy hook. It uses gitignore-like syntax. See [ckignore](./ckignore.md) for full format documentation.

Quick example:

```gitignore
# Block custom secrets
config/production.json
vault/**

# Allow specific overrides
!config/example.json
```

## Dashboard Integration

The Hooks page in the dashboard (`localhost:3333/hooks`) shows:

- Privacy hook event log with filtering by severity and type
- Pending approval queue for `prompted` events
- Blocked attempt history
- `.ckignore` configuration viewer
- Event statistics and trends

## Related Documentation

- [ckignore](./ckignore.md) -- Full `.ckignore` format reference
- [ck.json Config](./ck-json-config.md) -- Privacy hook configuration
- [Memory System](./memory-system.md) -- Memory save hook details
- [Troubleshooting](./troubleshooting.md) -- Hook failure debugging
- [Dashboard Overview](./dashboard-overview.md) -- Hooks page in the dashboard

# Configuration

UltraThink is configured through two main mechanisms: the `ck.json` project config and environment variables.

## Project Configuration (`.claude/ck.json`)

This is the central configuration file controlling behavior across all subsystems.

### Top-Level Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `project` | string | `"ultrathink"` | Project name displayed in dashboard and statusline |
| `version` | string | `"1.0.0"` | Configuration version |
| `defaultLanguage` | string | `"en"` | Default response language (`"en"`, `"vi"`, etc.) |
| `codingLevel` | string | `"practical-builder"` | Active coding level (see [Coding Levels](/reference/coding-levels)) |
| `outputFormat` | string | `"markdown"` | Default output format for plans and reports |
| `defaultPlanDir` | string | `"./plans"` | Directory for plan documents |
| `archiveDir` | string | `"./plans/archive"` | Directory for archived plans |
| `journalDir` | string | `"./plans/journals"` | Directory for journey journals |

### `memory` Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | `"neon"` | Database provider (`"neon"` only) |
| `autoRecall` | boolean | `true` | Query relevant memories at session start |
| `writePolicy` | string | `"selective"` | `"always"`, `"selective"`, or `"none"` |
| `compactionThreshold` | number | `100` | Memories per scope before compaction triggers |

**Write policies**:
- `"always"` -- persist after every significant skill execution
- `"selective"` -- persist only decisions, patterns, solutions, and high-value information
- `"none"` -- never auto-persist (manual only)

### `privacyHook` Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Whether the privacy hook is active |
| `sensitivityLevel` | string | `"standard"` | `"standard"`, `"strict"`, or `"paranoid"` |
| `logEvents` | boolean | `true` | Whether to log all hook events |

**Sensitivity levels**:
- `"standard"` -- block known secret patterns, log access
- `"strict"` -- also prompt for files outside project root
- `"paranoid"` -- prompt for all file reads, block all network without approval

### `dashboard` Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | number | `3333` | Port for the dashboard server |

### `statusline` Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showMode` | boolean | `true` | Show current mode (skill name or idle) |
| `showMemory` | boolean | `true` | Show memory stats |
| `showContext` | boolean | `true` | Show context window usage |

### `notifications` Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `telegram` | object/null | `null` | `{ token, chatId }` |
| `discord` | string/null | `null` | Discord webhook URL |
| `slack` | string/null | `null` | Slack incoming webhook URL |

### `kanban` Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultBoard` | string | `"main"` | Default board name for new tasks |

### `uiTest` Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `viewports` | string[] | `["375x667", "768x1024", "1440x900"]` | Viewport dimensions |
| `reportDir` | string | `"./reports/ui-tests"` | Output directory for test reports |

### `reports` Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `outputDir` | string | `"./reports"` | Base directory for all reports |

## Full Default Configuration

```json
{
  "project": "ultrathink",
  "version": "1.0.0",
  "defaultLanguage": "en",
  "codingLevel": "practical-builder",
  "outputFormat": "markdown",
  "defaultPlanDir": "./plans",
  "archiveDir": "./plans/archive",
  "journalDir": "./plans/journals",
  "dashboard": { "port": 3333 },
  "statusline": {
    "showMode": true,
    "showMemory": true,
    "showContext": true
  },
  "memory": {
    "provider": "neon",
    "autoRecall": true,
    "writePolicy": "selective",
    "compactionThreshold": 100
  },
  "privacyHook": {
    "enabled": true,
    "sensitivityLevel": "standard",
    "logEvents": true
  },
  "notifications": {
    "telegram": null,
    "discord": null,
    "slack": null
  },
  "kanban": { "defaultBoard": "main" },
  "uiTest": {
    "viewports": ["375x667", "768x1024", "1440x900"],
    "reportDir": "./reports/ui-tests"
  },
  "reports": { "outputDir": "./reports" }
}
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb?sslmode=require

# Dashboard
NEXT_PUBLIC_APP_URL=http://localhost:3333
PORT=3333

# Optional -- Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## Common Modifications

### Change coding level

```json
{ "codingLevel": "expert" }
```

### Enable strict privacy

```json
{ "privacyHook": { "sensitivityLevel": "strict" } }
```

### Increase compaction threshold

```json
{ "memory": { "compactionThreshold": 200 } }
```

### Change dashboard port

```json
{ "dashboard": { "port": 4444 } }
```

## Editing via Dashboard

The Settings page at `localhost:3333/settings` provides a visual editor for `ck.json` with validation. Changes are saved directly to the file.

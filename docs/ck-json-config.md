# ck.json Configuration Reference

## Overview

`.claude/ck.json` is the central configuration file for UltraThink. It controls language, coding level, memory policies, privacy settings, notification channels, dashboard preferences, and more.

**Location**: `.claude/ck.json`

## Complete Reference

### Top-Level Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `project` | string | `"ultrathink"` | Project name displayed in dashboard and status line |
| `version` | string | `"1.0.0"` | Configuration version |
| `defaultLanguage` | string | `"en"` | Default response language (`"en"`, `"vi"`, etc.) |
| `codingLevel` | string | `"practical-builder"` | Active coding level (see [Coding Levels](./coding-levels.md)) |
| `outputFormat` | string | `"markdown"` | Default output format for plans and reports |
| `defaultPlanDir` | string | `"./plans"` | Directory for plan documents |
| `archiveDir` | string | `"./plans/archive"` | Directory for archived plans |
| `journalDir` | string | `"./plans/journals"` | Directory for journey journals |

### `dashboard` Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | number | `3333` | Port for the dashboard server |

```json
{
  "dashboard": {
    "port": 3333
  }
}
```

### `statusline` Object

Controls what information is displayed in the status line during Claude Code sessions.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showMode` | boolean | `true` | Show current mode (skill name or idle) |
| `showMemory` | boolean | `true` | Show memory stats (count, last write) |
| `showContext` | boolean | `true` | Show context window usage |

```json
{
  "statusline": {
    "showMode": true,
    "showMemory": true,
    "showContext": true
  }
}
```

### `memory` Object

Controls memory system behavior.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | `"neon"` | Database provider (`"neon"` is the only supported option) |
| `autoRecall` | boolean | `true` | Automatically query relevant memories at session start |
| `writePolicy` | string | `"selective"` | Default write policy: `"always"`, `"selective"`, `"none"` |
| `compactionThreshold` | number | `100` | Number of memories per scope before compaction triggers |

```json
{
  "memory": {
    "provider": "neon",
    "autoRecall": true,
    "writePolicy": "selective",
    "compactionThreshold": 100
  }
}
```

**Write policies explained**:
- `"always"` -- persist after every significant skill execution
- `"selective"` -- persist only decisions, patterns, solutions, and high-value information
- `"none"` -- never auto-persist (manual only)

### `privacyHook` Object

Controls the privacy hook system.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Whether the privacy hook is active |
| `sensitivityLevel` | string | `"standard"` | Sensitivity level: `"standard"`, `"strict"`, `"paranoid"` |
| `logEvents` | boolean | `true` | Whether to log all hook events |

```json
{
  "privacyHook": {
    "enabled": true,
    "sensitivityLevel": "standard",
    "logEvents": true
  }
}
```

**Sensitivity levels**:
- `"standard"` -- block known secret patterns, log access
- `"strict"` -- also prompt for files outside project root
- `"paranoid"` -- prompt for all file reads, block all network without approval

See [Hooks and Privacy](./hooks-and-privacy.md) for detailed behavior.

### `notifications` Object

Configure external notification channels.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `telegram` | object or null | `null` | Telegram bot configuration |
| `telegram.token` | string | - | Bot token from BotFather |
| `telegram.chatId` | string | - | Target chat ID |
| `discord` | string or null | `null` | Discord webhook URL |
| `slack` | string or null | `null` | Slack incoming webhook URL |

```json
{
  "notifications": {
    "telegram": {
      "token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
      "chatId": "-1001234567890"
    },
    "discord": "https://discord.com/api/webhooks/123456/abcdef",
    "slack": "https://hooks.slack.com/services/T00/B00/XXXX"
  }
}
```

Set any channel to `null` to disable it.

### `kanban` Object

Controls the Kanban board system.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultBoard` | string | `"main"` | Default board name for new tasks |

```json
{
  "kanban": {
    "defaultBoard": "main"
  }
}
```

### `uiTest` Object

Controls UI testing behavior.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `viewports` | string[] | `["375x667", "768x1024", "1440x900"]` | Viewport dimensions as `WIDTHxHEIGHT` |
| `reportDir` | string | `"./reports/ui-tests"` | Output directory for test reports |

```json
{
  "uiTest": {
    "viewports": ["375x667", "768x1024", "1440x900"],
    "reportDir": "./reports/ui-tests"
  }
}
```

### `reports` Object

Controls report output.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `outputDir` | string | `"./reports"` | Base directory for all reports |

```json
{
  "reports": {
    "outputDir": "./reports"
  }
}
```

## Full Default Configuration

This is the complete default `ck.json` that ships with UltraThink:

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
  "dashboard": {
    "port": 3333
  },
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
  "kanban": {
    "defaultBoard": "main"
  },
  "uiTest": {
    "viewports": ["375x667", "768x1024", "1440x900"],
    "reportDir": "./reports/ui-tests"
  },
  "reports": {
    "outputDir": "./reports"
  }
}
```

## Common Modifications

### Change Coding Level

```json
{
  "codingLevel": "expert"
}
```

### Switch to Vietnamese

```json
{
  "defaultLanguage": "vi"
}
```

### Increase Compaction Threshold

Useful for projects with many long-lived memories:

```json
{
  "memory": {
    "compactionThreshold": 200
  }
}
```

### Enable Strict Privacy

For projects handling sensitive data:

```json
{
  "privacyHook": {
    "sensitivityLevel": "strict"
  }
}
```

### Add More Viewports

For thorough responsive testing:

```json
{
  "uiTest": {
    "viewports": [
      "320x568",
      "375x667",
      "390x844",
      "768x1024",
      "1024x768",
      "1280x720",
      "1440x900",
      "1920x1080"
    ]
  }
}
```

### Change Dashboard Port

If port 3333 is occupied:

```json
{
  "dashboard": {
    "port": 4444
  }
}
```

## Editing via Dashboard

The Settings page at `localhost:3333/settings` provides a visual editor for `ck.json` with validation. Changes are saved directly to the file.

## Related Documentation

- [Coding Levels](./coding-levels.md) -- Detailed coding level behavior
- [Memory System](./memory-system.md) -- Memory policy details
- [Hooks and Privacy](./hooks-and-privacy.md) -- Privacy hook configuration
- [UI Testing](./ui-testing.md) -- Viewport and report configuration
- [Dashboard Overview](./dashboard-overview.md) -- Dashboard port and settings page

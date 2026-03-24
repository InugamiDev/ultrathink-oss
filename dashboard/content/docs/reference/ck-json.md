# ck.json Reference

Complete reference for `.claude/ck.json`, the central configuration file.

## Top-Level Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `project` | string | `"ultrathink"` | Project name in dashboard and statusline |
| `version` | string | `"1.0.0"` | Configuration version |
| `defaultLanguage` | string | `"en"` | Response language (`"en"`, `"vi"`, etc.) |
| `codingLevel` | string | `"practical-builder"` | Active coding level |
| `outputFormat` | string | `"markdown"` | Default output format |
| `defaultPlanDir` | string | `"./plans"` | Plan document directory |
| `archiveDir` | string | `"./plans/archive"` | Archived plans directory |
| `journalDir` | string | `"./plans/journals"` | Journey journals directory |

## `dashboard`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | number | `3333` | Dashboard server port |

## `statusline`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `showMode` | boolean | `true` | Show current mode |
| `showMemory` | boolean | `true` | Show memory stats |
| `showContext` | boolean | `true` | Show context window usage |

## `memory`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | `"neon"` | Database provider |
| `autoRecall` | boolean | `true` | Query memories at session start |
| `writePolicy` | string | `"selective"` | `"always"`, `"selective"`, `"none"` |
| `compactionThreshold` | number | `100` | Memories per scope before compaction |

**Write policies**:
- `"always"` -- persist after every significant skill execution
- `"selective"` -- persist only decisions, patterns, solutions, high-value info
- `"none"` -- never auto-persist

## `privacyHook`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Privacy hook active |
| `sensitivityLevel` | string | `"standard"` | `"standard"`, `"strict"`, `"paranoid"` |
| `logEvents` | boolean | `true` | Log all hook events |

**Sensitivity levels**:
- `"standard"` -- block known secret patterns, log access
- `"strict"` -- + prompt for files outside project root
- `"paranoid"` -- + prompt for ALL file reads, block network

## `notifications`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `telegram` | object/null | `null` | `{ "token": "...", "chatId": "..." }` |
| `discord` | string/null | `null` | Discord webhook URL |
| `slack` | string/null | `null` | Slack incoming webhook URL |

Set any channel to `null` to disable.

## `kanban`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultBoard` | string | `"main"` | Default board for new tasks |

## `uiTest`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `viewports` | string[] | `["375x667", "768x1024", "1440x900"]` | Viewport dimensions as `WIDTHxHEIGHT` |
| `reportDir` | string | `"./reports/ui-tests"` | Test report output directory |

## `reports`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `outputDir` | string | `"./reports"` | Base directory for all reports |

## Full Default

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

## Editing

- **File**: Edit `.claude/ck.json` directly
- **Dashboard**: Settings page at `localhost:3333/settings` with validation

# Hooks

UltraThink uses 15+ hooks that fire on Claude Code lifecycle events to enforce privacy, manage memory, validate code quality, and dispatch notifications.

## All Hooks

| Event | Hook | What it does |
|-------|------|-------------|
| **SessionStart** | `memory-session-start.sh` | Recalls memories |
| **SessionStart** | `statusline.sh` | Renders 3-line CLI status bar (context %, skills, quotas) |
| **UserPromptSubmit** | `prompt-submit.sh` | Scores skills, recalls relevant memories, injects context |
| **PreToolUse** | `privacy-hook.sh` | Blocks access to `.env`, `.pem`, credentials |
| **PreToolUse** | `agent-tracker-pre.sh` | Tracks spawned subagents for statusline |
| **PostToolUse** | `post-edit-quality.sh` | Auto-formats (Biome/Prettier), validates JSON/shell |
| **PostToolUse** | `post-edit-typecheck.sh` | Runs TypeScript type checking on edited files |
| **PostToolUse** | `memory-auto-save.sh` | Saves architectural changes (migrations, schemas, configs) |
| **PostToolUse** | `tool-observe.sh` | Batches tool usage stats (file append, flushed at session end) |
| **PostToolUse** | `context-monitor.sh` | Warns at 65%/75% context usage, detects stuck agents |
| **PostToolUseFailure** | `tool-failure-log.sh` | Logs failures, detects patterns |
| **PreCompact** | `pre-compact.sh` | Saves transcript state before context compaction |
| **Stop** | `memory-session-end.sh` | Flushes pending memories, closes session |
| **Notification** | `desktop-notify.sh` | macOS desktop + Discord notifications |

## Hook Details

### Privacy Hook (`privacy-hook.sh`)

**Event**: PreToolUse | **Type**: File access control

Checks file paths against `.ckignore` patterns and built-in blocklists. Blocks access to sensitive files and logs all decisions.

**Built-in blocked patterns** (always enforced):

| Pattern | Protects |
|---------|----------|
| `.env`, `.env.*` | Environment variables |
| `*.pem`, `*.key` | Certificates and private keys |
| `*.p12`, `*.pfx` | PKCS#12 keystores |
| `*/credentials*` | Credential files |
| `*/secrets*` | Secret configuration |
| `*/tokens*` | Token storage |
| `*/.auth*` | Auth configuration |
| `*.keystore` | Java keystores |

**Built-in allow overrides**: `.env.example`, `.env.template`, `*.example.*`

### Memory Session Start (`memory-session-start.sh`)

**Event**: SessionStart

Recalls project-scoped memories and injects them into the session as `additionalContext`.

### Prompt Submit (`prompt-submit.sh`)

**Event**: UserPromptSubmit

Runs the `prompt-analyzer.ts` engine that scores skills against the prompt, performs intent detection, and injects the top 5 matching skills plus recalled memories as context.

### Quality Gate (`post-edit-quality.sh`)

**Event**: PostToolUse (matcher: Edit/Write)

| Extension | Check | Auto-fix |
|-----------|-------|----------|
| `ts`, `tsx`, `js`, `jsx` | Prettier format check | Yes |
| `json` | JSON syntax validation via `jq` | No (warns) |
| `sh`, `bash`, `zsh` | Shell syntax check via `bash -n` | No (warns) |
| `sql` | Manual review recommendation | No |

### Context Monitor (`context-monitor.sh`)

**Event**: PostToolUse

Monitors context window usage and warns at 65% and 75% thresholds. Detects stuck agents that are producing repetitive output.

### Notification Hook (`desktop-notify.sh`)

**Event**: Notification

Dispatches to configured channels (Telegram, Discord, Slack) with priority levels:

```bash
./notify.sh <message> [channel] [priority]
# priority: low | normal | high | critical
# channel: telegram | discord | slack | all
```

## Hook Event Logging

All hooks write to `reports/hook-events.jsonl`:

```json
{
  "timestamp": "2026-03-02T10:30:00Z",
  "severity": "warning",
  "action": "blocked",
  "path": "/project/.env.production",
  "description": "Built-in pattern matched: .env.*"
}
```

Events are also stored in the `hook_events` database table with session linkage for the dashboard.

## Dashboard Integration

The Hooks page at `localhost:3333/hooks` shows:

- Privacy hook event log with filtering by severity and type
- Blocked attempt history
- Event statistics and trends
- Incident tracker for escalated security events

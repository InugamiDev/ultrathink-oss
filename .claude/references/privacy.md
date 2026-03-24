# Privacy & Security Rules

## File Access Control

### Always Blocked (unless explicitly approved by user)
- `.env`, `.env.*` (except `.env.example`, `.env.template`)
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `**/credentials*`, `**/secrets*`, `**/tokens*`
- `~/.ssh/*`, `~/.aws/*`, `~/.gcloud/*`
- Any path matching patterns in `.ckignore`

### Sensitivity Levels

| Level | Behavior |
|-------|----------|
| `standard` | Block known secret patterns, log access |
| `strict` | Block + prompt for any file outside project root |
| `paranoid` | Block + prompt for all file reads, no network without approval |

## Output Sanitization

- Never echo API keys, tokens, passwords, or connection strings
- Redact sensitive values in error messages: `DATABASE_URL=postgres://****@...`
- Don't include real credentials in code examples — use placeholders
- Sanitize file paths that reveal system username in shared output

## Logging Requirements

All file access events are logged to `hook_events` with:
- `event_type`: `file_read`, `file_write`, `file_blocked`, `file_approved`
- `severity`: `info`, `warning`, `critical`
- `path_accessed`: The file path
- `action_taken`: `allowed`, `blocked`, `prompted`

## Network Security

- Don't make HTTP requests to unknown endpoints without user approval
- Log all outbound API calls
- Never transmit file contents to third-party services without consent
- Prefer HTTPS over HTTP

## Memory Privacy

- Don't persist secrets or credentials in the memory system
- Redact sensitive values before storing memories
- Memory compaction must preserve privacy — don't summarize secrets

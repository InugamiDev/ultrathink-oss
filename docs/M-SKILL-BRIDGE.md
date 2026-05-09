# M-SKILL-BRIDGE — L2 Heartbeat Skill Router

## Problem

UltraThink's auto-router (`prompt-analyzer.ts`) only fires on `UserPromptSubmit`. Paperclip-spawned agents (Steven/Mira/etc.) wake via heartbeat resumes that never generate a user prompt, so they never get the top-5 skill suggestions that make UltraThink fast.

## Solution

A new SessionStart hook — `.claude/hooks/heartbeat-skill-router.sh` — runs once per heartbeat. When `PAPERCLIP_AGENT_ID` is set, it:

1. Synthesizes a prompt from agent role (`PAPERCLIP_AGENT_TITLE`) + issue title/description (`GET /api/issues/{TASK_ID}`) + last 3 comments.
2. Pipes that prompt to the existing compiled `dist/prompt-analyzer.js`.
3. Joins the top-5 skill names with their descriptions from `_registry.json` and emits them as a markdown block in `additionalContext`.

When `PAPERCLIP_AGENT_ID` is unset (UltraThink solo mode), the hook returns `{}` immediately. Solo behaviour unchanged.

## Files

- Hook: `.claude/hooks/heartbeat-skill-router.sh`
- User symlink: `~/.claude/hooks/ultrathink-heartbeat-skill-router.sh`
- Settings entry: 4th SessionStart block in `~/.claude/settings.json` (timeout 5000ms)

## Timeout / fallback

- Each Paperclip API call: `curl --max-time 2` plus 3s outer wrapper.
- Analyzer: 4s outer wrapper.
- Wrapper uses `gtimeout` / `timeout` if available; otherwise a bash watchdog with `pkill -P` to reap the orphaned `sleep` (without this, the hook sits idle for the full timeout window after success).
- Any failure path (no analyzer output, network unreachable, hung node, missing registry) returns `{}` — the hook never errors out the session.

## Debugging

- Hook logs: `/tmp/ultrathink-hook-logs/$(date +%Y-%m-%d).jsonl` — grep for `"hook":"heartbeat-skill"`.
- Statuses: `started`, `injected` (skills CSV in `detail`), `no-skills`, `skipped` (missing deps), `render-failed`.
- To smoke-test locally:
  ```
  export PAPERCLIP_AGENT_ID=<id> PAPERCLIP_TASK_ID=<id> \
         PAPERCLIP_RUN_ID=t PAPERCLIP_API_URL=http://127.0.0.1:3100 \
         PAPERCLIP_AGENT_TITLE=code-integrator
  echo '{}' | bash .claude/hooks/heartbeat-skill-router.sh
  ```
  Expect: JSON with `hookSpecificOutput.additionalContext` containing a "## Top 5 skills for this heartbeat" block.

## If skills aren't appearing in agent context

1. Confirm hook is registered: `jq '.hooks.SessionStart[].hooks[].command' ~/.claude/settings.json`.
2. Confirm symlink points at the project file: `ls -la ~/.claude/hooks/ultrathink-heartbeat-skill-router.sh`.
3. Confirm compiled analyzer exists: `ls .claude/hooks/dist/prompt-analyzer.js`.
4. Check the hook log for the `injected` status with non-empty skills CSV.
5. Confirm `PAPERCLIP_AGENT_ID` is exported into the agent's env at wake time.

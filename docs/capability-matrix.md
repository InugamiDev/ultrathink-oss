# Versioned Capability Matrix

Last updated: 2026-05-08

This matrix tracks what UltraThink can provide across agent runners. It is a capability contract, not a marketing checklist: `Full` means the feature is wired into that runner's normal lifecycle, `Partial` means the feature works with adapter limits, `Manual` means the assets can be used but the runner does not automate them, and `None` means there is no maintained integration today.

## Runner Support

| Capability | Claude Code | Codex CLI | OpenAI API | Cursor / other runners |
|------------|-------------|-----------|------------|------------------------|
| Skills | Full | Full | Manual | Manual |
| Hooks | Full | Partial | Manual | Partial |
| Memory | Full | Full | Manual | Manual |
| MCP | Full | Partial | Manual | Partial |
| Dashboard | Full | Full | Full | Full |
| Auto-trigger | Full | Partial | Manual | Manual |

## Version Notes

| Runner | Supported surface | Primary config | Notes |
|--------|-------------------|----------------|-------|
| Claude Code | Native UltraThink runtime | `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/`, `.mcp.json` | Canonical integration. Supports full hook lifecycle, prompt analyzer auto-triggering, MCP servers, memory recall/save, dashboard telemetry, and privacy enforcement. |
| Codex CLI | Codex-aware bridge | `AGENTS.md`, `.codex/config.toml`, `.codex/hooks.json` | Uses the same skill and memory assets, with runner-specific hook wiring. Lifecycle coverage is smaller than Claude Code, so some hooks are adapted or omitted. See [Install - OpenAI Codex CLI](./install-codex.md). |
| OpenAI API | Embeddable building blocks | Host application code | No first-party runtime lifecycle. Skills, memory, MCP, and trigger logic can be called from an application, but the app must orchestrate prompt assembly, tool dispatch, memory reads/writes, and audit logging. |
| Cursor / other runners | Best-effort portability | Runner-specific rules, MCP, or hook config | UltraThink instructions and skills are portable as files. Native hook lifecycle, automatic skill dispatch, and memory persistence depend on each runner's extension points. |

## Capability Definitions

| Capability | Definition |
|------------|------------|
| Skills | `.claude/skills/*/SKILL.md` instructions are discoverable and usable by the runner. |
| Hooks | Pre/post lifecycle scripts can enforce privacy, load context, capture failures, run quality gates, and flush memory. |
| Memory | Postgres-backed memory can be recalled, searched, saved, and flushed during the working session. |
| MCP | Model Context Protocol servers can expose VFS, memory, code intelligence, or other tools to the runner. |
| Dashboard | The local Next.js dashboard can inspect memory, hooks, skills, plans, and system health at `localhost:3333`. |
| Auto-trigger | Prompt analysis can select relevant skills or context automatically before the model responds. |

## Maintenance Rules

1. Update this file whenever a runner gains or loses support for skills, hooks, memory, MCP, dashboard, or auto-trigger.
2. Keep runner-specific install docs in sync with this matrix.
3. Prefer `Partial` over `Full` when a capability requires manual setup, lacks lifecycle parity, or has runner-specific omissions.
4. Do not mark OpenAI API support as `Full` unless a maintained host package provides the lifecycle, memory, tool, and trigger orchestration.

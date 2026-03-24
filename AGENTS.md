# UltraThink Agent Instructions

## Cross-Agent Rules

All agents within UltraThink must follow these instructions regardless of their specialization.

### Memory Protocol

1. **Read before write** — Check existing memories for context before creating new ones
2. **Selective persistence** — Only write memories with lasting value (decisions, patterns, blockers)
3. **Tag appropriately** — Use project, file, and category scopes
4. **Confidence ratings** — Score 0.0–1.0 based on how verified the information is

### Privacy Protocol

1. **Check .ckignore** — Never access files matching ignore patterns without explicit approval
2. **No secrets in output** — Never echo API keys, tokens, or credentials
3. **Log access** — All file reads should be logged for audit trail
4. **Ask before accessing** — Sensitive paths require user confirmation

### Quality Protocol

1. **Read before modify** — Always read existing code before suggesting changes
2. **Minimal diff** — Make the smallest change that solves the problem
3. **No hallucination** — If unsure, search or ask rather than guessing
4. **Test verification** — Verify changes work before marking complete

### Communication Protocol

1. **Structured output** — Use headers, lists, and code blocks for clarity
2. **Concise by default** — Adapt verbosity to the user's coding level
3. **Show reasoning** — For non-obvious decisions, explain the why
4. **Flag uncertainty** — Clearly mark assumptions and unknowns

## Available Agents

| Agent | Role | Context |
|-------|------|---------|
| planner | Implementation planning | Full project context |
| architect | System design | Architecture patterns |
| code-reviewer | Code review | Changed files + surrounding code |
| debugger | Bug hunting | Error logs + relevant source |
| security-auditor | Security scanning | Full codebase access |
| scout | Codebase exploration | Full codebase access |
| researcher | Deep research | Web + docs access |
| tester | Test generation | Source + test files |
| docs-writer | Documentation | Source + existing docs |
| memory-curator | Memory management | Memory database |

## Agent Handoff

When an agent needs capabilities outside its scope:
1. Complete current analysis with available context
2. Document findings and handoff notes
3. Recommend the appropriate next agent
4. Include any relevant context for the receiving agent

---
name: context-budget
description: Token overhead audit for UltraThink context window. Inventories skills, MCPs, hooks, and rules to detect bloat and optimize token usage.
layer: utility
category: optimization
triggers:
  - context budget
  - token audit
  - context overhead
  - token optimization
  - context window filling
  - slow responses
  - hitting limits
linksTo:
  - strategic-compact
  - cost-aware-pipeline
riskLevel: low
---

# Context Budget — Token Overhead Audit

Audit your UltraThink context window to find bloat and reclaim tokens.

## When to Use

- Context window filling up (responses slowing, truncation)
- Hit token limits mid-task
- Adding new MCPs or skills and want to check overhead
- Periodic hygiene check

## 4-Phase Audit

### Phase 1: Inventory

List every context consumer and its approximate token cost:

| Component | Source | Est. Tokens |
|-----------|--------|-------------|
| CLAUDE.md (global) | `~/.claude/CLAUDE.md` | 500–2000 |
| CLAUDE.md (project) | `./CLAUDE.md` | 500–2000 |
| Auto-triggered skills | Hook scores top 5 | 100–300 each |
| MCP tool schemas | Always loaded per server | 200–500 per tool |
| Hook outputs | `additionalContext` injection | 50–200 each |
| System prompt rules | Built-in instructions | ~1000 fixed |
| Memory context | Session start recall | 200–800 |
| Conversation history | Messages so far | Varies |

**Quick inventory command:**
```bash
# Count CLAUDE.md tokens (rough: words × 1.3)
wc -w ~/.claude/CLAUDE.md ./CLAUDE.md
# Count MCP tools
grep -c '"name"' .mcp.json
# Count active skills
cat .claude/skills/_registry.json | grep '"name"' | wc -l
```

### Phase 2: Classify

Categorize each consumer:

- **Essential**: Core task context, active skill, required MCP
- **Helpful**: Nice-to-have context, occasionally used MCP
- **Deadweight**: Unused MCP, irrelevant skill, stale memory

### Phase 3: Detect Bloat

Common bloat patterns:

1. **Unused MCPs**: Server registered but tools never called this session → ~200-500 tokens wasted per tool
2. **Oversized CLAUDE.md**: Project instructions exceeding 1500 tokens → trim or move to reference docs
3. **Redundant skills**: Multiple skills covering same domain auto-triggered simultaneously
4. **Stale memory**: Old session memories recalled but irrelevant to current task
5. **Verbose hook output**: Hooks injecting large context blocks on every prompt
6. **Full file reads**: Reading entire files instead of using VFS signatures (60–98% savings)

### Phase 4: Report

Generate a budget report:

```
## Context Budget Report

**Total estimated overhead**: ~X,XXX tokens
**Conversation usage**: ~XX,XXX tokens
**Available headroom**: ~XX,XXX tokens

### Bloat Detected
- [ ] MCP "calendar" loaded but unused (est. 1,200 tokens for 6 tools)
- [ ] 3 skills auto-triggered with overlapping coverage
- [ ] CLAUDE.md project file at 2,100 tokens (consider splitting)

### Recommendations
1. Disable unused MCP servers for this session
2. Consolidate overlapping skills
3. Move reference docs out of CLAUDE.md into .claude/references/
4. Use VFS instead of full file reads
5. Compact conversation if >50% of context is stale
```

## Token Estimation Reference

| Item | Tokens (approx) |
|------|-----------------|
| 1 MCP tool schema | 200–500 |
| 1 auto-triggered skill | 100–300 |
| CLAUDE.md (typical) | 500–2000 |
| Memory recall block | 200–800 |
| VFS signature output | 100–300 per file |
| Full file read | 1000–5000 per file |
| Hook context injection | 50–200 per hook |

## Integration with UltraThink

- Use `mcp__vfs__stats` to get project overview without reading files
- Check `.claude/hooks/prompt-analyzer.ts` for auto-trigger overhead
- Review `_registry.json` to see which skills have high trigger overlap
- After audit, consider running `strategic-compact` to reclaim space

# Core Behavior Rules

## Response Pattern

1. **Acknowledge** — Confirm understanding of the request
2. **Assess** — Determine scope, complexity, and which skills apply
3. **Plan** — For non-trivial tasks, outline approach before executing
4. **Execute** — Implement with structured step markers
5. **Verify** — Confirm the result meets the request

## Skill Selection

- Check `_registry.json` for matching skill triggers
- Prefer higher-layer skills (orchestrators > hubs > utilities > domain)
- If multiple skills match, pick the most specific one
- Chain skills when the task spans multiple domains

## Output Structure

- Use step markers: `## Step N: [Description]`
- Break code into logical sections
- Include brief explanations for non-obvious logic
- Show file paths for all code output

## Error Handling

- When blocked, explain what happened and suggest alternatives
- Never silently fail — always surface errors to the user
- For ambiguous errors, hypothesize top 2-3 causes
- Use the `debug` skill for systematic debugging

## Context Management

- Keep responses focused and concise
- For large outputs, offer to break into parts
- Reference existing files rather than repeating content
- Use the `context-engineering` skill for long conversations

## VFS — Token-Efficient Code Discovery

When exploring unfamiliar code or large files, prefer `vfs` (Virtual Function Signatures) over reading full files:
- `vfs <path>` — extracts exported function/class/interface signatures, stripping bodies (60-98% token savings)
- `vfs <directory>` — recursively scans all supported files
- Supports: TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, Ruby, PHP, Swift, Kotlin, Scala, Dart
- Use VFS first to understand structure, then Read only the specific functions you need
- Available as MCP server (`vfs mcp`) — configured in `.mcp.json`

## Context Window Optimization (Token Savings)

Every token in = money spent. Follow these rules to minimize waste:

### Input (99.4% of cost)
- **VFS first, Read second**: Use `vfs <path>` to get signatures (60-98% savings). Only `Read` the specific lines you need.
- **Never re-read**: If you already read a file in this session, reference it from memory — don't read again.
- **Scope commands**: `npm test -- path/to/test.ts` not `npm test`. `grep -l pattern src/` not `grep -r pattern .`.
- **Use Glob/Grep**: Find specific files/patterns instead of reading entire directories.
- **Use Agent for broad search**: Offloads exploration to subagent, keeping main context clean.
- **Limit context in code blocks**: Show only the changed lines + ~3 lines of surrounding context, not entire files.

### Output (conciseness = fewer round trips)
- Lead with the answer, skip preamble.
- Don't summarize what you just did — the user can see the diff.
- Don't add docstrings/comments to code you didn't change.
- Use `Edit` over `Write` — sends only the diff, not the whole file.

### Thinking (model efficiency)
- For simple tasks: act immediately, don't over-plan.
- For complex tasks: use `plan` mode to align once, then execute without re-explaining.
- Reference files by path, not by quoting content.

### Task Tracking (mandatory)
- **2+ steps = TaskCreate** before any code. No exceptions.
- Update tasks to `in_progress` / `completed` as you go.
- Tasks survive compaction — use them as your progress anchor.

## Conversation Hygiene

- Don't repeat information the user already knows
- Ask clarifying questions early, not mid-implementation
- Mark assumptions explicitly: "Assuming X because..."
- Flag when a task exceeds reasonable scope for a single turn

# Agents Catalog

UltraThink includes **10 agents** -- specialized roles with defined scopes, workflows, and constraints. Agents differ from skills: **skills define what to do** (workflow steps), while **agents define who is doing it** (role, perspective, constraints).

## Agent Selection Guide

| Task | Agent |
|------|-------|
| "How should we build X?" | Planner |
| "Design the architecture for X" | Architect |
| "Review this code" | Code Reviewer |
| "This is broken, find the bug" | Debugger |
| "Check for security issues" | Security Auditor |
| "Explore this codebase" | Scout |
| "Research library X vs Y" | Researcher |
| "Write tests for X" | Tester |
| "Document this API" | Docs Writer |
| "Clean up memory" | Memory Curator |

## Cross-Agent Protocols

All agents follow four mandatory protocols:

### Memory Protocol
1. Read before write -- check existing memories before creating new ones
2. Selective persistence -- only write lasting-value memories
3. Tag appropriately -- use project, file, and category scopes
4. Confidence ratings -- score 0.0-1.0 based on verification

### Privacy Protocol
1. Check `.ckignore` -- never access files matching ignore patterns
2. No secrets in output -- never echo API keys, tokens, or credentials
3. Log access -- all file reads logged for audit
4. Ask before accessing sensitive paths

### Quality Protocol
1. Read before modify -- always read existing code first
2. Minimal diff -- smallest change that solves the problem
3. No hallucination -- search or ask rather than guessing
4. Test verification -- verify changes work

### Communication Protocol
1. Structured output -- headers, lists, code blocks
2. Concise by default -- adapt verbosity to coding level
3. Show reasoning for non-obvious decisions
4. Flag uncertainty -- mark assumptions and unknowns

## The 10 Agents

### 1. Planner

**Role**: Creates detailed, phased implementation plans.

**Skills**: `plan`, `sequential-thinking`, `scout`, `data-modeling`

**Workflow**: Analyze request -> research context -> identify dependencies -> draft phases (3-7) -> risk assessment -> output plan

**Constraints**: Each phase independently verifiable. Include rollback considerations. Reference specific files, not abstract concepts.

### 2. Architect

**Role**: Designs system architecture, evaluates trade-offs, documents ADRs.

**Skills**: `mermaid`, `data-modeling`, `api-designer`, `sequential-thinking`

**Output**: Component diagrams (Mermaid), data flows, API surfaces, trade-off comparison tables.

**Constraints**: Always document decisions as ADRs. Prefer boring technology. Design for testability.

### 3. Code Reviewer

**Role**: Multi-pass code review covering logic, security, performance, style.

**Skills**: `security-scanner`, `performance-profiler`, `testing-patterns`

**Review passes**:
1. Logic & Correctness -- edge cases, error handling, race conditions
2. Security -- injection, input validation, auth boundaries
3. Performance -- N+1 queries, re-renders, memory leaks
4. Style & Maintainability -- naming, function length, readability

**Severity levels**: Critical (blocks merge), Important (should fix), Minor (nice to have)

### 4. Debugger

**Role**: Hypothesis-driven debugging loops.

**Skills**: `debug`, `scout`, `chrome-devtools`, `sequential-thinking`

**Workflow**: Reproduce -> hypothesize (2-3) -> investigate -> narrow -> root cause -> fix -> verify

**Constraints**: Never guess -- form and test hypotheses. Save significant solutions to memory.

### 5. Security Auditor

**Role**: Scans for vulnerabilities, misconfigurations, compliance issues.

**Skills**: `security-scanner`, `owasp`, `dependency-analyzer`, `encryption`

**Checklist**: OWASP Top 10 + secrets, dependencies, headers, CORS, rate limiting

**Output**: Executive summary with critical/high/medium/low counts, detailed findings with location, impact, remediation, and OWASP/CWE references.

### 6. Scout

**Role**: Explores and maps codebases.

**Skills**: `scout`, `mermaid`, `dependency-analyzer`, `code-explainer`

**Modes**:
- **Quick Scan**: Directory tree, package manifests, key files
- **Deep Scan**: Full dependency graph, patterns, schema, routes, coverage
- **Targeted Scan**: Specific feature, end-to-end flow trace

**Constraints**: Read only, don't modify. Map structure before details. Save architectural findings to memory.

### 7. Researcher

**Role**: Deep research using web search, documentation, and synthesis.

**Skills**: `research`, `docs-seeker`, `sequential-thinking`

**Modes**: Quick lookup (1-2 sources), comparison (2-4 options with pros/cons), deep dive (multiple source verification)

**Constraints**: Always cite sources with URLs. Rate source quality. Prefer recent sources.

### 8. Tester

**Role**: Generates and executes tests.

**Skills**: `test`, `testing-patterns`, `test-ui`

**Workflow**: Analyze -> plan strategy -> generate tests -> execute -> report coverage

**Constraints**: Follow existing test patterns. Prioritize meaningful tests over coverage numbers.

### 9. Docs Writer

**Role**: Technical documentation generation.

**Skills**: `docs-writer`, `mermaid`, `code-explainer`, `api-designer`

**Types**: API docs, architecture docs, user guides, code documentation.

**Constraints**: Write for target audience (check coding level). Verify code examples. Update existing docs over creating duplicates.

### 10. Memory Curator

**Role**: Memory health -- compaction, deduplication, accuracy verification.

**Operations**:
- **Compaction**: Group low-importance memories, summarize, archive
- **Deduplication**: Find similar content, keep highest-confidence version
- **Accuracy Audit**: Check low-confidence memories against current codebase
- **Health Report**: Statistics by category/scope/importance, stale detection

**Constraints**: Never delete importance 8+ without approval. Always create summaries before archiving. Preserve `decision` category memories.

## Agent Handoff

When an agent needs capabilities outside its scope:

1. Complete current analysis with available context
2. Document findings and handoff notes
3. Recommend the appropriate next agent
4. Include relevant context for the receiving agent

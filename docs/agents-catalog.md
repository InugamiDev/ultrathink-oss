# Agents Catalog

## Overview

UltraThink includes **10 agents** -- specialized roles that operate within the Claude Code environment. Each agent has a defined scope, workflow, output format, and set of skills it uses. Agents are defined in `.claude/agents/[name].md`.

Agents differ from skills in an important way: **skills define what to do** (the workflow steps), while **agents define who is doing it** (the role, perspective, and constraints). When an agent is activated, it brings its specialized perspective to the task at hand.

## Cross-Agent Protocols

All agents follow four mandatory protocols defined in `AGENTS.md`:

### Memory Protocol
1. Read before write -- check existing memories for context before creating new ones
2. Selective persistence -- only write memories with lasting value
3. Tag appropriately -- use project, file, and category scopes
4. Confidence ratings -- score 0.0-1.0 based on verification level

### Privacy Protocol
1. Check `.ckignore` -- never access files matching ignore patterns without approval
2. No secrets in output -- never echo API keys, tokens, or credentials
3. Log access -- all file reads are logged for audit trail
4. Ask before accessing -- sensitive paths require user confirmation

### Quality Protocol
1. Read before modify -- always read existing code before suggesting changes
2. Minimal diff -- make the smallest change that solves the problem
3. No hallucination -- if unsure, search or ask rather than guessing
4. Test verification -- verify changes work before marking complete

### Communication Protocol
1. Structured output -- use headers, lists, and code blocks
2. Concise by default -- adapt verbosity to coding level
3. Show reasoning -- for non-obvious decisions, explain the why
4. Flag uncertainty -- clearly mark assumptions and unknowns

## Agent Handoff

When an agent needs capabilities outside its scope, it follows a structured handoff:

1. Complete current analysis with available context
2. Document findings and handoff notes
3. Recommend the appropriate next agent
4. Include relevant context for the receiving agent

---

## 1. Planner Agent

**File**: `.claude/agents/planner.md`

**Role**: Creates detailed, phased implementation plans for complex tasks.

**Context Access**: Full project structure, existing plans in `plans/`, memory (decisions, patterns, past plans), `ck.json` configuration.

**Workflow**:
1. Analyze Request -- break down the task into components
2. Research Context -- check memory for relevant past decisions
3. Identify Dependencies -- map prerequisite ordering
4. Draft Phases -- create ordered phases with deliverables (3-7 phases)
5. Risk Assessment -- identify risks, assumptions, unknowns
6. Output Plan -- write structured plan to `plans/` directory

**Skills Used**: `plan`, `sequential-thinking`, `scout`, `data-modeling`

**Constraints**: Each phase must be independently verifiable. Always include rollback considerations for risky operations. Reference specific files and modules, not abstract concepts.

---

## 2. Architect Agent

**File**: `.claude/agents/architect.md`

**Role**: Designs system architecture, evaluates trade-offs, and documents architectural decisions.

**Context Access**: Full project structure, existing architecture decisions in memory, tech stack documentation, performance requirements.

**Workflow**:
1. Understand Requirements -- clarify functional and non-functional needs
2. Survey Existing Architecture -- map current system structure
3. Identify Patterns -- select appropriate architectural patterns
4. Design Components -- define boundaries and interfaces
5. Evaluate Trade-offs -- compare alternatives with clear criteria
6. Document Decision -- record ADR (Architecture Decision Record) to memory

**Skills Used**: `mermaid`, `data-modeling`, `api-designer`, `sequential-thinking`

**Output Format**: Includes component diagrams (Mermaid), data flow descriptions, API surface definitions, and a trade-off comparison table.

**Constraints**: Always document decisions as ADRs. Prefer boring technology. Design for testability.

---

## 3. Code Reviewer Agent

**File**: `.claude/agents/code-reviewer.md`

**Role**: Performs multi-pass code review covering logic, security, performance, and style.

**Context Access**: Changed files and diffs, surrounding code context (full files), project conventions from memory, quality rules.

**Review Passes**:
1. **Logic & Correctness** -- edge cases, error handling, off-by-one errors, race conditions
2. **Security** -- injection vulnerabilities, input validation, auth boundaries, exposed secrets
3. **Performance** -- N+1 queries, unnecessary re-renders, memory leaks, algorithmic complexity
4. **Style & Maintainability** -- naming, function length, test coverage, readability

**Skills Used**: `security-scanner`, `performance-profiler`, `testing-patterns`

**Output Severity Levels**: Critical (blocks merge), Important (should fix), Minor (nice to have).

**Constraints**: Always read the full file, not just the diff. Be constructive -- suggest fixes. Recognize good patterns explicitly.

---

## 4. Debugger Agent

**File**: `.claude/agents/debugger.md`

**Role**: Systematically hunts bugs using hypothesis-driven debugging loops.

**Context Access**: Error logs and stack traces, relevant source files, recent changes (git log/diff), memory of past bugs.

**Workflow**:
1. Reproduce -- understand exact failure conditions
2. Hypothesize -- form 2-3 hypotheses for root cause
3. Investigate -- gather evidence for each hypothesis
4. Narrow -- eliminate hypotheses based on evidence
5. Root Cause -- identify definitive cause
6. Fix -- apply minimal fix
7. Verify -- confirm fix without regressions

**Debugging Techniques**: Binary search (git bisect), trace analysis, diff analysis, isolation.

**Skills Used**: `debug`, `scout`, `chrome-devtools`, `sequential-thinking`

**Constraints**: Never guess -- form hypotheses and test them. Check memory for similar past bugs. Document the debugging journey. Save significant solutions to memory.

---

## 5. Security Auditor Agent

**File**: `.claude/agents/security-auditor.md`

**Role**: Scans codebase for security vulnerabilities, misconfigurations, and compliance issues.

**Context Access**: Full codebase, dependency manifests, configuration files, environment variable patterns.

**Audit Checklist**: OWASP Top 10 (Injection, Broken Auth, Sensitive Data Exposure, XXE, Broken Access Control, Security Misconfiguration, XSS, Insecure Deserialization, Known Vulnerable Components, Insufficient Logging) plus additional checks for secrets, dependencies, headers, CORS, and rate limiting.

**Skills Used**: `security-scanner`, `owasp`, `dependency-analyzer`, `encryption`

**Output**: Executive summary with critical/high/medium/low counts, detailed findings with location, description, impact, remediation, and OWASP/CWE references.

**Constraints**: Never exploit vulnerabilities. Report with clear remediation steps. Prioritize by exploitability and impact. Save critical findings to memory.

---

## 6. Scout Agent

**File**: `.claude/agents/scout.md`

**Role**: Explores and maps codebases to understand structure, patterns, and entry points.

**Context Access**: Full codebase, file system structure, git history, package manifests.

**Reconnaissance Modes**:
- **Quick Scan**: Directory tree, package manifests, key files
- **Deep Scan**: Full dependency graph, code patterns, database schema, API routes, test coverage
- **Targeted Scan**: Specific feature or module, end-to-end flow trace, entity touchpoints

**Skills Used**: `scout`, `mermaid`, `dependency-analyzer`, `code-explainer`

**Output**: Annotated directory tree, tech stack summary, entry points, architecture pattern description, key files table, dependency map, and observations.

**Constraints**: Read files, don't modify them. Map structure before diving into details. Focus on task relevance. Save architectural findings to memory.

---

## 7. Researcher Agent

**File**: `.claude/agents/researcher.md`

**Role**: Conducts deep research on technical topics using web search, documentation, and knowledge synthesis.

**Context Access**: Web search, Context7 documentation retrieval, existing memory, project context.

**Research Modes**:
- **Quick Lookup**: Single question, 1-2 sources, factual answer
- **Comparison Research**: 2-4 options with pros/cons matrix and recommendation
- **Deep Dive**: Comprehensive exploration with multiple source verification

**Skills Used**: `research`, `docs-seeker`, `sequential-thinking`

**Output**: Question statement, findings per source, synthesis analysis, clear recommendation with reasoning, and cited sources with quality ratings.

**Constraints**: Always cite sources with URLs. Rate source quality (official docs > blog posts > forum answers). Prefer recent sources. Flag potentially outdated information.

---

## 8. Tester Agent

**File**: `.claude/agents/tester.md`

**Role**: Generates and executes tests, ensuring comprehensive coverage and quality.

**Context Access**: Source files, existing test files and patterns, test framework config, memory of past strategies.

**Workflow**:
1. Analyze -- understand testing needs and current coverage
2. Plan -- determine test strategy (unit, integration, e2e)
3. Generate -- write tests covering happy path, edge cases, error cases
4. Execute -- run tests and analyze results
5. Report -- summarize coverage and failures

**Skills Used**: `test`, `testing-patterns`, `test-ui`

**Constraints**: Follow existing test patterns. Prioritize meaningful tests over coverage numbers. Don't test framework behavior, test business logic.

---

## 9. Docs Writer Agent

**File**: `.claude/agents/docs-writer.md`

**Role**: Generates clear, comprehensive technical documentation.

**Context Access**: Source code, existing documentation, API routes and schemas, memory for conventions.

**Documentation Types**: API docs, architecture docs, user guides, code documentation.

**Skills Used**: `docs-writer`, `mermaid`, `code-explainer`, `api-designer`

**Constraints**: Write for the target audience (check coding level). Verify all code examples. Keep docs close to the code they describe. Update existing docs rather than creating duplicates.

---

## 10. Memory Curator Agent

**File**: `.claude/agents/memory-curator.md`

**Role**: Manages memory health -- compaction, deduplication, accuracy verification, and cleanup.

**Context Access**: Full memory database, memory rules from `.claude/references/memory.md`, compaction threshold from `ck.json`.

**Operations**:
- **Compaction**: Group low-importance memories by scope, summarize, archive originals
- **Deduplication**: Find similar content, keep highest-confidence version, archive duplicates
- **Accuracy Audit**: Check low-confidence memories against current codebase, flag contradictions
- **Health Report**: Statistics by category/scope/importance, stale memory detection, orphaned tags

**Constraints**: Never delete importance 8+ memories without approval. Always create summaries before archiving. Log all compaction actions. Preserve decision-category memories.

## Agent Selection Guide

| Task | Recommended Agent |
|------|-------------------|
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

## Related Documentation

- [Claude Workflow Overview](./claude-workflow-overview.md) -- System architecture
- [Skills Catalog](./skills-catalog.md) -- Skills used by agents
- [Memory System](./memory-system.md) -- Memory protocols agents follow
- [Hooks and Privacy](./hooks-and-privacy.md) -- Privacy protocols agents follow
- [Coding Levels](./coding-levels.md) -- How coding level affects agent verbosity

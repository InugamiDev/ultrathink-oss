---
name: docs-seeker
description: Documentation discovery, retrieval, and synthesis across local files, APIs, and external sources
layer: utility
category: knowledge
triggers:
  - "find documentation"
  - "how does this library work"
  - "what does this API do"
  - "look up the docs"
  - "find examples for"
  - "reference for"
inputs:
  - query: What documentation is needed
  - library_or_tool: Specific library, framework, or tool name
  - version: Target version (optional)
  - scope: local | external | both
outputs:
  - documentation: Retrieved and synthesized documentation
  - sources: List of sources with reliability ratings
  - code_examples: Relevant code examples from docs
  - version_notes: Version-specific caveats or changes
linksTo:
  - context-engineering
  - repomix
linkedFrom:
  - orchestrator
  - planner
  - code-architect
preferredNextSkills:
  - context-engineering
  - sequential-thinking
fallbackSkills:
  - context-engineering
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

# Docs Seeker

## Purpose

This skill systematically locates, retrieves, and synthesizes documentation from multiple sources. It prevents hallucination by grounding responses in actual documentation rather than training data, and it ensures version-accurate information by checking the correct version of library docs.

## Key Concepts

### Documentation Source Hierarchy

Always prefer higher-reliability sources:

| Priority | Source | Reliability | Tool |
|----------|--------|-------------|------|
| 1 | Official docs (current version) | Highest | Context7, WebFetch |
| 2 | Source code / type definitions | High | Read, Grep, Glob |
| 3 | Official examples / tutorials | High | Context7, WebFetch |
| 4 | README / CHANGELOG in repo | High | Read |
| 5 | GitHub Issues / Discussions | Medium | WebSearch, gh CLI |
| 6 | Stack Overflow (high-vote) | Medium | WebSearch |
| 7 | Blog posts / tutorials | Low-Medium | WebSearch |
| 8 | Training data (model memory) | Lowest | Internal (last resort) |

### Version Awareness

Documentation is only useful if it matches the version in use:

```
STEP 1: Determine the version in use
  - Check package.json / requirements.txt / go.mod / Cargo.toml
  - Check lock files for exact resolved version
  - Check runtime: node -e "require('pkg/package.json').version"

STEP 2: Retrieve docs for THAT version
  - Context7: Specify version if available
  - Official docs: Use versioned URL (e.g., docs.example.com/v3/)
  - GitHub: Use tagged release (e.g., github.com/org/repo/tree/v3.2.1)

STEP 3: Flag version mismatches
  - If docs are for a different version, explicitly note the discrepancy
  - Highlight breaking changes between versions
```

## Workflow

### Phase 1: Query Analysis

Before searching, understand what is actually needed:

```
QUERY: "How do I use middleware in Express?"

ANALYSIS:
  - Library: Express.js
  - Topic: Middleware registration and execution
  - Scope: Usage patterns (not internal implementation)
  - Version needed: Check project's package.json
  - Depth: Practical examples, not theoretical overview
```

### Phase 2: Local Documentation Search

Check the project itself first:

```
SEARCH ORDER:
  1. README.md, CONTRIBUTING.md in project root
  2. /docs directory (if exists)
  3. Inline code comments and JSDoc/docstrings
  4. Type definitions (.d.ts, type hints)
  5. Test files (often serve as usage documentation)
  6. Configuration files (reveal available options)
  7. CHANGELOG.md (version-specific behavior changes)
```

Tools to use:
- `Glob` to find documentation files: `**/*.md`, `**/docs/**`
- `Grep` to search for specific terms across the codebase
- `Read` to examine specific files

### Phase 3: External Documentation Retrieval

```
STRATEGY A — Context7 (preferred for libraries):
  1. Resolve library ID: context7.resolve-library-id
  2. Query specific topic: context7.query-docs
  3. Extract code examples and API signatures

STRATEGY B — Official Documentation Sites:
  1. WebFetch the documentation URL
  2. Process with specific extraction prompt
  3. Verify version matches

STRATEGY C — Web Search (for niche topics):
  1. WebSearch with specific query including version
  2. Filter results by source reliability
  3. Cross-reference multiple sources

STRATEGY D — Source Code (when docs are insufficient):
  1. Find the library in node_modules / site-packages / vendor
  2. Read the source code directly
  3. Extract behavior from implementation
```

### Phase 4: Synthesis

Combine findings into actionable documentation:

```
TOPIC: [What was asked about]

VERSION: [Library/tool version in use]

SUMMARY: [1-3 sentence overview]

API REFERENCE:
  [Function/method signatures with parameter descriptions]

USAGE PATTERN:
  [Code example showing the standard usage]

COMMON PITFALLS:
  [Known gotchas, edge cases, or mistakes]

RELATED:
  [Links to related APIs or concepts]

SOURCES:
  - [Source 1 — reliability rating]
  - [Source 2 — reliability rating]
```

## Search Patterns

### Pattern: API Signature Discovery

When you need to know what a function accepts and returns:

```
1. Check TypeScript definitions:
   Glob: node_modules/@types/{package}/**/*.d.ts
   Glob: node_modules/{package}/dist/**/*.d.ts

2. Check source type annotations:
   Grep: "export function {functionName}" in node_modules/{package}

3. Check official docs:
   Context7: query for "{functionName} parameters return type"

4. Check tests for usage examples:
   Grep: "{functionName}" in node_modules/{package}/**/*.test.*
```

### Pattern: Configuration Options

When you need to know all available configuration options:

```
1. Check TypeScript config types:
   Grep: "interface.*Config" or "type.*Options" in package source

2. Check default configuration:
   Grep: "defaultConfig" or "defaults" in package source

3. Check JSON schemas:
   Glob: node_modules/{package}/**/*.schema.json

4. Check documentation:
   Context7: query for "configuration options"
```

### Pattern: Migration Guide

When upgrading a dependency:

```
1. Check CHANGELOG:
   Read: node_modules/{package}/CHANGELOG.md

2. Check migration docs:
   WebSearch: "{package} migration guide v{old} to v{new}"

3. Check breaking changes:
   WebSearch: "{package} v{new} breaking changes"
   GitHub: gh release view v{new} --repo {org}/{repo}

4. Check codemods:
   WebSearch: "{package} codemod v{new}"
```

### Pattern: Error Message Resolution

When encountering an unknown error from a library:

```
1. Search error message in source:
   Grep: "exact error message text" in node_modules/{package}

2. Find the throwing code to understand the cause:
   Read the file found above, examine the condition that triggers the error

3. Search GitHub issues:
   WebSearch: "{package} {error message}" site:github.com

4. Search community:
   WebSearch: "{package} {error message}"
```

## Documentation Quality Assessment

Rate retrieved documentation before presenting it:

```
QUALITY CRITERIA:
  ✓ Version-matched: Docs match the version in use
  ✓ Complete: Covers the specific question asked
  ✓ Accurate: Verified against source code or multiple sources
  ✓ Current: Not deprecated or outdated
  ✓ Actionable: Includes usable code examples

CONFIDENCE LEVELS:
  HIGH: Official docs, version-matched, with code examples
  MEDIUM: Official docs but different version, or community source with high engagement
  LOW: Single blog post, old Stack Overflow answer, or training data only
  UNCERTAIN: Conflicting sources or no documentation found
```

## Usage Examples

### Example: Finding React Server Component Docs

```
QUERY: "How to use async server components in Next.js App Router?"

STEP 1: Check project version
  → package.json shows next@14.2.0

STEP 2: Context7
  → Resolve: next.js → /vercel/next.js
  → Query: "async server components app router"
  → Result: Documentation with code examples

STEP 3: Synthesize
  TOPIC: Async Server Components (Next.js 14 App Router)
  VERSION: Next.js 14.2.0 ✓ (supported since 13.4)

  SUMMARY: Server Components in App Router are async by default.
  You can use await directly in the component body.

  USAGE:
    export default async function Page() {
      const data = await fetchData();
      return <div>{data.title}</div>;
    }

  PITFALLS:
    - Cannot use hooks (useState, useEffect) in server components
    - Cannot pass functions as props to client components
    - Use 'use client' directive for interactive components

  SOURCES:
    - Context7: /vercel/next.js (HIGH reliability)
```

## Anti-Patterns

1. **Trusting training data over docs**: Always verify with actual documentation. Training data may be outdated or contain errors from unreliable sources.
2. **Version-blind searching**: Retrieving docs without checking the project's actual version leads to incorrect API usage.
3. **Single source reliance**: Cross-reference at least two sources for critical information, especially for complex configurations.
4. **Ignoring local docs**: The project's own documentation, tests, and type definitions are often the most accurate and relevant source.
5. **Over-fetching**: Retrieving entire documentation pages when only a specific section is needed wastes context budget.

## Integration Notes

- Always check version before querying external sources — use `Read` on package manifests first.
- Feed results through **context-engineering** to compress documentation for context-constrained situations.
- When documentation reveals a complex setup, hand off to **sequential-thinking** for step-by-step implementation.
- Use **repomix** when the documentation question requires understanding the full repository structure.

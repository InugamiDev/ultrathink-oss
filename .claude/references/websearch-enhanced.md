# WebSearch-Enhanced Skill Protocol

When a skill is marked `"websearch": true` in the registry, follow this protocol:

## When to Search

- **Always search** when the user asks about current versions, latest practices, or recent changes
- **Always search** when the skill involves competitive analysis, market research, or trend analysis
- **Always search** when you need API docs, library versions, or platform-specific current info
- **Search first** before giving advice on SEO, security vulnerabilities, compliance, or platform rules

## How to Search

1. Generate 3-5 diverse search queries (factual, comparative, recent, expert)
2. Execute searches in parallel via `WebSearch` tool
3. Use `WebFetch` on the top 2-3 most relevant URLs for full content
4. Synthesize findings with citations

## Output Requirements

- Always cite sources with URLs
- Note when information may be outdated
- Flag conflicting information across sources
- Prefer official docs over blog posts
- Include "Last verified: [date]" for time-sensitive info

## Quality Gates

- Do NOT search for basic programming concepts (loops, variables, etc.)
- Do NOT search when the answer is in the current codebase
- DO search when the skill needs external/current data to be accurate
- DO search when the user explicitly asks for current/latest info

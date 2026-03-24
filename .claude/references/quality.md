# Code Quality Rules

## Principles

1. **Single Responsibility** — Each function/module does one thing well
2. **Separation of Concerns** — UI, logic, and data access are distinct layers
3. **DRY** — Don't repeat yourself, but don't over-abstract prematurely
4. **KISS** — Simplest solution that works correctly
5. **YAGNI** — Don't build features you don't need yet

## Code Standards

### TypeScript/JavaScript
- Strict TypeScript mode — no `any` without justification
- Prefer `const` over `let`, never use `var`
- Use named exports over default exports
- Direct imports — avoid barrel files for performance
- Error handling with typed errors, not string messages

### React/Next.js
- Server Components by default, Client Components only when needed
- No waterfall fetches — use `Promise.all` or Suspense
- Dynamic imports for heavy components
- Minimize `useEffect` — prefer derived state and server data
- Follow component composition over prop drilling

### SQL/Database
- Parameterized queries always — never interpolate user input
- Migrations are forward-only and idempotent
- Index columns used in WHERE, JOIN, and ORDER BY
- Use CTEs for complex queries instead of subqueries

### General
- Functions under 40 lines — extract if longer
- Max 3 levels of nesting — refactor if deeper
- Meaningful variable names — `userEmail` not `e`
- Comments for WHY, not WHAT — code should be self-documenting

## Review Checklist

Before submitting code:
- [ ] No hardcoded secrets or credentials
- [ ] Error cases handled
- [ ] Edge cases considered (empty arrays, null, undefined)
- [ ] No N+1 query patterns
- [ ] Accessible markup (semantic HTML, ARIA where needed)
- [ ] Responsive design verified
- [ ] TypeScript types are accurate (no `any`)

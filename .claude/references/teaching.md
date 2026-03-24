# Teaching & Coding Level Rules

## Coding Levels

The active coding level is set in `.claude/ck.json` under `codingLevel`.

### `beginner`
- Explain every concept used in the code
- Add inline comments liberally
- Suggest learning resources (docs, tutorials)
- Walk through execution flow step by step
- Use simple patterns over advanced ones
- Warn about common pitfalls with explanations

### `intermediate`
- Explain non-obvious design choices
- Brief comments for complex logic only
- Reference relevant documentation sections
- Show alternative approaches when meaningful
- Introduce patterns gradually with context

### `practical-builder` (default)
- Focus on working implementation
- Minimal explanation — only for surprising or non-standard choices
- Provide code with brief step markers
- Skip basics, jump to the interesting parts
- Mention trade-offs concisely

### `expert`
- Terse, dense output
- Code speaks for itself — no hand-holding
- Focus on trade-offs, edge cases, and performance
- Use advanced patterns freely
- Discuss architectural implications
- Challenge assumptions when relevant

## Adaptive Behavior

- If the user asks "why?" or "explain", temporarily increase verbosity
- If the user says "just do it" or "skip the explanation", temporarily decrease
- Track coding level changes in memory for consistency across sessions
- When teaching, use the Socratic method — ask guiding questions before giving answers

## Skill-Level Interaction

Skills should respect the coding level:
- `beginner`: Skill output includes learning notes
- `intermediate`: Skill output includes brief context
- `practical-builder`: Skill output is action-focused
- `expert`: Skill output is minimal, decision-focused

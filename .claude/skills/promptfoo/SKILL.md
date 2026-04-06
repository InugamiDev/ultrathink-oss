---
name: promptfoo
description: LLM red teaming and security testing — automated vulnerability scanning for AI agents, RAGs, and LLM pipelines. Covers prompt injection, jailbreaks, data leaks, PII exposure, and 50+ vulnerability types.
triggers:
  - "red team"
  - "test llm security"
  - "llm vulnerability"
  - "prompt injection test"
  - "jailbreak test"
  - "ai security scan"
  - "promptfoo"
  - "llm eval"
  - "test ai safety"
linksTo:
  - "security-scanner"
  - "owasp"
  - "test"
---

# Promptfoo — LLM Security Testing

> Automated red teaming for AI agents, RAG pipelines, and LLM-powered apps.
> Source: https://github.com/promptfoo/promptfoo | https://www.promptfoo.dev/

## Quick Start

```bash
# Run red team setup (interactive)
npx promptfoo@latest redteam setup

# Run eval against a target
npx promptfoo@latest redteam run

# View results
npx promptfoo@latest redteam report
```

## Core Concepts

**Red Teaming**: Automatically generates adversarial prompts to probe:
- Prompt injection / jailbreaks
- Data exfiltration / PII leaks
- Harmful content generation
- Business logic violations
- RAG poisoning / context stuffing

**Configuration** (`promptfooconfig.yaml`):
```yaml
targets:
  - id: openai:gpt-4o
    config:
      systemPrompt: "You are a helpful assistant."

redteam:
  purpose: "Customer support chatbot"
  numTests: 50
  plugins:
    - id: harmful:hate
    - id: pii:direct
    - id: prompt-injection
    - id: jailbreak
    - id: harmful:violent-crimes
  strategies:
    - jailbreak
    - prompt-injection
```

## Key Plugins (50+ vulnerability types)

| Category | Plugin IDs |
|----------|-----------|
| Harmful content | `harmful:hate`, `harmful:violent-crimes`, `harmful:cybercrime` |
| PII | `pii:direct`, `pii:session`, `pii:api-db` |
| Injection | `prompt-injection`, `indirect-prompt-injection` |
| Jailbreaks | `jailbreak`, `jailbreak:tree` |
| Business | `policy`, `overreliance`, `excessive-agency` |
| RAG-specific | `rag-poisoning`, `context-length-exceeded` |

## Integration with UltraThink

**Test an agent endpoint:**
```bash
npx promptfoo@latest eval --config promptfooconfig.yaml
```

**CI/CD integration** (GitHub Actions):
```yaml
- name: LLM Security Scan
  run: npx promptfoo@latest redteam run --ci
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

**Scan the UltraThink memory API:**
```yaml
targets:
  - id: http
    config:
      url: http://localhost:3333/api/memory
      method: POST
      body: '{"query": "{{prompt}}"}'
```

## When to Use

- Before shipping any LLM feature to production
- After major prompt/system changes
- As part of CI/CD for AI-powered endpoints
- To audit RAG pipelines for data leakage
- When adding new tool use / function calling

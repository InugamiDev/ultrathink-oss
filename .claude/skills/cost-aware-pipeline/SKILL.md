---
name: cost-aware-pipeline
description: Cost optimization for LLM pipelines including model routing, prompt caching, token budgets, and retry logic for Claude API usage.
layer: utility
category: optimization
triggers:
  - cost optimization
  - model routing
  - llm pipeline
  - token cost
  - api cost
  - prompt caching
  - model selection
  - cost tracking
linksTo:
  - context-budget
  - autonomous-loops
  - ai-agents
  - claude-api
riskLevel: low
---

# Cost-Aware Pipeline — LLM Cost Optimization

Optimize cost, latency, and quality across LLM pipelines.

## Model Routing by Task

Route tasks to the cheapest model that meets quality requirements.

| Task Type | Model | Why | Cost/MTok (input) |
|-----------|-------|-----|-------------------|
| Classification, extraction | Haiku | Fast, cheap, sufficient | $0.25 |
| Summarization, simple Q&A | Haiku | Good enough quality | $0.25 |
| Code generation, refactoring | Sonnet | Best code quality/cost ratio | $3.00 |
| Code review, debugging | Sonnet | Solid reasoning for code | $3.00 |
| Architecture, planning | Opus | Deep reasoning needed | $15.00 |
| Complex analysis, research | Opus | Multi-step reasoning | $15.00 |
| Safety-critical decisions | Opus | Highest reliability | $15.00 |

**UltraThink note**: Per user preference — Opus for thinking/planning, Sonnet for coding/implementing. No Haiku for user-facing tasks (Haiku only for internal pipeline stages).

### Routing Logic

```
if task.requires_deep_reasoning:
    model = "opus"
elif task.is_code or task.is_implementation:
    model = "sonnet"
elif task.is_simple_extraction or task.is_classification:
    model = "haiku"
else:
    model = "sonnet"  # safe default
```

## Prompt Caching

Cache static context to reduce costs on repeated calls.

### What to Cache
- System prompts (amortized across many calls)
- Long documents being analyzed (multiple questions against same doc)
- Few-shot examples (reused across similar tasks)
- Tool schemas (same across all calls in a session)

### Cache Strategy
```
# Mark cache breakpoints in API calls
system_prompt = [
  {"type": "text", "text": static_instructions, "cache_control": {"type": "ephemeral"}},
  {"type": "text", "text": dynamic_context}
]
```

**Cache pricing** (Claude):
- Cache write: 1.25× base input price
- Cache read: 0.1× base input price (90% savings)
- Cache TTL: 5 minutes (refreshed on use)

## Token Budget Management

### Per-Request Budgets

```
max_tokens_by_task = {
  "classification": 100,
  "extraction": 500,
  "code_generation": 4000,
  "analysis": 2000,
  "planning": 3000,
}
```

### Session Budget Tracking

```python
class BudgetTracker:
    def __init__(self, max_cost_usd: float):
        self.max_cost = max_cost_usd
        self.spent = 0.0

    def can_proceed(self, estimated_cost: float) -> bool:
        return self.spent + estimated_cost <= self.max_cost

    def record(self, input_tokens: int, output_tokens: int, model: str):
        self.spent += calculate_cost(input_tokens, output_tokens, model)
```

### Cost Estimation

```
estimated_cost = (input_tokens × input_price + output_tokens × output_price) / 1_000_000
```

## Retry Logic

Only retry on transient errors. Never retry on:
- 400 (bad request) — fix the request
- 401/403 (auth) — fix credentials
- 429 sustained — back off and reduce rate

### Retry Strategy

```
retryable_errors = [429, 500, 502, 503, 529]

for attempt in range(max_retries):
    try:
        response = call_api(...)
        break
    except APIError as e:
        if e.status not in retryable_errors:
            raise  # Don't retry non-transient errors
        wait = min(base_delay * (2 ** attempt), max_delay)
        sleep(wait + random_jitter)
```

## Pricing Reference (Claude, as of 2025)

| Model | Input/MTok | Output/MTok | Context |
|-------|-----------|------------|---------|
| Haiku 3.5 | $0.80 | $4.00 | 200K |
| Sonnet 4 | $3.00 | $15.00 | 200K |
| Opus 4 | $15.00 | $75.00 | 200K |

*Extended thinking multiplies output cost. Prompt caching reduces input cost by up to 90%.*

## Pipeline Design Patterns

### Cascade (cheap → expensive)
Try Haiku first. If confidence < threshold, escalate to Sonnet. If still uncertain, escalate to Opus.
**Saves**: 60-80% on tasks where Haiku suffices.

### Fan-out (parallel cheap, merge expensive)
Run N Haiku calls in parallel, merge results with one Sonnet call.
**Saves**: Avoids one expensive call for embarrassingly parallel tasks.

### Critic Loop (generate cheap, review expensive)
Generate with Sonnet, review with Opus. Fix with Sonnet. Repeat until Opus approves.
**Saves**: Opus only reads, never generates (output tokens are 5× more expensive).

## UltraThink Integration

- Use with `autonomous-loops` to set cost budgets on loop patterns
- Use with `context-budget` to audit where tokens are being consumed
- VFS reduces token consumption by 60-98% — always prefer over full file reads
- Memory system avoids re-discovering context across sessions (amortized cost)
- Memory system tracks cost patterns: if a loop consistently overruns budget, lessons are stored for future sessions

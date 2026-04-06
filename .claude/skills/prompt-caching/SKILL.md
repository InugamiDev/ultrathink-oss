---
name: prompt-caching
description: Prompt caching strategies for LLM APIs — cache breakpoints, system prompt caching, and cost optimization.
layer: utility
category: ai-ml
triggers:
  - "prompt cache"
  - "prompt caching"
  - "cache breakpoint"
  - "llm caching"
  - "cached prompt"
inputs:
  - "LLM API usage patterns and cost concerns"
  - "System prompt optimization questions"
  - "Cache configuration for multi-turn conversations"
  - "Cost analysis for cached vs uncached calls"
outputs:
  - "Cache-optimized prompt structures"
  - "Breakpoint placement strategies"
  - "Cost comparison calculations"
  - "Provider-specific caching configurations"
linksTo:
  - claude-api
  - openai
  - caching
linkedFrom: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Prompt Caching Strategies for LLM APIs

## Purpose

Optimize LLM API costs and latency by leveraging prompt caching features across providers. Covers Anthropic's cache breakpoints, OpenAI's automatic caching, cache-friendly prompt architecture, and cost modeling.

## Key Patterns

### Anthropic Prompt Caching

Anthropic supports explicit cache breakpoints on content blocks. Cached content is billed at a reduced rate on cache hits and a small write premium on cache misses.

**System prompt caching** — Place `cache_control` on the system message:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: `You are an expert assistant with deep knowledge of our codebase.
Here is the full project documentation:
${largeDocumentation}`, // Large static content
      cache_control: { type: 'ephemeral' },
    },
  ],
  messages: [{ role: 'user', content: 'How do I add a new API endpoint?' }],
});

// Check cache performance in response headers
// response.usage.cache_creation_input_tokens — tokens written to cache
// response.usage.cache_read_input_tokens — tokens read from cache
```

**Multi-turn conversation caching** — Cache the conversation prefix:

```typescript
async function cachedMultiTurn(
  systemPrompt: string,
  conversationHistory: Anthropic.Messages.MessageParam[],
  newMessage: string
) {
  // Strategy: cache the system prompt + all previous turns
  // Only the new user message is uncached
  const messages: Anthropic.Messages.MessageParam[] = [
    ...conversationHistory.map((msg, i) => {
      if (i === conversationHistory.length - 1) {
        // Place cache breakpoint on the last historical message
        return {
          ...msg,
          content:
            typeof msg.content === 'string'
              ? [
                  {
                    type: 'text' as const,
                    text: msg.content,
                    cache_control: { type: 'ephemeral' as const },
                  },
                ]
              : msg.content,
        };
      }
      return msg;
    }),
    { role: 'user', content: newMessage },
  ];

  return client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });
}
```

**Tool definition caching** — Cache large tool arrays:

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    },
  ],
  tools: largeToolArray, // Tools are cached as part of the system turn
  messages,
});
```

### OpenAI Automatic Caching

OpenAI caches prompts automatically when the prefix matches a previous request. No explicit cache control needed, but prompt structure matters.

**Optimize for prefix matching** — Keep static content at the beginning:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI();

// GOOD: Static prefix, variable suffix
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      // Large static system prompt — cached automatically if prefix matches
      content: `${largeStaticInstructions}\n\n${staticContext}`,
    },
    // Previous conversation turns — stable prefix
    ...previousMessages,
    // New message — only this varies
    { role: 'user', content: newUserMessage },
  ],
});

// Cached tokens shown in usage:
// response.usage.prompt_tokens_details.cached_tokens
```

### Cache-Friendly Prompt Architecture

**Layer your prompts** — Place content in order of stability:

```
Layer 1 (most stable): System instructions, personality, rules
Layer 2 (stable):       Reference documents, RAG context, tool definitions
Layer 3 (semi-stable):  Conversation history
Layer 4 (volatile):     Current user message
```

```typescript
// Template for cache-optimized prompt construction
function buildCacheOptimizedPrompt(config: {
  systemRules: string;        // Layer 1 - rarely changes
  referenceContext: string;   // Layer 2 - changes per session
  conversationHistory: Message[]; // Layer 3 - grows per turn
  userMessage: string;        // Layer 4 - changes every call
}) {
  return {
    system: [
      {
        type: 'text' as const,
        text: config.systemRules,
        cache_control: { type: 'ephemeral' as const },
      },
      {
        type: 'text' as const,
        text: config.referenceContext,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    messages: [
      ...config.conversationHistory,
      { role: 'user' as const, content: config.userMessage },
    ],
  };
}
```

### Cost Modeling

**Anthropic pricing model (approximate):**

| Token Type | Relative Cost |
|------------|--------------|
| Regular input | 1x (base) |
| Cache write | 1.25x (25% premium) |
| Cache read | 0.1x (90% discount) |
| Output | ~5x input (varies by model) |

```typescript
// Calculate expected savings
function estimateCacheSavings(config: {
  cachedTokens: number;
  uncachedTokens: number;
  turnsPerSession: number;
  inputPricePerMToken: number; // e.g., $3 for Sonnet
}) {
  const { cachedTokens, uncachedTokens, turnsPerSession, inputPricePerMToken } = config;

  // Without caching: all tokens charged at full rate every turn
  const noCacheCost =
    ((cachedTokens + uncachedTokens) * turnsPerSession * inputPricePerMToken) / 1_000_000;

  // With caching:
  // Turn 1: cache write (1.25x) + uncached (1x)
  // Turn 2+: cache read (0.1x) + uncached (1x)
  const cacheWriteCost = (cachedTokens * 1.25 * inputPricePerMToken) / 1_000_000;
  const cacheReadCost =
    (cachedTokens * 0.1 * (turnsPerSession - 1) * inputPricePerMToken) / 1_000_000;
  const uncachedCost =
    (uncachedTokens * turnsPerSession * inputPricePerMToken) / 1_000_000;
  const withCacheCost = cacheWriteCost + cacheReadCost + uncachedCost;

  return {
    withoutCache: noCacheCost,
    withCache: withCacheCost,
    savings: noCacheCost - withCacheCost,
    savingsPercent: ((noCacheCost - withCacheCost) / noCacheCost) * 100,
  };
}

// Example: 10k cached tokens, 500 uncached, 10 turns, $3/M tokens
// Savings: ~85% on the cached portion
```

### Cache Invalidation Awareness

```typescript
// Anthropic ephemeral caches have a TTL (typically 5 minutes)
// Design your system to re-warm caches for active sessions

class CacheWarmingManager {
  private lastCallTime = new Map<string, number>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  shouldRewarm(sessionId: string): boolean {
    const last = this.lastCallTime.get(sessionId);
    if (!last) return false;
    return Date.now() - last > this.CACHE_TTL_MS * 0.8; // Re-warm at 80% TTL
  }

  recordCall(sessionId: string) {
    this.lastCallTime.set(sessionId, Date.now());
  }

  // Send a minimal request to keep the cache warm
  async keepWarm(sessionId: string, cachedSystem: string) {
    if (this.shouldRewarm(sessionId)) {
      await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1,
        system: [
          {
            type: 'text',
            text: cachedSystem,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: 'ping' }],
      });
      this.recordCall(sessionId);
    }
  }
}
```

### Minimum Token Thresholds

Anthropic requires a minimum number of tokens for caching to activate:

| Model | Minimum Tokens |
|-------|---------------|
| Claude Sonnet | 1,024 |
| Claude Haiku | 2,048 |
| Claude Opus | 1,024 |

```typescript
// Check if content meets caching threshold
function shouldCache(content: string, model: string): boolean {
  // Rough token estimate: ~4 chars per token
  const estimatedTokens = Math.ceil(content.length / 4);
  const thresholds: Record<string, number> = {
    'claude-sonnet-4-20250514': 1024,
    'claude-haiku-4-20250414': 2048,
    'claude-opus-4-20250514': 1024,
  };
  return estimatedTokens >= (thresholds[model] ?? 1024);
}
```

## Best Practices

1. **Place the most stable content first** — System instructions and reference docs should be the prefix; user messages go last.
2. **Use at most 4 cache breakpoints** — Anthropic supports up to 4 `cache_control` markers; place them at natural content boundaries.
3. **Measure cache hit rates** — Track `cache_read_input_tokens` vs `cache_creation_input_tokens` to verify your strategy works.
4. **Avoid mutating cached content** — Even a single character change invalidates the cache for all downstream content.
5. **Bundle reference documents together** — Combine multiple small docs into one large cached block rather than many small ones.
6. **Account for cache write cost** — For single-use prompts, caching adds 25% cost with no benefit; only cache repeated content.
7. **Keep user-specific data outside cached blocks** — User names, IDs, and dynamic values should come after the cache breakpoint.
8. **Monitor TTL expiry** — Anthropic caches expire after ~5 minutes of inactivity; long idle sessions lose cache benefits.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Caching single-use prompts | 25% write premium with zero reads | Only cache content reused across turns |
| Dynamic content in cached block | Cache miss every call | Move dynamic content after the breakpoint |
| Below minimum token threshold | Cache silently not created | Ensure cached content meets model-specific minimums |
| Too many small cached blocks | Sub-optimal cache utilization | Consolidate into fewer, larger blocks |
| Ignoring cache metrics | No visibility into cost savings | Log and dashboard `cache_read_input_tokens` per session |
| Cache warming too aggressively | Extra API costs from keep-alive calls | Only warm for active sessions with high-value caches |

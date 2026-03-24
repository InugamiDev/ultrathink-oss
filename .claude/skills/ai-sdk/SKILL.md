# Vercel AI SDK

> Unified TypeScript SDK for building AI-powered apps — streaming, structured output, tool calling, multi-provider.

## When to Use
- Adding LLM features to Next.js/React apps (chat, completions, agents)
- Streaming AI responses to the browser (text or React Server Components)
- Structured/typed LLM output with Zod schemas
- Tool-calling agents with multi-step execution
- Swapping providers (OpenAI, Anthropic, Google, Mistral) without rewriting logic

## Core Patterns

### generateText / streamText
```typescript
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// One-shot generation
const { text } = await generateText({
  model: openai("gpt-4o"),
  system: "You are a helpful assistant.",
  prompt: "Explain quantum computing in 2 sentences.",
});

// Streaming (API route)
export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    onError: ({ error }) => console.error(error),
  });
  return result.toDataStreamResponse();
}
```

### Structured Output with generateObject
```typescript
import { generateObject } from "ai";
import { z } from "zod";

const { object } = await generateObject({
  model: openai("gpt-4o"),
  schema: z.object({
    recipe: z.string(),
    ingredients: z.array(z.object({ name: z.string(), amount: z.string() })),
  }),
  prompt: "Generate a pasta recipe.",
});
// object is fully typed — { recipe: string; ingredients: { name, amount }[] }
```

### Tool Calling
```typescript
const result = await generateText({
  model: openai("gpt-4o"),
  tools: {
    weather: { description: "Get weather for a city", parameters: z.object({ city: z.string() }),
      execute: async ({ city }) => fetchWeather(city),
    },
  },
  maxSteps: 5, // Allow multi-step tool use
  prompt: "What's the weather in Tokyo?",
});
```

### React Hooks (useChat / useCompletion)
```typescript
"use client";
import { useChat } from "@ai-sdk/react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  return (
    <form onSubmit={handleSubmit}>
      {messages.map((m) => <div key={m.id}>{m.role}: {m.content}</div>)}
      <input value={input} onChange={handleInputChange} disabled={isLoading} />
    </form>
  );
}
// useChat() calls POST /api/chat by default — pair with streamText route
```

## Key Features
- **Providers**: `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mistral` — same interface
- **Streaming UI (RSC)**: `createStreamableUI()` + `streamUI()` for streaming React components from server actions
- **Middleware**: `wrapLanguageModel()` for logging, caching, guardrails around any model
- **Attachments**: `useChat({ experimental_attachments })` for image/file uploads with vision models
- **Telemetry**: Built-in OpenTelemetry via `experimental_telemetry: { isEnabled: true }`
- **Error handling**: `onError` callback on streams; `APICallError`, `RetryError` types for try/catch
- **Token usage**: `result.usage.promptTokens` / `completionTokens` on all generate calls

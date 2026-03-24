---
name: streaming
description: HTTP streaming patterns including React Suspense streaming SSR, ReadableStream API, Server-Sent Events, chunked transfer encoding, and AI response streaming with Vercel AI SDK
layer: utility
category: backend
triggers:
  - "streaming"
  - "stream response"
  - "ReadableStream"
  - "chunked transfer"
  - "streaming SSR"
  - "AI streaming"
  - "Vercel AI SDK"
  - "stream text"
  - "server-sent events"
inputs:
  - Streaming use case (AI chat, SSR, data feed, file download)
  - Runtime environment (Node.js, Edge, Cloudflare Workers)
  - Client framework (React, vanilla JS)
outputs:
  - Streaming endpoint implementation
  - Client-side stream consumer code
  - Error handling and backpressure patterns
linksTo:
  - nextjs
  - nodejs
  - websockets
  - react
linkedFrom:
  - api-designer
  - performance-profiler
preferredNextSkills:
  - nextjs
  - caching
fallbackSkills:
  - websockets
  - nodejs
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# HTTP Streaming Skill

## Purpose

Stream data to clients as it becomes available instead of buffering the full response. Essential for AI chat interfaces, large data exports, real-time SSR, and progressive loading patterns.

## When to Use What

| Pattern | Use Case | Latency | Complexity |
|---------|----------|---------|------------|
| **ReadableStream** | Custom binary/text streaming | Low | Medium |
| **Streaming SSR** | React Suspense + App Router | Low TTFB | Low (built-in) |
| **AI SDK streaming** | LLM chat responses | Token-level | Low |
| **Chunked transfer** | Large file/data export | Progressive | Low |
| **SSE** | Server push notifications | Real-time | Low |

## Key Patterns

### 1. ReadableStream API (Web Standard)

```typescript
// Works in Next.js Edge, Cloudflare Workers, Deno, Bun
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const items = await db.query('SELECT * FROM large_table');

      for (const item of items) {
        controller.enqueue(encoder.encode(JSON.stringify(item) + '\n'));
        // Optional: yield to event loop for backpressure
        await new Promise((r) => setTimeout(r, 0));
      }

      controller.close();
    },
    cancel() {
      // Client disconnected — clean up resources
      console.log('Stream cancelled by client');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

### 2. AI Response Streaming (Vercel AI SDK)

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    system: 'You are a helpful assistant.',
    messages,
    onFinish({ text, usage }) {
      // Persist completed response
      saveMessage({ role: 'assistant', content: text, tokens: usage.totalTokens });
    },
  });

  return result.toDataStreamResponse();
}
```

```tsx
// Client: app/chat/page.tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
          {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} disabled={isLoading} />
      </form>
    </div>
  );
}
```

### 3. React Suspense Streaming SSR (Next.js App Router)

```tsx
// Outer shell streams immediately, Suspense boundaries resolve progressively
import { Suspense } from 'react';

export default function Page() {
  return (
    <main>
      <h1>Dashboard</h1> {/* Streams instantly */}
      <Suspense fallback={<TableSkeleton />}>
        <AsyncDataTable /> {/* Streams when data resolves */}
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <AsyncChart /> {/* Independent — can resolve in any order */}
      </Suspense>
    </main>
  );
}

// This component fetches on the server — no useEffect needed
async function AsyncDataTable() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 60 },
  });
  const rows = await data.json();
  return <DataTable rows={rows} />;
}
```

### 4. Consuming Streams on the Client

```typescript
// Generic NDJSON stream consumer
async function consumeStream<T>(
  url: string,
  onChunk: (item: T) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(url, { signal });
  if (!res.ok || !res.body) throw new Error(`Stream failed: ${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) onChunk(JSON.parse(line));
    }
  }
}

// Usage with abort support
const controller = new AbortController();
consumeStream('/api/export', (row) => appendToTable(row), controller.signal);
// controller.abort() to cancel
```

## Best Practices

1. **Always handle cancellation** -- implement the `cancel()` callback in ReadableStream
2. **Use NDJSON** (newline-delimited JSON) for structured streaming -- one JSON object per line
3. **Set `Transfer-Encoding: chunked`** explicitly when not using a framework that sets it
4. **Disable buffering** behind proxies: `X-Accel-Buffering: no` for Nginx
5. **Use `AbortController`** on the client to cancel streams when components unmount
6. **Prefer `streamText` over `generateText`** for any user-facing AI response
7. **Yield to the event loop** periodically in tight streaming loops to avoid blocking

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Not handling client disconnect | Resource leaks, wasted compute | Check `signal.aborted` or use `cancel()` callback |
| Buffering by reverse proxy | Stream appears to hang, then flushes all at once | Disable Nginx/CloudFront buffering headers |
| No error boundary around Suspense | Streaming SSR crash takes down entire page | Wrap Suspense in `<ErrorBoundary>` |
| Missing `TextDecoderStream` | Binary chunks split mid-character | Always decode before parsing |
| Forgetting backpressure | Memory grows unbounded on slow clients | Use `TransformStream` or manual flow control |

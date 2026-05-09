// intent: provider regression coverage — mock fetch + drive the SSE/NDJSON readers
// status: done — covers anthropic-direct + ollama + openai-compat happy paths
// next: error path coverage (401, 429, malformed SSE, network drop mid-stream)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnthropicDirectSpawn } from "../src/providers/anthropic-direct.js";
import { createOllamaSpawn } from "../src/providers/ollama.js";
import { createOpenAiCompatSpawn } from "../src/providers/openai-compat.js";
import type { EngineEvent } from "../src/types.js";

// ---------------------------------------------------------------------------
// Helpers — turn an array of strings into a fake ReadableStream + fetch mock.

function chunkStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(c) {
      if (i < chunks.length) c.enqueue(enc.encode(chunks[i++]));
      else c.close();
    },
  });
}

function mockFetch(body: ReadableStream<Uint8Array>, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    body,
    text: async () => "",
  })) as unknown as typeof fetch;
}

async function drain(handle: { events: AsyncIterable<EngineEvent> }): Promise<EngineEvent[]> {
  const out: EngineEvent[] = [];
  for await (const ev of handle.events) out.push(ev);
  return out;
}

// ---------------------------------------------------------------------------

describe("createAnthropicDirectSpawn", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("translates SSE deltas into engine events", async () => {
    const sse = [
      'data: {"type":"message_start","message":{"usage":{"input_tokens":50}}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}\n\n',
      'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":10}}\n\n',
      'data: {"type":"message_stop"}\n\n',
      "data: [DONE]\n\n",
    ];
    globalThis.fetch = mockFetch(chunkStream(sse));

    const handle = createAnthropicDirectSpawn(
      { prompt: "hi", projectDir: "/tmp", model: "claude-haiku-4-5" },
      { apiKey: "sk-ant-test" }
    );
    const events = await drain(handle);
    const kinds = events.map((e) => e.kind);

    expect(kinds[0]).toBe("spawn-started");
    expect(kinds).toContain("assistant-text-delta");
    expect(kinds).toContain("usage");
    expect(kinds).toContain("completion");
    expect(kinds[kinds.length - 1]).toBe("spawn-exited");

    const text = events
      .filter(
        (e): e is EngineEvent & { kind: "assistant-text-delta"; text: string } => e.kind === "assistant-text-delta"
      )
      .map((e) => e.text)
      .join("");
    expect(text).toBe("Hello world");

    const usage = events.find((e) => e.kind === "usage") as
      | { kind: "usage"; inputTokens: number; outputTokens: number }
      | undefined;
    expect(usage?.inputTokens).toBe(50);
    expect(usage?.outputTokens).toBe(10);
  });

  it("emits a clean error on non-200", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      body: chunkStream([]),
      text: async () => "Invalid API key",
    })) as unknown as typeof fetch;

    const handle = createAnthropicDirectSpawn({ prompt: "hi", projectDir: "/tmp" }, { apiKey: "bad" });
    const events = await drain(handle);
    const err = events.find((e) => e.kind === "error") as { kind: "error"; message: string } | undefined;
    expect(err).toBeDefined();
    expect(err?.message).toContain("401");
  });
});

describe("createOllamaSpawn", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("translates NDJSON chat into deltas + usage + completion", async () => {
    const ndjson = [
      '{"message":{"content":"Hello"},"done":false}\n',
      '{"message":{"content":" from"},"done":false}\n',
      '{"message":{"content":" llama"},"done":true,"prompt_eval_count":12,"eval_count":34}\n',
    ];
    globalThis.fetch = mockFetch(chunkStream(ndjson));

    const handle = createOllamaSpawn({ prompt: "hi", projectDir: "/tmp" }, { baseUrl: "http://test:11434" });
    const events = await drain(handle);
    const text = events
      .filter(
        (e): e is EngineEvent & { kind: "assistant-text-delta"; text: string } => e.kind === "assistant-text-delta"
      )
      .map((e) => e.text)
      .join("");
    expect(text).toBe("Hello from llama");
    const usage = events.find((e) => e.kind === "usage") as
      | { kind: "usage"; inputTokens: number; outputTokens: number }
      | undefined;
    expect(usage?.inputTokens).toBe(12);
    expect(usage?.outputTokens).toBe(34);
  });
});

describe("createOpenAiCompatSpawn", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("translates OpenAI-shaped SSE into deltas", async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" there"}}]}\n\n',
      'data: {"choices":[{"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":7}}\n\n',
      "data: [DONE]\n\n",
    ];
    globalThis.fetch = mockFetch(chunkStream(sse));

    const handle = createOpenAiCompatSpawn(
      { prompt: "hi", projectDir: "/tmp", model: "gpt-5-mini" },
      { apiKey: "sk-test" }
    );
    const events = await drain(handle);
    const text = events
      .filter(
        (e): e is EngineEvent & { kind: "assistant-text-delta"; text: string } => e.kind === "assistant-text-delta"
      )
      .map((e) => e.text)
      .join("");
    expect(text).toBe("hi there");
    const usage = events.find((e) => e.kind === "usage") as
      | { kind: "usage"; inputTokens: number; outputTokens: number }
      | undefined;
    expect(usage?.inputTokens).toBe(5);
    expect(usage?.outputTokens).toBe(7);
  });
});

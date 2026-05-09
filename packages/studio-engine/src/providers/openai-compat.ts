// intent: OpenAI-compatible provider — works with OpenAI, OpenRouter, Together, Groq,
//         LM Studio, vLLM, Cerebras, Fireworks, anything speaking the chat-completions API
// status: done — SSE parsed, normalised, cost computed when pricing known
// next: tool-use / function-calling, structured output schema, vision content
// confidence: high

import type { EngineEvent, SpawnHandle, SpawnOptions } from "../types.js";
import { computeCost } from "../pricing.js";

export interface OpenAiCompatConfig {
  apiKey: string;
  baseUrl?: string; // default: https://api.openai.com/v1
}

export function createOpenAiCompatSpawn(opts: SpawnOptions, cfg: OpenAiCompatConfig): SpawnHandle {
  const sessionId = opts.sessionId ?? `oai-${Date.now()}`;
  const queue: EngineEvent[] = [];
  let resolveNext: ((v: IteratorResult<EngineEvent>) => void) | null = null;
  let closed = false;
  const abortController = new AbortController();

  const push = (e: EngineEvent) => {
    if (closed) return;
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = null;
      r({ value: e, done: false });
    } else {
      queue.push(e);
    }
  };
  const close = () => {
    if (closed) return;
    closed = true;
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = null;
      r({ value: undefined as unknown as EngineEvent, done: true });
    }
  };
  const iterable: AsyncIterable<EngineEvent> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<EngineEvent>> {
          if (queue.length > 0) return Promise.resolve({ value: queue.shift()!, done: false });
          if (closed) return Promise.resolve({ value: undefined as unknown as EngineEvent, done: true });
          return new Promise((res) => {
            resolveNext = res;
          });
        },
      };
    },
  };

  let exitCode: number | null = null;

  const done = (async (): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }> => {
    const startedAt = Date.now();
    push({ kind: "spawn-started", sessionId, projectDir: opts.projectDir, pid: -1 });

    const baseUrl = cfg.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const model = opts.model ?? "gpt-5";

    let totalInput = 0;
    let totalOutput = 0;
    let stopReason: string | null = null;

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model,
          stream: true,
          stream_options: { include_usage: true },
          messages: [{ role: "user", content: opts.prompt }],
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        push({
          kind: "error",
          message: `OpenAI-compat HTTP ${res.status}: ${body.slice(0, 500)}`,
          code: `http_${res.status}`,
          recoverable: res.status >= 500 || res.status === 429,
        });
        push({ kind: "spawn-exited", exitCode: 1, signal: null });
        exitCode = 1;
        return { exitCode, signal: null };
      }

      if (!res.body) {
        push({ kind: "error", message: "OpenAI-compat returned no body", recoverable: false });
        push({ kind: "spawn-exited", exitCode: 1, signal: null });
        exitCode = 1;
        return { exitCode, signal: null };
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        let blk: number;
        while ((blk = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, blk);
          buf = buf.slice(blk + 2);
          for (const rawLine of block.split("\n")) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (json === "" || json === "[DONE]") continue;
            let evt: {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
              usage?: { prompt_tokens?: number; completion_tokens?: number };
            };
            try {
              evt = JSON.parse(json);
            } catch {
              continue;
            }
            const choice = evt.choices?.[0];
            const text = choice?.delta?.content;
            if (text) push({ kind: "assistant-text-delta", text });
            if (choice?.finish_reason) stopReason = choice.finish_reason;
            if (evt.usage) {
              totalInput = evt.usage.prompt_tokens ?? totalInput;
              totalOutput = evt.usage.completion_tokens ?? totalOutput;
            }
          }
        }
      }

      const costUsd = computeCost(model, totalInput, totalOutput, 0);
      push({
        kind: "usage",
        inputTokens: totalInput,
        outputTokens: totalOutput,
        model,
      });
      push({
        kind: "completion",
        durationMs: Date.now() - startedAt,
        costUsd,
        result: stopReason,
      });
      push({ kind: "spawn-exited", exitCode: 0, signal: null });
      exitCode = 0;
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") {
        push({ kind: "spawn-exited", exitCode: -1, signal: "SIGTERM" as NodeJS.Signals });
      } else {
        push({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
          recoverable: false,
        });
        push({ kind: "spawn-exited", exitCode: 1, signal: null });
      }
      exitCode = 1;
    } finally {
      close();
    }
    return { exitCode, signal: null };
  })();

  return {
    events: iterable,
    sessionId,
    done,
    abort: () => abortController.abort(),
  };
}

// Pricing now centralised in ../pricing.ts as the single source of truth.

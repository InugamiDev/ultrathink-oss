// intent: direct Anthropic Messages API streaming — bypasses claude CLI entirely
// status: done — Server-Sent Events parsed, normalised into EngineEvent stream
// next: tool-use (function calling), prompt caching, system prompts, MCP via API
// confidence: high
//
// Why this exists: if `claude` isn't on the GUI app's PATH (common on macOS where
// GUI apps don't read ~/.zshrc) OR the user just doesn't have Claude Code
// installed, prompting still works as long as ANTHROPIC_API_KEY is set. This is
// the "unblock" provider — no hooks, no MCP, no skill mesh, just messages → text.

import type { EngineEvent, SpawnHandle, SpawnOptions } from "../types.js";
import { computeCost, resolveAlias } from "../pricing.js";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: "text"; text: string }>;
}

// Model alias resolution + cost computation now live in ../pricing.ts as the
// single source of truth shared between providers.
const resolveModel = resolveAlias;

export interface AnthropicDirectConfig {
  apiKey: string;
  /** Override base URL (e.g. for proxies or self-hosted). */
  baseUrl?: string;
}

export function createAnthropicDirectSpawn(opts: SpawnOptions, cfg: AnthropicDirectConfig): SpawnHandle {
  const sessionId = opts.sessionId ?? `direct-${Date.now()}`;
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
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false });
          }
          if (closed) {
            return Promise.resolve({ value: undefined as unknown as EngineEvent, done: true });
          }
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
    push({
      kind: "spawn-started",
      sessionId,
      projectDir: opts.projectDir,
      pid: -1,
    });

    const messages: AnthropicMessage[] = [{ role: "user", content: opts.prompt }];

    let totalInput = 0;
    let totalOutput = 0;
    let cacheRead = 0;
    let cacheCreate = 0;
    let stopReason: string | null = null;

    try {
      const res = await fetch(`${cfg.baseUrl ?? API_URL}`, {
        method: "POST",
        headers: {
          "x-api-key": cfg.apiKey,
          "anthropic-version": API_VERSION,
          "content-type": "application/json",
          "anthropic-beta": "prompt-caching-2024-07-31",
        },
        body: JSON.stringify({
          model: resolveModel(opts.model),
          max_tokens: 4096,
          stream: true,
          messages,
          ...(opts.bare
            ? {}
            : {
                // Light system prompt — the heavy skill mesh comes from the CLI
                // adapter. Direct mode is intentionally minimal.
                system:
                  "You are a helpful coding assistant. Be concise and produce working code. The user is in a project directory; refer to files by relative path.",
              }),
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "<no body>");
        push({
          kind: "error",
          message: `Anthropic API ${res.status}: ${body.slice(0, 500)}`,
          code: `http_${res.status}`,
          recoverable: res.status >= 500 || res.status === 429,
        });
        push({ kind: "spawn-exited", exitCode: 1, signal: null });
        exitCode = 1;
        return { exitCode, signal: null };
      }

      if (!res.body) {
        push({ kind: "error", message: "Anthropic API returned no body", recoverable: false });
        push({ kind: "spawn-exited", exitCode: 1, signal: null });
        exitCode = 1;
        return { exitCode, signal: null };
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE: events separated by \n\n, fields by `data: ...`
        let nl: number;
        while ((nl = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 2);
          for (const rawLine of block.split("\n")) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (json === "" || json === "[DONE]") continue;
            let evt: { type?: string; [k: string]: unknown };
            try {
              evt = JSON.parse(json);
            } catch {
              continue;
            }
            const type = evt.type;
            // message_start: usage.input_tokens, model
            if (type === "message_start") {
              const m = evt.message as
                | {
                    usage?: {
                      input_tokens?: number;
                      cache_read_input_tokens?: number;
                      cache_creation_input_tokens?: number;
                    };
                  }
                | undefined;
              if (m?.usage) {
                totalInput += Number(m.usage.input_tokens ?? 0);
                cacheRead += Number(m.usage.cache_read_input_tokens ?? 0);
                cacheCreate += Number(m.usage.cache_creation_input_tokens ?? 0);
              }
            } else if (type === "content_block_delta") {
              const delta = evt.delta as { type?: string; text?: string; thinking?: string } | undefined;
              if (delta?.type === "text_delta" && typeof delta.text === "string") {
                push({ kind: "assistant-text-delta", text: delta.text });
              } else if (delta?.type === "thinking_delta" && typeof delta.thinking === "string") {
                push({ kind: "thinking", text: delta.thinking });
              }
            } else if (type === "message_delta") {
              const d = evt.delta as { stop_reason?: string } | undefined;
              if (d?.stop_reason) stopReason = d.stop_reason;
              const usage = evt.usage as { output_tokens?: number } | undefined;
              if (usage?.output_tokens !== undefined) totalOutput = Number(usage.output_tokens);
            } else if (type === "message_stop") {
              // emit usage + completion at message_stop
              push({
                kind: "usage",
                inputTokens: totalInput,
                outputTokens: totalOutput,
                cacheReadTokens: cacheRead || undefined,
                cacheWriteTokens: cacheCreate || undefined,
                model: resolveModel(opts.model),
              });
            } else if (type === "error") {
              const err = evt.error as { message?: string; type?: string } | undefined;
              push({
                kind: "error",
                message: err?.message ?? "Anthropic stream error",
                code: err?.type,
                recoverable: false,
              });
            }
          }
        }
      }

      const durationMs = Date.now() - startedAt;
      const costUsd = computeCost(resolveModel(opts.model), totalInput, totalOutput, cacheRead);
      push({
        kind: "completion",
        durationMs,
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

// Pricing computation moved to ../pricing.ts as the single source of truth.

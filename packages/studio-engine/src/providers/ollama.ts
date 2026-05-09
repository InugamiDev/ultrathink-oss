// intent: Ollama provider — local LLM via http://localhost:11434/api/chat
// status: done — SSE-style NDJSON parsing, bypasses any cloud requirement
// next: support /api/embed for memory recall, model pulling via /api/pull
// confidence: high
//
// Ollama's chat endpoint streams NDJSON. Each line is a partial message with
// content + done flag. We translate to assistant-text-delta events so the UI
// looks identical to the cloud paths.

import type { EngineEvent, SpawnHandle, SpawnOptions } from "../types.js";

const DEFAULT_URL = "http://localhost:11434";

export interface OllamaConfig {
  baseUrl?: string;
}

export function createOllamaSpawn(opts: SpawnOptions, cfg: OllamaConfig = {}): SpawnHandle {
  const sessionId = opts.sessionId ?? `ollama-${Date.now()}`;
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

    const baseUrl = cfg.baseUrl ?? process.env.OLLAMA_URL ?? DEFAULT_URL;
    const model = opts.model ?? "llama3.2";

    let totalInput = 0;
    let totalOutput = 0;

    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [{ role: "user", content: opts.prompt }],
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        push({
          kind: "error",
          message: `Ollama HTTP ${res.status}: ensure ollama is running (try \`ollama serve\`) and the model is pulled (\`ollama pull ${model}\`).`,
          code: `http_${res.status}`,
          recoverable: false,
        });
        push({ kind: "spawn-exited", exitCode: 1, signal: null });
        exitCode = 1;
        return { exitCode, signal: null };
      }

      if (!res.body) {
        push({ kind: "error", message: "Ollama returned no body", recoverable: false });
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
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let evt: { message?: { content?: string }; done?: boolean; prompt_eval_count?: number; eval_count?: number };
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          if (evt.message?.content) {
            push({ kind: "assistant-text-delta", text: evt.message.content });
          }
          if (evt.done) {
            totalInput = evt.prompt_eval_count ?? 0;
            totalOutput = evt.eval_count ?? 0;
            push({
              kind: "usage",
              inputTokens: totalInput,
              outputTokens: totalOutput,
              model,
            });
          }
        }
      }

      push({
        kind: "completion",
        durationMs: Date.now() - startedAt,
        costUsd: 0, // local — free
        result: "end_turn",
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

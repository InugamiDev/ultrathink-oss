// intent: Local LLM provider — sends prompts to a local model via HTTP (Ollama,
//         llama.cpp server, LM Studio, or any OpenAI-compatible local endpoint).
// status: done
// confidence: medium — Ollama API is stable but others vary.

import type { Provider, ProviderConfig, SpawnRequest, SpawnResult } from "./types.js";
import type { WorkerEvent } from "../workers/bus.js";

const DEFAULT_ENDPOINT = "http://localhost:11434";
const DEFAULT_MODEL = "llama3";

export function createLocalProvider(config: ProviderConfig): Provider {
  const endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
  const model = config.model ?? DEFAULT_MODEL;

  return {
    kind: "local",
    label: config.label,

    async available(): Promise<boolean> {
      try {
        const res = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
      } catch {
        return false;
      }
    },

    async spawn(id, req, emit): Promise<SpawnResult> {
      const prompt = buildPrompt(req);
      emit({ type: "worker:action", id, action: `calling ${model} at ${endpoint}` });

      try {
        // Ollama /api/generate with streaming
        const res = await fetch(`${endpoint}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt, stream: true }),
        });

        if (!res.ok || !res.body) {
          emit({ type: "worker:error", id, error: `HTTP ${res.status}: ${res.statusText}` });
          emit({ type: "worker:done", id, success: false });
          return { id, success: false };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line) continue;
            try {
              const chunk = JSON.parse(line);
              if (chunk.response) {
                fullResponse += chunk.response;
                // Emit periodic action updates (every ~200 chars)
                if (fullResponse.length % 200 < (chunk.response as string).length) {
                  const preview = fullResponse.slice(-100).replace(/\n/g, " ");
                  emit({ type: "worker:action", id, action: preview });
                }
              }
              if (chunk.done) {
                emit({ type: "worker:action", id, action: `completed (${fullResponse.length} chars)` });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        emit({ type: "worker:done", id, success: true });
        return { id, success: true };
      } catch (e) {
        emit({ type: "worker:error", id, error: e instanceof Error ? e.message : String(e) });
        emit({ type: "worker:done", id, success: false });
        return { id, success: false };
      }
    },
  };
}

function buildPrompt(req: SpawnRequest): string {
  const directive: Record<string, string> = {
    clarify: "Ask 3 clarifying questions. Do not write code. Output as a numbered list.",
    plan: "Create a step-by-step implementation plan. Output as structured markdown.",
    build: "Implement the feature. Show the code changes needed.",
    validate: "Review the implementation against the original requirements. List pass/fail for each.",
    ship: "Prepare release notes and a git commit message.",
  };
  return `You are an expert software engineer.\n\nTASK PHASE: ${req.phase}\n${directive[req.phase] ?? ""}\n\nUSER REQUEST:\n${req.prompt}`;
}

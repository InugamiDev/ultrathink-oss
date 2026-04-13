// intent: Cloud API provider — sends prompts to any OpenAI-compatible API endpoint.
//         Works with OpenAI, Anthropic API, Together, Groq, Fireworks, etc.
// status: done
// confidence: medium — assumes OpenAI chat completions format.

import type { Provider, ProviderConfig, SpawnRequest, SpawnResult } from "./types.js";
import type { WorkerEvent } from "../workers/bus.js";

export function createCloudProvider(config: ProviderConfig): Provider {
  const endpoint = config.endpoint ?? "https://api.openai.com/v1";
  const model = config.model ?? "gpt-4.1";
  const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? "";

  return {
    kind: "cloud",
    label: config.label,

    async available(): Promise<boolean> {
      if (!apiKey) return false;
      try {
        const res = await fetch(`${endpoint}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(5000),
        });
        return res.ok;
      } catch {
        // Fallback — assume available if we have an API key
        return !!apiKey;
      }
    },

    async spawn(id, req, emit): Promise<SpawnResult> {
      const prompt = buildPrompt(req);
      emit({ type: "worker:action", id, action: `calling ${model} via ${endpoint}` });

      try {
        const res = await fetch(`${endpoint}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are an expert software engineer working in a structured pipeline." },
              { role: "user", content: prompt },
            ],
            stream: true,
          }),
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
            if (!line || line === "data: [DONE]") continue;
            const data = line.startsWith("data: ") ? line.slice(6) : line;
            try {
              const chunk = JSON.parse(data);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                fullResponse += delta;
                if (fullResponse.length % 200 < (delta as string).length) {
                  const preview = fullResponse.slice(-100).replace(/\n/g, " ");
                  emit({ type: "worker:action", id, action: preview });
                }
              }
            } catch {
              // skip malformed SSE chunks
            }
          }
        }

        emit({ type: "worker:action", id, action: `completed (${fullResponse.length} chars)` });
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
    build: "Implement the feature. Show the complete code changes needed.",
    validate: "Review the implementation against the original requirements. List pass/fail for each.",
    ship: "Prepare release notes and a git commit message.",
  };
  return `PHASE: ${req.phase}\n${directive[req.phase] ?? ""}\n\nUSER REQUEST:\n${req.prompt}`;
}

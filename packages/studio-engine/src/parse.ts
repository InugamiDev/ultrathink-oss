// intent: convert Claude Code stream-json output into our typed EngineEvent stream
// status: done (defensive against unknown shapes)
// next: tighten thinking/usage shapes once Claude Code's stream-json schema stabilises further
// confidence: medium — Claude Code's stream-json format evolves; we're defensive
//
// Claude Code emits one JSON object per line on stdout when run with
// `-p --output-format stream-json --include-partial-messages`. Each line has a
// top-level `type` discriminator. We normalise into our EngineEvent union.

import type { EngineEvent } from "./types.js";

type RawClaudeEvent = {
  type?: string;
  subtype?: string;
  session_id?: string;
  message?: {
    id?: string;
    role?: "assistant" | "user";
    content?: Array<RawContentBlock>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
    model?: string;
    stop_reason?: string | null;
  };
  delta?: {
    type?: string;
    text?: string;
    partial_json?: string;
    thinking?: string;
  };
  index?: number;
  content_block?: RawContentBlock;
  result?: string | null;
  duration_ms?: number;
  total_cost_usd?: number;
  is_error?: boolean;
  // tool_result events arrive as user-role messages with a content block of type tool_result
  tool_use_id?: string;
  content?: unknown;
};

type RawContentBlock = {
  type?: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
};

/**
 * Convert one parsed JSON object from Claude Code stream-json into zero or more
 * EngineEvents. Returns [] for events we choose not to surface.
 */
export function normaliseClaudeEvent(raw: RawClaudeEvent): EngineEvent[] {
  const out: EngineEvent[] = [];

  switch (raw.type) {
    case "system": {
      out.push({
        kind: "system-init",
        data: { ...raw, type: undefined } as Record<string, unknown>,
      });
      break;
    }

    case "assistant": {
      // Final assistant message — surface text blocks and tool-use starts.
      const blocks = raw.message?.content ?? [];
      for (const block of blocks) {
        if (block.type === "text" && typeof block.text === "string") {
          out.push({ kind: "assistant-text-block", text: block.text });
        } else if (block.type === "tool_use") {
          out.push({
            kind: "tool-use-start",
            toolUseId: block.id ?? "",
            name: block.name ?? "",
            input: block.input,
          });
        } else if (block.type === "thinking" && typeof block.thinking === "string") {
          out.push({ kind: "thinking", text: block.thinking });
        }
      }
      const usage = raw.message?.usage;
      if (usage) {
        out.push({
          kind: "usage",
          inputTokens: usage.input_tokens ?? 0,
          outputTokens: usage.output_tokens ?? 0,
          cacheReadTokens: usage.cache_read_input_tokens,
          cacheWriteTokens: usage.cache_creation_input_tokens,
          model: raw.message?.model,
        });
      }
      break;
    }

    case "user": {
      // tool_result lives inside a user-role content block.
      const blocks = raw.message?.content ?? [];
      for (const block of blocks) {
        if (block.type === "tool_result") {
          out.push({
            kind: "tool-result",
            toolUseId: block.tool_use_id ?? "",
            content: block.content,
            isError: block.is_error,
          });
        }
      }
      break;
    }

    case "content_block_delta": {
      const d = raw.delta;
      if (!d) break;
      if (d.type === "text_delta" && typeof d.text === "string") {
        out.push({ kind: "assistant-text-delta", text: d.text });
      } else if (d.type === "input_json_delta" && typeof d.partial_json === "string") {
        // tool input streaming — surface for partial UI updates
        // we don't have the tool_use_id reliably here without prior content_block_start tracking,
        // so emit only if present in the raw event
        if (raw.tool_use_id) {
          out.push({
            kind: "tool-use-input-delta",
            toolUseId: raw.tool_use_id,
            partial: d.partial_json,
          });
        }
      } else if (d.type === "thinking_delta" && typeof d.thinking === "string") {
        out.push({ kind: "thinking", text: d.thinking });
      }
      break;
    }

    case "result": {
      out.push({
        kind: "completion",
        durationMs: raw.duration_ms ?? 0,
        costUsd: raw.total_cost_usd,
        result: raw.result ?? null,
      });
      break;
    }

    case "error": {
      out.push({
        kind: "error",
        message: typeof raw.result === "string" ? raw.result : "unknown error",
        recoverable: false,
      });
      break;
    }

    // Claude Code with --include-partial-messages wraps deltas:
    //   {"type": "stream_event", "event": {"type": "content_block_delta", ...}}
    // Recurse on the inner event so we get fast first-byte text.
    case "stream_event": {
      const inner = (raw as { event?: RawClaudeEvent }).event;
      if (inner) {
        for (const ev of normaliseClaudeEvent(inner)) out.push(ev);
      }
      break;
    }

    // content_block_start, content_block_stop, message_start, message_stop, etc. —
    // not surfaced; the assistant/user "final" events carry the same info.
    default:
      break;
  }

  return out;
}

/**
 * Translate one Codex CLI JSON event (`codex exec --json`) into our normalised
 * EngineEvent stream. Codex emits a small set of types:
 *   thread.started      → ignored (we already emitted spawn-started)
 *   item.completed      → contains assistant_message / tool_call / reasoning items
 *   turn.completed      → carries final usage; we emit "completion"
 *   error               → "error" event
 */
export function normaliseCodexEvent(raw: unknown): EngineEvent[] {
  const out: EngineEvent[] = [];
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  const type = typeof r.type === "string" ? (r.type as string) : "";

  switch (type) {
    case "item.completed": {
      const item = r.item as Record<string, unknown> | undefined;
      if (!item) break;
      const it = typeof item.type === "string" ? (item.type as string) : "";
      if (it === "assistant_message" || it === "agent_message") {
        const text = typeof item.text === "string" ? (item.text as string) : "";
        if (text) out.push({ kind: "assistant-text-block", text });
      } else if (it === "tool_call" || it === "function_call" || it === "command_execution") {
        const name =
          (typeof item.name === "string" && (item.name as string)) ||
          (typeof item.tool_name === "string" && (item.tool_name as string)) ||
          "tool";
        const id =
          typeof item.id === "string" ? (item.id as string) : `codex-${Math.random().toString(36).slice(2, 8)}`;
        out.push({
          kind: "tool-use-start",
          toolUseId: id,
          name,
          input: (item.input ?? item.arguments ?? {}) as Record<string, unknown>,
        });
      } else if (it === "reasoning" || it === "thinking") {
        const text = typeof item.text === "string" ? (item.text as string) : "";
        if (text) out.push({ kind: "thinking", text });
      }
      break;
    }
    case "turn.completed": {
      const usage = (r.usage as Record<string, unknown>) ?? {};
      const inputTokens = Number(usage.input_tokens ?? usage.inputTokens ?? 0);
      const outputTokens = Number(usage.output_tokens ?? usage.outputTokens ?? 0);
      out.push({
        kind: "usage",
        inputTokens,
        outputTokens,
        cacheReadTokens: Number(usage.cached_input_tokens ?? usage.cachedInputTokens ?? 0) || undefined,
      });
      out.push({ kind: "completion", durationMs: 0, result: null });
      break;
    }
    case "error": {
      const message = typeof r.message === "string" ? (r.message as string) : "codex error";
      out.push({ kind: "error", message, recoverable: false });
      break;
    }
    case "turn.failed": {
      const errInfo = (r.error as { message?: string }) ?? {};
      let message = errInfo.message ?? "codex turn failed";
      // codex wraps API errors as nested JSON strings — try to unwrap for clarity
      try {
        const inner = JSON.parse(message);
        if (inner?.error?.message) message = `${inner.error.type ?? "error"}: ${inner.error.message}`;
      } catch {
        /* leave as-is */
      }
      // Friendly hint for the most common codex auth pitfall: gpt-5-codex
      // requires API-key auth, not a ChatGPT-account login.
      if (/not supported when using Codex with a ChatGPT account/i.test(message)) {
        message +=
          " — fix: leave Default model blank (codex picks), pick a non-codex model (e.g. gpt-5), or sign out of ChatGPT auth and run `codex login` with an API key.";
      }
      out.push({ kind: "error", message, recoverable: false });
      break;
    }
    // thread.started / turn.started / item.started — codex life signals.
    // Not surfaced as engine events; the spawn-started + status pill cover it.
    case "thread.started":
    case "turn.started":
    case "item.started":
      break;
  }
  return out;
}

/**
 * Stateful line-buffered JSON parser for stdout chunks. Each chunk may contain
 * partial lines; this accumulates and yields complete events once \n is seen.
 */
export class JsonlStreamParser {
  private buffer = "";

  consume(chunk: string): RawClaudeEvent[] {
    this.buffer += chunk;
    const events: RawClaudeEvent[] = [];
    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line) continue;
      try {
        events.push(JSON.parse(line) as RawClaudeEvent);
      } catch {
        // Defensive: skip malformed lines rather than crash the stream.
      }
    }
    return events;
  }

  /** Drain any final non-newline-terminated content (rare). */
  flush(): RawClaudeEvent[] {
    const remainder = this.buffer.trim();
    this.buffer = "";
    if (!remainder) return [];
    try {
      return [JSON.parse(remainder) as RawClaudeEvent];
    } catch {
      return [];
    }
  }
}

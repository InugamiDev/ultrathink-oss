// intent: regression coverage for the stream-json parser — covers all known event shapes
// status: done — guards the stream_event recursion fix and codex normalisation
// next: snapshot tests against real claude / codex captures

import { describe, expect, it } from "vitest";
import { JsonlStreamParser, normaliseClaudeEvent, normaliseCodexEvent } from "../src/parse.js";

describe("normaliseClaudeEvent", () => {
  it("emits text-delta on bare content_block_delta", () => {
    const evs = normaliseClaudeEvent({
      type: "content_block_delta",
      delta: { type: "text_delta", text: "Hello" },
    });
    expect(evs).toEqual([{ kind: "assistant-text-delta", text: "Hello" }]);
  });

  it("recurses into stream_event wrapper (--include-partial-messages mode)", () => {
    const evs = normaliseClaudeEvent({
      type: "stream_event",
      event: {
        type: "content_block_delta",
        delta: { type: "text_delta", text: " world" },
      },
    });
    expect(evs).toEqual([{ kind: "assistant-text-delta", text: " world" }]);
  });

  it("emits thinking on thinking_delta", () => {
    const evs = normaliseClaudeEvent({
      type: "content_block_delta",
      delta: { type: "thinking_delta", thinking: "...consider..." },
    });
    expect(evs).toEqual([{ kind: "thinking", text: "...consider..." }]);
  });

  it("emits tool-use-start from assistant blocks", () => {
    const evs = normaliseClaudeEvent({
      type: "assistant",
      message: {
        content: [{ type: "tool_use", id: "tool_123", name: "Read", input: { path: "/x" } }],
      },
    });
    expect(evs[0].kind).toBe("tool-use-start");
    expect((evs[0] as { name: string }).name).toBe("Read");
  });

  it("emits completion + usage on result type", () => {
    const evs = normaliseClaudeEvent({
      type: "result",
      duration_ms: 1234,
      total_cost_usd: 0.01,
      result: "end_turn",
    });
    expect(evs[0].kind).toBe("completion");
    expect((evs[0] as { durationMs: number }).durationMs).toBe(1234);
    expect((evs[0] as { costUsd: number }).costUsd).toBe(0.01);
  });

  it("ignores unknown event types gracefully", () => {
    const evs = normaliseClaudeEvent({ type: "future_event_type", whatever: 42 });
    expect(evs).toEqual([]);
  });
});

describe("normaliseCodexEvent", () => {
  it("emits text-block from item.completed assistant_message", () => {
    const evs = normaliseCodexEvent({
      type: "item.completed",
      item: { type: "assistant_message", text: "Hi from codex" },
    });
    expect(evs).toEqual([{ kind: "assistant-text-block", text: "Hi from codex" }]);
  });

  it("emits tool-use-start from tool_call item", () => {
    const evs = normaliseCodexEvent({
      type: "item.completed",
      item: { type: "tool_call", id: "call_1", name: "shell", input: { cmd: "ls" } },
    });
    expect(evs[0].kind).toBe("tool-use-start");
    expect((evs[0] as { name: string }).name).toBe("shell");
  });

  it("emits usage + completion on turn.completed", () => {
    const evs = normaliseCodexEvent({
      type: "turn.completed",
      usage: { input_tokens: 100, output_tokens: 250 },
    });
    const kinds = evs.map((e) => e.kind);
    expect(kinds).toContain("usage");
    expect(kinds).toContain("completion");
    const usage = evs.find((e) => e.kind === "usage") as
      | { kind: "usage"; inputTokens: number; outputTokens: number }
      | undefined;
    expect(usage?.inputTokens).toBe(100);
    expect(usage?.outputTokens).toBe(250);
  });

  // Regression coverage for live-found codex bugs (commits 672bdac):
  it("emits error from turn.failed and unwraps nested API JSON", () => {
    const evs = normaliseCodexEvent({
      type: "turn.failed",
      error: {
        message:
          '{"type":"error","status":400,"error":{"type":"invalid_request_error","message":"The \'gpt-5\' model is not supported when using Codex with a ChatGPT account."}}',
      },
    });
    expect(evs.length).toBe(1);
    expect(evs[0].kind).toBe("error");
    const msg = (evs[0] as { kind: "error"; message: string }).message;
    expect(msg).toContain("invalid_request_error");
    expect(msg).toContain("not supported");
  });

  it("ignores life-signal events (thread.started / turn.started / item.started)", () => {
    expect(normaliseCodexEvent({ type: "thread.started", thread_id: "t1" })).toEqual([]);
    expect(normaliseCodexEvent({ type: "turn.started" })).toEqual([]);
    expect(normaliseCodexEvent({ type: "item.started" })).toEqual([]);
  });

  it("doesn't crash on unknown future codex types", () => {
    expect(() => normaliseCodexEvent({ type: "future_codex_type", payload: { x: 1 } })).not.toThrow();
    expect(normaliseCodexEvent({ type: "future_codex_type" })).toEqual([]);
  });
});

describe("JsonlStreamParser", () => {
  it("yields complete lines and buffers partials", () => {
    const p = new JsonlStreamParser();
    expect(p.consume('{"type":"a"}\n{"type":"b"')).toEqual([{ type: "a" }]);
    expect(p.consume("}\n")).toEqual([{ type: "b" }]);
  });

  it("flushes the trailing non-newline-terminated line", () => {
    const p = new JsonlStreamParser();
    p.consume('{"type":"x"}');
    expect(p.flush()).toEqual([{ type: "x" }]);
  });

  it("skips malformed lines instead of crashing", () => {
    const p = new JsonlStreamParser();
    expect(p.consume('not json\n{"type":"good"}\n')).toEqual([{ type: "good" }]);
  });
});

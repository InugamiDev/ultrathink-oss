"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, UsageInfo, ToolEvent, WebSource, PersonaSkill } from "@/lib/ai/types";
import { AI_MARKDOWN_STYLES } from "@/lib/ai/parse";
import { ChatMessageBubble } from "./chat-message";

/* ─── Props ────────────────────────────────────────────────────────── */

interface AIChatProps {
  /** System prompt for the AI persona */
  systemPrompt: string;
  /** Available skills/quick actions */
  skills?: PersonaSkill[];
  /** Title shown in empty state */
  title?: string;
  /** Subtitle shown in empty state */
  subtitle?: string;
  /** Icon emoji for empty state */
  icon?: string;
  /** Whether to enable thinking mode (default true) */
  enableThinking?: boolean;
  /** Custom empty state content */
  emptyState?: React.ReactNode;
  /** Height class (default: h-[calc(100vh-4rem)]) */
  heightClass?: string;
}

/* ─── Component ────────────────────────────────────────────────────── */

export function AIChat({
  systemPrompt,
  skills = [],
  title = "AI Assistant",
  subtitle = "Ask anything — powered by Groq with thinking and web search.",
  icon = "🤖",
  enableThinking = true,
  emptyState,
  heightClass = "h-[calc(100vh-4rem)]",
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTasks, setActiveTasks] = useState<Set<string>>(new Set());
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingThinking, setStreamingThinking] = useState("");
  const [streamPhase, setStreamPhase] = useState<"idle" | "thinking" | "writing">("idle");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingThinking, scrollToBottom]);

  useEffect(() => {
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  }, [input]);

  /* ─── Send Message ─── */

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming) return;

    setError(null);
    setUsage(null);
    setStreamingThinking("");
    setStreamPhase("idle");

    const userMessage: ChatMessage = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "", toolEvents: [], sources: [] };
    setMessages([...newMessages, assistantMessage]);

    const taskTypes = activeTasks.size > 0 ? [...activeTasks] : undefined;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          taskTypes,
          systemPrompt,
          enableThinking,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let thinkingText = "";
      let model = "";
      const toolEvents: ToolEvent[] = [];
      let sources: WebSource[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "start":
                model = data.model;
                break;

              case "thinking":
                setStreamPhase("thinking");
                thinkingText = data.text;
                setStreamingThinking(data.text);
                break;

              case "thinking_done":
                setStreamPhase("writing");
                setStreamingThinking("");
                break;

              case "tool": {
                const idx = toolEvents.findIndex(
                  (te) => te.label === data.event.label && te.detail === data.event.detail && te.status === "running"
                );
                if (idx >= 0 && data.event.status !== "running") {
                  toolEvents[idx] = data.event;
                } else if (data.event.status === "running") {
                  toolEvents.push(data.event);
                }
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    toolEvents: [...toolEvents],
                  };
                  return updated;
                });
                break;
              }

              case "text":
                fullText += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullText,
                    thinking: thinkingText || undefined,
                    model,
                    toolEvents: toolEvents.length > 0 ? [...toolEvents] : undefined,
                  };
                  return updated;
                });
                break;

              case "sources":
                sources = data.sources;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    sources,
                  };
                  return updated;
                });
                break;

              case "done":
                setUsage(data.usage);
                // Final update with all metadata
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullText,
                    thinking: thinkingText || undefined,
                    model: data.usage.model,
                    toolEvents: toolEvents.length > 0 ? [...toolEvents] : undefined,
                    sources: sources.length > 0 ? sources : undefined,
                  };
                  return updated;
                });
                break;

              case "error":
                throw new Error(data.error);
            }
          } catch {
            // Skip malformed SSE
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages(newMessages);
    } finally {
      setIsStreaming(false);
      setActiveTasks(new Set());
      setStreamPhase("idle");
      setStreamingThinking("");
    }
  }

  /* ─── Handlers ─── */

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function toggleTask(type: string) {
    setActiveTasks((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    inputRef.current?.focus();
  }

  function clearChat() {
    setMessages([]);
    setUsage(null);
    setError(null);
    setActiveTasks(new Set());
  }

  const hasMessages = messages.length > 0;

  /* ─── Placeholder ─── */

  const placeholder = (() => {
    if (activeTasks.size === 0) return "Type a message...";
    if (activeTasks.size === 1) {
      const skill = skills.find((s) => s.type === [...activeTasks][0]);
      return skill?.placeholder ?? "Type a message...";
    }
    return `Combine ${[...activeTasks].map((t) => skills.find((s) => s.type === t)?.label).filter(Boolean).join(" + ")}...`;
  })();

  /* ─── Render ─── */

  return (
    <div className={`flex flex-col ${heightClass}`}>
      <style>{AI_MARKDOWN_STYLES}</style>

      {/* ─── Empty State ─── */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {emptyState ?? (
            <div className="text-center mb-10">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-info)] flex items-center justify-center mb-6 shadow-lg">
                <span className="text-4xl">{icon}</span>
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">{title}</h2>
              <p className="text-base text-[var(--color-text-muted)] max-w-lg mx-auto">{subtitle}</p>
            </div>
          )}

          {/* Skill Grid */}
          {skills.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl w-full">
                {skills.map((skill) => {
                  const isActive = activeTasks.has(skill.type);
                  return (
                    <button
                      key={skill.type}
                      onClick={() => toggleTask(skill.type)}
                      className={`p-4 rounded-xl border shadow-sm transition-all duration-200 motion-reduce:transition-none text-left
                                 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                                 ${
                                   isActive
                                     ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-md"
                                     : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:shadow-md"
                                 }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-2xl block mb-2">{skill.icon}</span>
                        {isActive && (
                          <span className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"}`}>
                        {skill.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeTasks.size > 0 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {activeTasks.size} skill{activeTasks.size !== 1 ? "s" : ""} selected
                  </span>
                  <button
                    onClick={() => setActiveTasks(new Set())}
                    className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] transition-colors duration-150 underline underline-offset-2"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Messages ─── */}
      {hasMessages && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1;
              return (
                <ChatMessageBubble
                  key={i}
                  message={msg}
                  isStreaming={isLast && isStreaming}
                  streamingThinking={isLast && isStreaming ? streamingThinking : undefined}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ─── Stream Phase Indicator ─── */}
      {isStreaming && streamPhase !== "idle" && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="max-w-4xl mx-auto px-6 py-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse bg-violet-500" />
            <span className="text-xs text-[var(--color-text-dim)] font-mono">
              {streamPhase === "thinking" ? "Reasoning..." : "Writing response..."}
            </span>
          </div>
        </div>
      )}

      {/* ─── Usage / Error Bar ─── */}
      {(usage || error) && !isStreaming && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="max-w-4xl mx-auto px-6 py-2 flex items-center justify-between">
            {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
            {usage && (
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-dim)] ml-auto">
                <span className="font-mono">{usage.model}</span>
                <span>{usage.input_tokens + usage.output_tokens} tokens</span>
                {usage.web_search_requests > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                    {usage.web_search_requests} web search{usage.web_search_requests > 1 ? "es" : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Input Area ─── */}
      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="max-w-4xl mx-auto">
          {/* Active skill pills */}
          {activeTasks.size > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {[...activeTasks].map((type) => {
                const skill = skills.find((s) => s.type === type);
                if (!skill) return null;
                return (
                  <button
                    key={type}
                    onClick={() => toggleTask(type)}
                    className="px-3 py-1.5 text-xs rounded-full font-medium bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)]
                               hover:bg-[var(--color-accent)]/20 transition-colors duration-150 flex items-center gap-1.5"
                  >
                    {skill.icon} {skill.label}
                    <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                );
              })}
              <button
                onClick={() => setActiveTasks(new Set())}
                className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] transition-colors duration-150"
              >
                Clear all
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none px-4 py-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)]
                         text-base text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]
                         hover:border-[var(--color-border-hover)]
                         focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20
                         transition-all duration-200 motion-reduce:transition-none
                         disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-white font-medium text-base
                         hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-200 motion-reduce:transition-none
                         focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]
                         flex items-center gap-2 shrink-0"
            >
              {isStreaming ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {streamPhase === "thinking" ? "Thinking" : "Writing"}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                  Send
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between mt-3 text-xs text-[var(--color-text-dim)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                Thinking
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                Web Search
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                Groq LPU
              </span>
            </div>
            {hasMessages && (
              <button
                onClick={clearChat}
                className="hover:text-[var(--color-text-muted)] transition-colors duration-150"
              >
                Clear chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

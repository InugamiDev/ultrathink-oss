"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/lib/types/memory";

interface BrainChatProps {
  onMemoryCreated: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function BrainChat({ onMemoryCreated, isCollapsed, onToggleCollapse }: BrainChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "system",
      content: "Memory Brain online. Search memories, create new ones, or link them together.\n\nCommands:\n- Type anything to search\n- create: <content>\n- tag <id> #tag\n- relate <id1> -> <id2>",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/memory/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      let responseText = data.response ?? data.error ?? "No response";

      if (data.memories?.length) {
        responseText += "\n\n" + data.memories
          .map((m: { id: string; content: string; category: string; importance: number }) =>
            `[${m.category}] ${m.content.slice(0, 60)}... (I:${m.importance}, id:${m.id})`
          )
          .join("\n");
      }

      const sysMsg: ChatMessage = {
        id: `s-${Date.now()}`,
        role: "system",
        content: responseText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, sysMsg]);

      if (data.created) {
        onMemoryCreated();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "system", content: "Connection error. Is the database configured?", timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-[var(--color-border)] flex flex-col">
      {/* Header */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--color-text-muted)]
                   hover:bg-[var(--color-surface-2)] transition-all duration-200 motion-reduce:transition-none
                   focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)] galaxy-pulse" />
          Brain Chat
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-64">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "text-[var(--color-accent)] font-mono"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                <span className="text-xs text-[var(--color-text-dim)] mr-2">
                  {msg.role === "user" ? ">" : "#"}
                </span>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="text-sm text-[var(--color-text-dim)] animate-pulse">
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-[var(--color-border)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Search or command..."
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg text-sm bg-[var(--color-bg)] border border-[var(--color-border)]
                           text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
                           transition-all duration-200 motion-reduce:transition-none
                           disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-3 rounded-lg bg-[var(--color-accent)] text-black text-sm font-medium
                           hover:bg-[var(--color-accent-hover)] disabled:opacity-50
                           transition-all duration-200 motion-reduce:transition-none
                           focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import type { ChatMessage } from "@/lib/ai/types";
import { renderMarkdown } from "@/lib/ai/parse";
import { ThinkingBlock } from "./thinking-block";
import { ToolActivityList, SourceCards } from "./tool-activity";

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
  /** Partial thinking text while still streaming */
  streamingThinking?: string;
}

/**
 * Renders a single chat message bubble with support for:
 * - Collapsible thinking blocks
 * - Tool activity indicators
 * - Markdown content (sanitized via escapeHtml in renderMarkdown)
 * - Web source citations
 * - Model badge
 */
export function ChatMessageBubble({ message, isStreaming, streamingThinking }: ChatMessageProps) {
  const isUser = message.role === "user";
  const hasThinking = !!message.thinking || !!streamingThinking;
  const isThinkingPhase = isStreaming && !!streamingThinking && !message.content;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? "p-4 rounded-2xl rounded-br-md bg-[var(--color-accent)] text-white"
            : "p-5 rounded-2xl rounded-bl-md bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-[var(--color-text)]"
        }`}
      >
        {isUser ? (
          <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            {/* Thinking block */}
            {hasThinking && (
              <ThinkingBlock
                content={message.thinking || streamingThinking || ""}
                isStreaming={isThinkingPhase}
              />
            )}

            {/* Tool activity */}
            {message.toolEvents && message.toolEvents.length > 0 && (
              <ToolActivityList events={message.toolEvents} />
            )}

            {/* Main content — sanitized markdown rendered to HTML */}
            {message.content ? (
              <MarkdownContent html={renderMarkdown(message.content)} />
            ) : isStreaming && !isThinkingPhase ? (
              <StreamingDots />
            ) : null}

            {/* Web sources */}
            {message.sources && message.sources.length > 0 && (
              <SourceCards sources={message.sources} />
            )}

            {/* Model badge */}
            {message.model && !isStreaming && (
              <div className="mt-3 flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-dim)] font-mono">
                  {message.model}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Renders pre-sanitized HTML from renderMarkdown().
 * All text content is escaped via escapeHtml() before HTML construction
 * in lib/ai/parse.ts — no raw user input reaches the DOM.
 */
function MarkdownContent({ html }: { html: string }) {
  return <div className="text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}

function StreamingDots() {
  return (
    <div className="flex items-center gap-2 text-[var(--color-text-dim)]">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-sm">Processing...</span>
    </div>
  );
}

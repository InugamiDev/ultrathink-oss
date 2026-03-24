"use client";

import { useState } from "react";

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({ content, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!content && !isStreaming) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors duration-150"
      >
        {/* Brain icon */}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
          />
        </svg>

        {isStreaming ? (
          <span className="flex items-center gap-1.5">
            Thinking
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "100ms" }} />
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "200ms" }} />
            </span>
          </span>
        ) : (
          <span>{expanded ? "Hide reasoning" : "Show reasoning"}</span>
        )}

        {!isStreaming && (
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {(expanded || isStreaming) && content && (
        <div className="mt-2 px-3 py-2.5 rounded-lg bg-violet-500/5 border border-violet-500/15 text-sm text-violet-300/80 leading-relaxed whitespace-pre-wrap font-mono">
          {content}
        </div>
      )}
    </div>
  );
}

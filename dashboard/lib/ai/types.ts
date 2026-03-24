/* ─── Shared AI Chat Types ─────────────────────────────────────────── */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Extracted thinking block (collapsible reasoning) */
  thinking?: string;
  /** Tool activity events that occurred during this message */
  toolEvents?: ToolEvent[];
  /** Web sources cited */
  sources?: WebSource[];
  /** Model used for this response */
  model?: string;
}

export interface ToolEvent {
  type: "web_search" | "analyze" | "plan" | "generate" | "tool_call";
  label: string;
  /** Query or description */
  detail?: string;
  status: "running" | "done" | "error";
  durationMs?: number;
}

export interface WebSource {
  url: string;
  title: string;
}

export interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  web_search_requests: number;
  model: string;
}

/** SSE event types emitted by /api/ai/chat */
export type SSEEvent =
  | { type: "start"; model: string }
  | { type: "thinking"; text: string }
  | { type: "thinking_done" }
  | { type: "tool"; event: ToolEvent }
  | { type: "text"; text: string }
  | { type: "sources"; sources: WebSource[] }
  | { type: "done"; usage: UsageInfo }
  | { type: "error"; error: string };

/** Persona definition for the AI chat engine */
export interface AIChatPersona {
  id: string;
  name: string;
  systemPrompt: string;
  /** Skills/quick actions available for this persona */
  skills?: PersonaSkill[];
}

export interface PersonaSkill {
  type: string;
  label: string;
  icon: string;
  placeholder: string;
  /** If true, forces compound model (web search) */
  needsWebSearch?: boolean;
}

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import type { ToolEvent, WebSource } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* ─── Models ───────────────────────────────────────────────────────── */

const STREAMING_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const COMPOUND_MODEL = "compound-beta";

/* ─── Thinking Prompt Injection ────────────────────────────────────── */

const THINKING_INSTRUCTION = `

IMPORTANT: Before answering, you MUST reason through the problem inside <thinking>...</thinking> tags.
In your thinking block:
1. Break down what the user is asking
2. Consider different angles and approaches
3. Identify what data or research is needed
4. Plan your response structure

After closing </thinking>, write your actual response.
Example:
<thinking>
The user wants X. I should consider A, B, C. Let me structure this as...
</thinking>

[Your actual response here]`;

/* ─── SSE Helper ───────────────────────────────────────────────────── */

function sseEncode(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

/* ─── POST Handler ─────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured. Add it to your dashboard .env.local file." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { messages, taskTypes, taskType, systemPrompt, enableThinking = true, forceWebSearch = false } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Normalize task types (array or legacy single)
    const resolvedTasks: string[] = Array.isArray(taskTypes) ? taskTypes : taskType ? [taskType] : [];

    // Task-specific prefixes
    const taskPrefixes: Record<string, string> = {
      research: "Conduct thorough market research. Search the web for current data.",
      competitor: "Analyze competitors using live web search for the latest data.",
      content: "Create a detailed content strategy with actionable items.",
      copy: "Write compelling marketing copy. Be creative but on-brand.",
      seo: "Provide SEO-focused recommendations. Search the web for latest SEO trends and data.",
      campaign: "Design a comprehensive marketing campaign with timeline, channels, and KPIs.",
      persona: "Build detailed audience personas. Search the web for demographic and market data.",
      brand: "Develop brand strategy recommendations.",
    };

    // Research tasks that need web search
    const RESEARCH_TASKS = new Set(["research", "competitor", "seo", "persona"]);

    // Enrich last user message with task prefixes
    const enrichedMessages = [...messages];
    if (resolvedTasks.length > 0 && enrichedMessages.length > 0) {
      const lastMsg = enrichedMessages[enrichedMessages.length - 1];
      if (lastMsg.role === "user") {
        const prefix = resolvedTasks
          .map((t: string) => taskPrefixes[t])
          .filter(Boolean)
          .join(" ");
        if (prefix) {
          enrichedMessages[enrichedMessages.length - 1] = {
            ...lastMsg,
            content: prefix + " " + lastMsg.content,
          };
        }
      }
    }

    // Build system prompt with optional thinking instruction
    const baseSystemPrompt =
      systemPrompt ||
      "You are a helpful AI assistant embedded in the UltraThink dashboard. Be concise, actionable, and format responses with markdown.";
    const fullSystemPrompt = enableThinking ? baseSystemPrompt + THINKING_INSTRUCTION : baseSystemPrompt;

    const apiMessages = [
      { role: "system" as const, content: fullSystemPrompt },
      ...enrichedMessages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Use compound model if any task needs web search, or explicitly requested
    const useCompound = forceWebSearch || resolvedTasks.some((t) => RESEARCH_TASKS.has(t));
    const model = useCompound ? COMPOUND_MODEL : STREAMING_MODEL;

    if (useCompound) {
      return handleCompoundRequest(client, apiMessages, model, resolvedTasks);
    }

    return handleStreamingRequest(client, apiMessages, model);
  } catch (e) {
    console.error("AI Chat API error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ─── Compound (web search) Handler ────────────────────────────────── */

async function handleCompoundRequest(
  client: Groq,
  apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: string,
  tasks: string[]
) {
  const startTime = Date.now();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Emit start
        controller.enqueue(sseEncode({ type: "start", model }));

        // Emit a "searching" indicator while compound model works
        controller.enqueue(
          sseEncode({
            type: "tool",
            event: {
              type: "web_search",
              label: "Web Search",
              detail: tasks.length > 0 ? `Searching for ${tasks.join(", ")} data...` : "Searching the web...",
              status: "running",
            },
          })
        );

        // Call Groq compound model
        const completion = await client.chat.completions.create({
          messages: apiMessages,
          model,
          max_completion_tokens: 4096,
          temperature: 0.7,
        });

        const content = completion.choices[0]?.message?.content ?? "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const executedTools = (completion.choices[0]?.message as any)?.executed_tools;
        const usage = completion.usage;
        const elapsed = Date.now() - startTime;

        // Mark searching as done
        controller.enqueue(
          sseEncode({
            type: "tool",
            event: {
              type: "web_search",
              label: "Web Search",
              detail: "Search complete",
              status: "done",
              durationMs: elapsed,
            },
          })
        );

        // Extract sources from executed tools (Groq compound format)
        const sources: WebSource[] = [];
        if (Array.isArray(executedTools)) {
          for (const tool of executedTools) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const t = tool as any;
            // Groq compound returns search_results.results[] with {title, url, content, score}
            if (t.type === "search" && t.search_results?.results) {
              for (const r of t.search_results.results) {
                if (r.url) {
                  sources.push({ url: r.url, title: r.title || "" });
                }
              }
            }
            // Also handle visit_website tool
            if (t.type === "visit_website" && t.arguments) {
              try {
                const args = JSON.parse(t.arguments);
                if (args.url) sources.push({ url: args.url, title: args.url });
              } catch {
                /* skip */
              }
            }
          }
        }

        // Build real tool events from executed_tools
        if (Array.isArray(executedTools)) {
          for (const tool of executedTools) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const t = tool as any;
            const toolType =
              t.type === "search"
                ? "web_search"
                : t.type === "code_execution"
                  ? "analyze"
                  : t.type === "browser"
                    ? "tool_call"
                    : "tool_call";
            let detail = "";
            try {
              const args = JSON.parse(t.arguments || "{}");
              detail = args.query || args.url || args.code?.slice(0, 80) || "";
            } catch {
              /* skip */
            }
            controller.enqueue(
              sseEncode({
                type: "tool",
                event: {
                  type: toolType,
                  label:
                    t.type === "search"
                      ? "Web Search"
                      : t.type === "code_execution"
                        ? "Code Execution"
                        : t.type === "browser"
                          ? "Browser"
                          : t.type === "visit_website"
                            ? "Visit Website"
                            : t.type || "Tool",
                  detail,
                  status: "done" as const,
                  durationMs: elapsed,
                },
              })
            );
          }
        }

        // Stream the content in chunks
        const chunkSize = 30;
        for (let i = 0; i < content.length; i += chunkSize) {
          controller.enqueue(sseEncode({ type: "text", text: content.slice(i, i + chunkSize) }));
        }

        // Emit sources if found
        if (sources.length > 0) {
          controller.enqueue(sseEncode({ type: "sources", sources }));
        }

        // Done
        controller.enqueue(
          sseEncode({
            type: "done",
            usage: {
              input_tokens: usage?.prompt_tokens ?? 0,
              output_tokens: usage?.completion_tokens ?? 0,
              web_search_requests: Array.isArray(executedTools) ? executedTools.length : 0,
              model,
            },
          })
        );
        controller.close();
      } catch (err) {
        controller.enqueue(sseEncode({ type: "error", error: String(err) }));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/* ─── Streaming Handler ────────────────────────────────────────────── */

async function handleStreamingRequest(
  client: Groq,
  apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model: string
) {
  const readable = new ReadableStream({
    async start(controller) {
      try {
        let totalTokens = 0;
        controller.enqueue(sseEncode({ type: "start", model }));

        const stream = await client.chat.completions.create({
          messages: apiMessages,
          model,
          max_completion_tokens: 4096,
          temperature: 0.7,
          stream: true,
        });

        let buffer = "";
        let thinkingSent = false;

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            buffer += delta;

            // Detect thinking block boundaries
            if (!thinkingSent && buffer.includes("<thinking>")) {
              // We're in thinking mode — check if block is closed
              if (buffer.includes("</thinking>")) {
                // Extract and send thinking
                const match = buffer.match(/<thinking>([\s\S]*?)<\/thinking>/);
                if (match) {
                  controller.enqueue(sseEncode({ type: "thinking", text: match[1].trim() }));
                  controller.enqueue(sseEncode({ type: "thinking_done" }));
                  thinkingSent = true;
                  // Send remaining content after thinking
                  const afterThinking = buffer.replace(/<thinking>[\s\S]*?<\/thinking>\s*/, "");
                  if (afterThinking) {
                    controller.enqueue(sseEncode({ type: "text", text: afterThinking }));
                  }
                  buffer = "";
                }
                // else keep buffering
              } else {
                // Still inside thinking — send partial thinking for live display
                const partialMatch = buffer.match(/<thinking>([\s\S]*)$/);
                if (partialMatch) {
                  controller.enqueue(sseEncode({ type: "thinking", text: partialMatch[1] }));
                }
              }
            } else if (thinkingSent || !buffer.includes("<thinking>")) {
              // Normal content — stream directly
              controller.enqueue(sseEncode({ type: "text", text: delta }));
            }
          }

          if (chunk.x_groq?.usage) {
            totalTokens = (chunk.x_groq.usage.prompt_tokens ?? 0) + (chunk.x_groq.usage.completion_tokens ?? 0);
          }
        }

        // Flush any remaining buffer (e.g. if thinking never closed)
        if (buffer && !thinkingSent) {
          // No thinking block found — send everything as text
          controller.enqueue(sseEncode({ type: "text", text: buffer }));
        }

        controller.enqueue(
          sseEncode({
            type: "done",
            usage: {
              input_tokens: 0,
              output_tokens: totalTokens,
              web_search_requests: 0,
              model,
            },
          })
        );
        controller.close();
      } catch (err) {
        controller.enqueue(sseEncode({ type: "error", error: String(err) }));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

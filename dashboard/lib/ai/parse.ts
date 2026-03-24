/* ─── Thinking Block Parser + Markdown Renderer ────────────────────── */

/**
 * Parse `<thinking>...</thinking>` blocks from model output.
 * Returns { thinking, content } where content has thinking removed.
 */
export function parseThinking(raw: string): { thinking: string; content: string } {
  const thinkingMatch = raw.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (!thinkingMatch) return { thinking: "", content: raw };

  const thinking = thinkingMatch[1].trim();
  const content = raw.replace(/<thinking>[\s\S]*?<\/thinking>\s*/, "").trim();
  return { thinking, content };
}

/**
 * Detect if the stream is currently inside an unclosed thinking block.
 * Used for live streaming to show "thinking..." indicator.
 */
export function isInThinking(partial: string): boolean {
  const opens = (partial.match(/<thinking>/g) || []).length;
  const closes = (partial.match(/<\/thinking>/g) || []).length;
  return opens > closes;
}

/**
 * Extract partial thinking content from an unclosed block.
 */
export function extractPartialThinking(partial: string): string {
  const match = partial.match(/<thinking>([\s\S]*)$/);
  return match ? match[1].trim() : "";
}

/* ─── Sanitized Markdown Renderer ──────────────────────────────────── */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="ai-inline-code">$1</code>')
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-link">$1</a>'
    );
}

export function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let inList = false;
  let listType: "ul" | "ol" = "ul";

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push("</code></pre>");
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        const lang = line.slice(3).trim();
        html.push(`<pre class="ai-code"${lang ? ` data-lang="${escapeHtml(lang)}"` : ""}><code>`);
      }
      continue;
    }

    if (inCodeBlock) {
      html.push(escapeHtml(line) + "\n");
      continue;
    }

    // Close list if current line isn't a list item
    if (inList && !line.match(/^[-*]\s/) && !line.match(/^\d+\.\s/) && line.trim() !== "") {
      html.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
    }

    if (line.startsWith("#### ")) {
      html.push(`<h4 class="ai-h4">${formatInline(line.slice(5))}</h4>`);
    } else if (line.startsWith("### ")) {
      html.push(`<h3 class="ai-h3">${formatInline(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      html.push(`<h2 class="ai-h2">${formatInline(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      html.push(`<h1 class="ai-h1">${formatInline(line.slice(2))}</h1>`);
    } else if (line.match(/^[-*]\s/)) {
      if (!inList) {
        html.push('<ul class="ai-list">');
        inList = true;
        listType = "ul";
      }
      html.push(`<li>${formatInline(line.slice(2))}</li>`);
    } else if (line.match(/^\d+\.\s/)) {
      if (!inList) {
        html.push('<ol class="ai-list ai-list-ordered">');
        inList = true;
        listType = "ol";
      }
      html.push(`<li>${formatInline(line.replace(/^\d+\.\s/, ""))}</li>`);
    } else if (line.startsWith("> ")) {
      html.push(`<blockquote class="ai-quote">${formatInline(line.slice(2))}</blockquote>`);
    } else if (line.startsWith("---")) {
      html.push('<hr class="ai-hr" />');
    } else if (line.trim() === "") {
      html.push("<br />");
    } else {
      html.push(`<p class="ai-p">${formatInline(line)}</p>`);
    }
  }

  if (inList) html.push(listType === "ol" ? "</ol>" : "</ul>");
  if (inCodeBlock) html.push("</code></pre>");

  return html.join("\n");
}

/** CSS for AI markdown rendering — inject via <style> */
export const AI_MARKDOWN_STYLES = `
  .ai-h1 { font-size: 1.5rem; font-weight: 700; margin: 1.5rem 0 0.75rem; color: var(--color-text); }
  .ai-h2 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem; color: var(--color-text); }
  .ai-h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--color-text); }
  .ai-h4 { font-size: 1rem; font-weight: 600; margin: 0.75rem 0 0.375rem; color: var(--color-text); }
  .ai-p { margin: 0.375rem 0; line-height: 1.7; }
  .ai-list { padding-left: 1.5rem; margin: 0.5rem 0; }
  .ai-list li { margin: 0.25rem 0; line-height: 1.6; list-style-type: disc; }
  .ai-list-ordered li { list-style-type: decimal; }
  .ai-quote { border-left: 3px solid var(--color-accent); padding: 0.5rem 1rem; margin: 0.75rem 0; color: var(--color-text-muted); background: var(--color-surface-2); border-radius: 0 0.5rem 0.5rem 0; }
  .ai-code { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1rem; overflow-x: auto; font-size: 0.875rem; margin: 0.75rem 0; }
  .ai-inline-code { background: var(--color-surface-2); padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.9em; }
  .ai-link { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }
  .ai-link:hover { opacity: 0.8; }
  .ai-hr { border: none; border-top: 1px solid var(--color-border); margin: 1rem 0; }
`;

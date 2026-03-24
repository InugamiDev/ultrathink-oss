"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const layerColors: Record<string, string> = {
  orchestrator: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  hub: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  utility: "bg-green-500/10 text-green-400 border-green-500/20",
  domain: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

interface SkillDetail {
  name: string;
  description: string;
  layer: string;
  category: string;
  triggers: string[];
  linksTo: string[];
  linkedFrom: string[];
  riskLevel: string;
  content: string;
}

interface ContentBlock {
  type: "heading" | "code" | "text" | "list" | "table";
  level?: number;
  lang?: string;
  value: string;
  rows?: string[][];
  items?: string[];
}

function parseMarkdown(md: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", lang, value: codeLines.join("\n") });
      i++;
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      blocks.push({ type: "heading", level: 1, value: line.slice(2) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", level: 2, value: line.slice(3) });
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "heading", level: 3, value: line.slice(4) });
      i++;
      continue;
    }

    // Tables
    if (line.startsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i]
          .split("|")
          .filter(Boolean)
          .map((c) => c.trim());
        // Skip separator rows
        if (!cells.every((c) => /^[-:]+$/.test(c))) {
          tableRows.push(cells);
        }
        i++;
      }
      if (tableRows.length > 0) {
        blocks.push({ type: "table", value: "", rows: tableRows });
      }
      continue;
    }

    // List items
    if (line.match(/^[-*] ./) || line.match(/^\d+\. ./)) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].match(/^[-*] ./) || lines[i].match(/^\d+\. ./))) {
        items.push(lines[i].replace(/^[-*] /, "").replace(/^\d+\. /, ""));
        i++;
      }
      blocks.push({ type: "list", value: "", items });
      continue;
    }

    // Text paragraphs
    if (line.trim()) {
      blocks.push({ type: "text", value: line });
    }
    i++;
  }

  return blocks;
}

function InlineText({ text }: { text: string }) {
  // Parse bold and inline code
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-[var(--color-text)]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded text-sm font-mono">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function SkillContent({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            if (block.level === 1)
              return (
                <h1 key={i} className="text-2xl font-bold mt-8 mb-4 text-[var(--color-text)]">
                  <InlineText text={block.value} />
                </h1>
              );
            if (block.level === 2)
              return (
                <h2 key={i} className="text-xl font-bold mt-8 mb-3 text-[var(--color-text)]">
                  <InlineText text={block.value} />
                </h2>
              );
            return (
              <h3 key={i} className="text-lg font-semibold mt-6 mb-2 text-[var(--color-text)]">
                <InlineText text={block.value} />
              </h3>
            );

          case "code":
            return (
              <pre
                key={i}
                className="bg-[var(--color-surface-2)] rounded-lg p-4 overflow-x-auto text-sm my-4 font-mono"
              >
                <code>{block.value}</code>
              </pre>
            );

          case "table":
            return (
              <div key={i} className="overflow-x-auto my-4">
                <table className="w-full border-collapse text-sm">
                  {block.rows?.map((row, ri) => (
                    <tr key={ri} className={ri === 0 ? "bg-[var(--color-surface-2)]" : ""}>
                      {row.map((cell, ci) => {
                        const Tag = ri === 0 ? "th" : "td";
                        return (
                          <Tag
                            key={ci}
                            className="px-4 py-2 border border-[var(--color-border)] text-left text-[var(--color-text-muted)]"
                          >
                            <InlineText text={cell} />
                          </Tag>
                        );
                      })}
                    </tr>
                  ))}
                </table>
              </div>
            );

          case "list":
            return (
              <ul key={i} className="space-y-1 my-2">
                {block.items?.map((item, li) => (
                  <li key={li} className="ml-4 text-sm text-[var(--color-text-muted)] flex gap-2">
                    <span className="text-[var(--color-text-dim)] shrink-0">-</span>
                    <span>
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );

          case "text":
            return (
              <p key={i} className="text-sm text-[var(--color-text-muted)]">
                <InlineText text={block.value} />
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

export default function SkillDetailPage() {
  const params = useParams();
  const name = params.name as string;
  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) return;
    fetch(`/api/skills/${encodeURIComponent(name)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Skill not found");
        return res.json();
      })
      .then((data) => setSkill(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [name]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[var(--color-surface-2)] rounded animate-pulse" />
        <div className="h-4 w-96 bg-[var(--color-surface-2)] rounded animate-pulse" />
        <div className="h-64 bg-[var(--color-surface-2)] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="space-y-4">
        <Link
          href="/skills"
          className="text-sm text-[var(--color-accent)] hover:underline
                     focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          Back to Skills
        </Link>
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-[var(--color-text-muted)]">Skill not found: {name}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-dim)]">
        <Link
          href="/skills"
          className="text-[var(--color-accent)] hover:underline
                     focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          Skills
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{skill.name}</span>
      </div>

      {/* Header */}
      <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-mono font-bold text-[var(--color-text)]">{skill.name}</h1>
            <p className="text-base text-[var(--color-text-muted)] mt-2">{skill.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`px-2 py-1 text-xs rounded-full border ${layerColors[skill.layer]}`}>
              {skill.layer}
            </span>
            <span className="text-xs text-[var(--color-text-dim)]">{skill.category}</span>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {skill.triggers?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase mb-2">Triggers</h4>
              <div className="flex flex-wrap gap-1">
                {skill.triggers.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {skill.linksTo?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase mb-2">Links To</h4>
              <div className="flex flex-wrap gap-1">
                {skill.linksTo.map((n) => (
                  <Link
                    key={n}
                    href={`/skills/${n}`}
                    className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors duration-150"
                  >
                    {n}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {skill.linkedFrom?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase mb-2">Linked From</h4>
              <div className="flex flex-wrap gap-1">
                {skill.linkedFrom.map((n) => (
                  <Link
                    key={n}
                    href={`/skills/${n}`}
                    className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors duration-150"
                  >
                    {n}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center gap-4 text-xs text-[var(--color-text-dim)]">
          <span>Risk: {skill.riskLevel || "low"}</span>
          <span>Connections: {(skill.linksTo?.length ?? 0) + (skill.linkedFrom?.length ?? 0)}</span>
        </div>
      </div>

      {/* Content */}
      {skill.content && (
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
          <SkillContent content={skill.content} />
        </div>
      )}
    </div>
  );
}

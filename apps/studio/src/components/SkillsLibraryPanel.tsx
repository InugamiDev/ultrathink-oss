// intent: skills library — left categories rail + right grid of skill cards
// status: done — reads ~/.claude/skills/ via Tauri `skill_registry_list`
// next: filter chips by trigger; "open SKILL.md" button; usage stats from telemetry
// confidence: medium

import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Layer = "all" | "orchestrator" | "hub" | "utility" | "domain";

interface Skill {
  name: string;
  layer: Exclude<Layer, "all">;
  description: string;
  triggers: string[];
  detail?: string;
  path?: string;
  invocations?: number;
}

interface RegistrySkill {
  name: string;
  layer?: string;
  description?: string;
  triggers?: string[] | string;
  detail?: string;
  path?: string;
}

interface RegistryListResponse {
  skills?: RegistrySkill[];
}

const VALID_LAYERS: Array<Exclude<Layer, "all">> = ["orchestrator", "hub", "utility", "domain"];

function normalizeLayer(layer?: string): Exclude<Layer, "all"> {
  const l = (layer ?? "").toLowerCase();
  if (VALID_LAYERS.includes(l as Exclude<Layer, "all">)) {
    return l as Exclude<Layer, "all">;
  }
  return "domain";
}

function normalizeTriggers(t?: string[] | string): string[] {
  if (Array.isArray(t)) return t.filter((x) => typeof x === "string");
  if (typeof t === "string") {
    return t
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

const LAYER_META: Record<Exclude<Layer, "all">, { label: string; color: string; description: string }> = {
  orchestrator: { label: "Orchestrators", color: "var(--accent)", description: "Top-level workflow drivers." },
  hub: { label: "Hubs", color: "var(--cyan)", description: "Cross-cutting tools used by many skills." },
  utility: { label: "Utilities", color: "var(--blue)", description: "Atomic helpers wired into hooks." },
  domain: { label: "Domain", color: "var(--teal)", description: "Specialized expertise (Next.js, SEO, etc)." },
};

export function SkillsLibraryPanel() {
  const queryClient = useQueryClient();
  const [layer, setLayer] = useState<Layer>("all");
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    data: skills = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["skillRegistry"],
    queryFn: async () => {
      const res = await invoke<RegistryListResponse>("skill_registry_list");
      const rows = res?.skills ?? [];
      return rows.map((s) => ({
        name: s.name,
        layer: normalizeLayer(s.layer),
        description: s.description ?? "",
        triggers: normalizeTriggers(s.triggers),
        detail: s.detail,
        path: s.path,
      }));
    },
  });
  const errorMessage =
    actionError ??
    (error
      ? `Couldn't read skill registry: ${error}`
      : skills.length === 0
        ? "No skills found. Run `skill-sync sync` from Settings to symlink the UltraThink registry into ~/.claude/skills/."
        : null);

  const filtered = skills.filter((s) => {
    if (layer !== "all" && s.layer !== layer) return false;
    if (
      query &&
      !s.name.toLowerCase().includes(query.toLowerCase()) &&
      !s.description.toLowerCase().includes(query.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const counts: Record<Layer, number> = {
    all: skills.length,
    orchestrator: skills.filter((s) => s.layer === "orchestrator").length,
    hub: skills.filter((s) => s.layer === "hub").length,
    utility: skills.filter((s) => s.layer === "utility").length,
    domain: skills.filter((s) => s.layer === "domain").length,
  };

  const selectedSkill = skills.find((s) => s.name === selectedName) ?? filtered[0] ?? null;
  const linkedSkills = useMemo(
    () => (selectedSkill ? findLinkedSkills(selectedSkill, skills) : []),
    [selectedSkill, skills]
  );

  return (
    <div style={rootStyle}>
      <aside style={asideStyle}>
        <div style={asideHeadStyle}>Library</div>
        <NavItem label="All skills" count={counts.all} active={layer === "all"} onClick={() => setLayer("all")} />
        <div style={dividerStyle} />
        {(Object.keys(LAYER_META) as Array<Exclude<Layer, "all">>).map((l) => (
          <NavItem
            key={l}
            label={LAYER_META[l].label}
            count={counts[l]}
            active={layer === l}
            color={LAYER_META[l].color}
            onClick={() => setLayer(l)}
          />
        ))}
      </aside>

      <div style={mainStyle}>
        <div style={headerStyle}>
          <div>
            <h2 style={h2Style}>{layer === "all" ? "All skills" : LAYER_META[layer].label}</h2>
            <p style={subStyle}>
              {loading
                ? "Reading skill registry…"
                : errorMessage
                  ? errorMessage
                  : layer === "all"
                    ? `${skills.length} skills registered with this Studio install.`
                    : LAYER_META[layer].description}
            </p>
          </div>
          <div style={searchWrapStyle}>
            <span style={searchIconStyle}>⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search skills…"
              style={searchInputStyle}
            />
          </div>
        </div>

        <div style={libraryBodyStyle}>
          <div style={gridStyle}>
            {filtered.map((s) => (
              <SkillCard key={s.name} skill={s} active={selectedSkill?.name === s.name} onSelect={() => setSelectedName(s.name)} />
            ))}
            {!loading && filtered.length === 0 && (
              <div style={emptyStyle}>
                {skills.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
                    <div>No skills loaded.</div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await invoke("oss_kit_install", { source: "https://github.com/InuVerse/ultrathink.git" });
                          setActionError(null);
                          await queryClient.invalidateQueries({ queryKey: ["skillRegistry"] });
                        } catch (e) {
                          setActionError(`Install failed: ${e}`);
                        }
                      }}
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--bg)",
                        background: "var(--accent)",
                        border: "none",
                        borderRadius: "var(--radius-md)",
                        padding: "8px 16px",
                        cursor: "pointer",
                      }}
                    >
                      Install UltraThink skill kit
                    </button>
                    <div style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>
                      Clones <code>github.com/InuVerse/ultrathink</code> to{" "}
                      <code>~/.ultrathink-studio/oss-kit</code> and symlinks 200+ skills.
                    </div>
                  </div>
                ) : (
                  "No skills match this filter."
                )}
              </div>
            )}
          </div>

          {selectedSkill && (
            <SkillDetail skill={selectedSkill} linkedSkills={linkedSkills} onSelect={(name) => setSelectedName(name)} />
          )}
        </div>
      </div>
    </div>
  );
}

function findLinkedSkills(skill: Skill, all: Skill[]): Skill[] {
  const triggerWords = new Set(skill.triggers.map((t) => t.toLowerCase()).filter((t) => t.length > 2));
  const haystack = `${skill.name} ${skill.description} ${skill.detail ?? ""}`.toLowerCase();
  return all
    .filter((candidate) => candidate.name !== skill.name)
    .map((candidate) => {
      let score = candidate.layer === skill.layer ? 1 : 0;
      if (haystack.includes(candidate.name.toLowerCase())) score += 4;
      for (const t of candidate.triggers) {
        if (triggerWords.has(t.toLowerCase())) score += 2;
      }
      if (candidate.description && haystack.includes(candidate.description.slice(0, 32).toLowerCase())) score += 1;
      return { candidate, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, 8)
    .map((row) => row.candidate);
}

function NavItem({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button onClick={onClick} style={{ ...navItemStyle, ...(active ? navItemActiveStyle : null) }}>
      {color && <span style={{ ...navDotStyle, background: color }} />}
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      <span style={navCountStyle}>{count}</span>
    </button>
  );
}

function SkillCard({ skill, active, onSelect }: { skill: Skill; active: boolean; onSelect: () => void }) {
  const meta = LAYER_META[skill.layer];
  return (
    <button type="button" onClick={onSelect} style={{ ...cardStyle, ...(active ? cardActiveStyle : null) }}>
      <div style={cardHeadStyle}>
        <span style={skillNameStyle}>{skill.name}</span>
        <span style={{ ...layerChipStyle, color: meta.color, borderColor: meta.color }}>{skill.layer}</span>
      </div>
      <div style={descStyle}>{skill.description || "No summary yet. Open the detail panel for the raw skill excerpt."}</div>
      <div style={triggersStyle}>
        {skill.triggers.map((t) => (
          <span key={t} style={triggerChipStyle}>
            {t}
          </span>
        ))}
      </div>
      {skill.invocations !== undefined && (
        <div style={footStyle}>
          <span style={footLabelStyle}>invocations</span>
          <span style={footValueStyle}>{skill.invocations.toLocaleString()}</span>
        </div>
      )}
    </button>
  );
}

function SkillDetail({
  skill,
  linkedSkills,
  onSelect,
}: {
  skill: Skill;
  linkedSkills: Skill[];
  onSelect: (name: string) => void;
}) {
  const meta = LAYER_META[skill.layer];
  return (
    <aside style={detailStyle} aria-label={`Skill detail for ${skill.name}`}>
      <div style={detailHeaderStyle}>
        <span style={{ ...layerChipStyle, color: meta.color, borderColor: meta.color }}>{skill.layer}</span>
        <h3 style={detailTitleStyle}>{skill.name}</h3>
      </div>
      <p style={detailDescStyle}>{skill.description || "This skill does not expose a summary yet."}</p>
      {skill.path && <div style={detailPathStyle}>{skill.path}</div>}
      <div style={detailSectionTitleStyle}>Triggers</div>
      <div style={triggersStyle}>
        {skill.triggers.length > 0 ? (
          skill.triggers.map((t) => (
            <span key={t} style={triggerChipStyle}>
              {t}
            </span>
          ))
        ) : (
          <span style={mutedTinyStyle}>No explicit triggers found.</span>
        )}
      </div>
      <div style={detailSectionTitleStyle}>Linked Skills</div>
      <div style={linkedListStyle}>
        {linkedSkills.length > 0 ? (
          linkedSkills.map((s) => (
            <button key={s.name} type="button" onClick={() => onSelect(s.name)} style={linkedSkillStyle}>
              <span style={{ flex: 1 }}>{s.name}</span>
              <span style={{ ...layerChipStyle, color: LAYER_META[s.layer].color, borderColor: LAYER_META[s.layer].color }}>
                {s.layer}
              </span>
            </button>
          ))
        ) : (
          <span style={mutedTinyStyle}>No linked skills detected from this registry excerpt.</span>
        )}
      </div>
      {skill.detail && (
        <>
          <div style={detailSectionTitleStyle}>Skill Excerpt</div>
          <pre style={excerptStyle}>{skill.detail}</pre>
        </>
      )}
    </aside>
  );
}

const rootStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  background: "var(--bg)",
};
const asideStyle: React.CSSProperties = {
  width: "200px",
  flexShrink: 0,
  borderRight: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  padding: "var(--space-4) var(--space-3)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};
const asideHeadStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "var(--space-2) var(--space-3)",
  marginBottom: "var(--space-1)",
};
const dividerStyle: React.CSSProperties = {
  height: "1px",
  background: "var(--border)",
  margin: "var(--space-2) 0",
};
const navItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  width: "100%",
  padding: "7px var(--space-3)",
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--text-muted)",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
};
const navItemActiveStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  color: "var(--text)",
};
const navDotStyle: React.CSSProperties = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
};
const navCountStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "var(--text-dim)",
  fontFamily: "var(--font-mono)",
};
const mainStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "auto",
  padding: "var(--space-7)",
};
const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  marginBottom: "var(--space-5)",
  gap: "var(--space-4)",
};
const h2Style: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "var(--text)",
  marginBottom: "4px",
};
const subStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--text-muted)",
};
const searchWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "0 var(--space-3)",
  width: "240px",
};
const searchIconStyle: React.CSSProperties = {
  color: "var(--text-dim)",
  fontSize: "14px",
  marginRight: "var(--space-2)",
};
const searchInputStyle: React.CSSProperties = {
  flex: 1,
  height: "32px",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--text)",
  fontSize: "12px",
};
const libraryBodyStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 420px)",
  gap: "var(--space-5)",
  alignItems: "start",
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "var(--space-4)",
};
const cardStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4) var(--space-5)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3)",
  cursor: "pointer",
};
const cardActiveStyle: React.CSSProperties = {
  borderColor: "var(--accent)",
  boxShadow: "0 0 0 1px rgba(167,139,250,0.25)",
};
const cardHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-2)",
};
const skillNameStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  fontFamily: "var(--font-mono)",
  color: "var(--text)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const layerChipStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "2px 7px",
  border: "1px solid",
  borderRadius: "var(--radius-sm)",
  flexShrink: 0,
};
const descStyle: React.CSSProperties = {
  fontSize: "11.5px",
  color: "var(--text-muted)",
  lineHeight: 1.45,
};
const triggersStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "4px",
};
const triggerChipStyle: React.CSSProperties = {
  fontSize: "10px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-dim)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  padding: "1px 6px",
  borderRadius: "var(--radius-sm)",
};
const footStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: "var(--space-2)",
  borderTop: "1px solid var(--border)",
};
const footLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 600,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
const footValueStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  fontFamily: "var(--font-mono)",
  color: "var(--text)",
};
const emptyStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  textAlign: "center",
  color: "var(--text-dim)",
  fontSize: "12px",
  padding: "var(--space-8)",
};
const detailStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  maxHeight: "calc(100vh - 160px)",
  overflow: "auto",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-5)",
  boxShadow: "0 18px 48px rgba(0,0,0,0.28)",
};
const detailHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  marginBottom: "var(--space-3)",
};
const detailTitleStyle: React.CSSProperties = {
  minWidth: 0,
  color: "var(--text)",
  fontSize: "16px",
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const detailDescStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "12px",
  lineHeight: 1.55,
  marginBottom: "var(--space-3)",
};
const detailPathStyle: React.CSSProperties = {
  color: "var(--text-dim)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 8px",
  fontSize: "10px",
  fontFamily: "var(--font-mono)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  marginBottom: "var(--space-4)",
};
const detailSectionTitleStyle: React.CSSProperties = {
  marginTop: "var(--space-4)",
  marginBottom: "var(--space-2)",
  color: "var(--text-dim)",
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const linkedListStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
};
const linkedSkillStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  width: "100%",
  color: "var(--text)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "7px 9px",
  fontSize: "11.5px",
  fontFamily: "var(--font-mono)",
  textAlign: "left",
  cursor: "pointer",
};
const mutedTinyStyle: React.CSSProperties = {
  color: "var(--text-dim)",
  fontSize: "11px",
};
const excerptStyle: React.CSSProperties = {
  maxHeight: "260px",
  overflow: "auto",
  whiteSpace: "pre-wrap",
  color: "var(--text-muted)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-3)",
  fontSize: "10.5px",
  lineHeight: 1.5,
  fontFamily: "var(--font-mono)",
};

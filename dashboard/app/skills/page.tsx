"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface Skill {
  name: string;
  description: string;
  layer: string;
  category: string;
  triggers: string[];
  linksTo: string[];
  linkedFrom: string[];
  riskLevel: string;
}

interface CreateSkillForm {
  name: string;
  description: string;
  layer: string;
  category: string;
  customCategory: string;
  triggers: string;
  linksTo: string[];
  linkedFrom: string[];
  riskLevel: string;
  content: string;
}

const INITIAL_FORM: CreateSkillForm = {
  name: "",
  description: "",
  layer: "utility",
  category: "",
  customCategory: "",
  triggers: "",
  linksTo: [],
  linkedFrom: [],
  riskLevel: "low",
  content: "",
};

const NAME_RE = /^[a-z][a-z0-9-]*$/;
const LAYERS = ["orchestrator", "hub", "utility", "domain"] as const;
const RISK_LEVELS = ["low", "medium", "high"] as const;

const layerColors: Record<string, string> = {
  orchestrator: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  hub: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  utility: "bg-green-500/10 text-green-400 border-green-500/20",
  domain: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

type SortMode = "alpha" | "connections" | "category";

// ─── Toast Component ───────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg border text-sm font-medium
        transition-all duration-300 motion-reduce:transition-none
        ${
          type === "success"
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}
    >
      <div className="flex items-center gap-3">
        <span>{type === "success" ? "+" : "!"}</span>
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
          &times;
        </button>
      </div>
    </div>
  );
}

// ─── Multi-Select Dropdown ─────────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()) && !selected.includes(o));

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{label}</label>
      <div
        className="min-h-[44px] px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] cursor-text flex flex-wrap gap-1.5 items-center"
        onClick={() => setOpen(true)}
      >
        {selected.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
          >
            {s}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(selected.filter((x) => x !== s));
              }}
              className="hover:text-[var(--color-text)] transition-colors"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? "Search skills..." : ""}
          className="bg-transparent outline-none text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] flex-1 min-w-[80px]"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl">
          {filtered.slice(0, 30).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange([...selected, o]);
                setSearch("");
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Skill Modal ────────────────────────────────────────────

function CreateSkillModal({
  open,
  onClose,
  onCreated,
  existingCategories,
  existingSkillNames,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (skill: Skill) => void;
  existingCategories: string[];
  existingSkillNames: string[];
}) {
  const [form, setForm] = useState<CreateSkillForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  const set = useCallback(<K extends keyof CreateSkillForm>(key: K, value: CreateSkillForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  }, []);

  // Real-time name validation
  useEffect(() => {
    if (!form.name) {
      setNameError("");
      return;
    }
    if (form.name.length > 64) {
      setNameError("Max 64 characters");
    } else if (!NAME_RE.test(form.name)) {
      setNameError("Lowercase letters, numbers, hyphens only. Must start with a letter.");
    } else if (existingSkillNames.includes(form.name)) {
      setNameError("A skill with this name already exists");
    } else {
      setNameError("");
    }
  }, [form.name, existingSkillNames]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleSubmit = async () => {
    // Client-side validation
    if (!form.name || nameError) return;
    if (!form.description) {
      setError("Description is required");
      return;
    }
    const category = form.category === "__custom__" ? form.customCategory.trim() : form.category;
    if (!category) {
      setError("Category is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          layer: form.layer,
          category,
          triggers: form.triggers
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          linksTo: form.linksTo,
          linkedFrom: form.linkedFrom,
          riskLevel: form.riskLevel,
          content: form.content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create skill");
        return;
      }

      onCreated(data.skill);
      setForm(INITIAL_FORM);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] transition-all duration-200 motion-reduce:transition-none";

  const selectClass =
    "w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] transition-all duration-200 motion-reduce:transition-none";

  const labelClass = "block text-xs font-medium text-[var(--color-text-muted)] mb-1.5";

  const isValid =
    form.name &&
    !nameError &&
    form.description &&
    (form.category !== "__custom__" ? form.category : form.customCategory.trim());

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8"
    >
      <div className="w-full max-w-2xl mx-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Create Skill</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Name */}
          <div>
            <label className={labelClass}>
              Name <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="my-new-skill"
              maxLength={64}
              className={`${inputClass} font-mono ${nameError ? "border-[var(--color-error)]" : ""}`}
            />
            {nameError && <p className="mt-1 text-xs text-[var(--color-error)]">{nameError}</p>}
            <p className="mt-1 text-xs text-[var(--color-text-dim)]">{form.name.length}/64</p>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>
              Description <span className="text-[var(--color-error)]">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What this skill does..."
              maxLength={1024}
              rows={3}
              className={`${inputClass} resize-y`}
            />
            <p className="mt-1 text-xs text-[var(--color-text-dim)]">{form.description.length}/1024</p>
          </div>

          {/* Layer + Risk (side by side) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Layer <span className="text-[var(--color-error)]">*</span>
              </label>
              <select value={form.layer} onChange={(e) => set("layer", e.target.value)} className={selectClass}>
                {LAYERS.map((l) => (
                  <option key={l} value={l}>
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Risk Level <span className="text-[var(--color-error)]">*</span>
              </label>
              <select value={form.riskLevel} onChange={(e) => set("riskLevel", e.target.value)} className={selectClass}>
                {RISK_LEVELS.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>
              Category <span className="text-[var(--color-error)]">*</span>
            </label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={selectClass}>
              <option value="">Select a category...</option>
              {existingCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">+ Custom category</option>
            </select>
            {form.category === "__custom__" && (
              <input
                type="text"
                value={form.customCategory}
                onChange={(e) => set("customCategory", e.target.value)}
                placeholder="e.g. devops, ai-ml, frontend"
                className={`${inputClass} mt-2`}
              />
            )}
          </div>

          {/* Triggers */}
          <div>
            <label className={labelClass}>Triggers</label>
            <input
              type="text"
              value={form.triggers}
              onChange={(e) => set("triggers", e.target.value)}
              placeholder="comma-separated, e.g. deploy, ci/cd, docker"
              className={inputClass}
            />
            {form.triggers && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.triggers
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                    >
                      {t}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Links To */}
          <MultiSelect
            label="Links To"
            options={existingSkillNames}
            selected={form.linksTo}
            onChange={(val) => set("linksTo", val)}
          />

          {/* Linked From */}
          <MultiSelect
            label="Linked From"
            options={existingSkillNames}
            selected={form.linkedFrom}
            onChange={(val) => set("linkedFrom", val)}
          />

          {/* SKILL.md Content */}
          <div>
            <label className={labelClass}>SKILL.md Content</label>
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="# Skill Title&#10;&#10;Markdown body for the skill documentation..."
              rows={8}
              className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
            />
            <p className="mt-1 text-xs text-[var(--color-text-dim)]">
              Optional. YAML frontmatter is generated automatically.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-hover)]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          >
            {saving ? "Creating..." : "Create Skill"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skills Page ───────────────────────────────────────────────────

export default function SkillsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("alpha");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/skills")
      .then((res) => res.json())
      .then((data) => {
        setSkills(data.skills ?? []);
      })
      .catch((err) => console.warn("[skills]", err.message))
      .finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(skills.map((s) => s.category))).sort();
  const skillNames = skills.map((s) => s.name).sort();

  const filtered = skills
    .filter((s) => {
      if (filter !== "all" && s.layer !== filter) return false;
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name.includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.triggers?.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "connections") {
        return (
          (b.linksTo?.length ?? 0) +
          (b.linkedFrom?.length ?? 0) -
          ((a.linksTo?.length ?? 0) + (a.linkedFrom?.length ?? 0))
        );
      }
      if (sortBy === "category") {
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

  const layerCounts = skills.reduce(
    (acc, s) => {
      acc[s.layer] = (acc[s.layer] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const layers = ["all", "orchestrator", "hub", "utility", "domain"];

  const handleSkillCreated = useCallback((skill: Skill) => {
    setSkills((prev) => [...prev, skill]);
    setToast({ message: `Skill "${skill.name}" created successfully`, type: "success" });
  }, []);

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Create Modal */}
      <CreateSkillModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleSkillCreated}
        existingCategories={categories}
        existingSkillNames={skillNames}
      />

      {/* Search + Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search skills, triggers, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-base text-[var(--color-text)]
                       placeholder:text-[var(--color-text-dim)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                       transition-all duration-200 motion-reduce:transition-none
                       w-full sm:w-80"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-base text-[var(--color-text)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
                       transition-all duration-200 motion-reduce:transition-none"
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            className="px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-base text-[var(--color-text)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
                       transition-all duration-200 motion-reduce:transition-none"
          >
            <option value="alpha">Sort: A-Z</option>
            <option value="connections">Sort: Most connected</option>
            <option value="category">Sort: By category</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-3 rounded-lg text-base font-medium bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-hover)]
                       transition-all duration-200 motion-reduce:transition-none
                       focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                       whitespace-nowrap"
          >
            + Create Skill
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {layers.map((layer) => (
            <button
              key={layer}
              onClick={() => setFilter(layer)}
              className={`px-6 py-3 rounded-lg text-base font-medium capitalize transition-all duration-200 motion-reduce:transition-none
                focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                ${
                  filter === layer
                    ? "bg-[var(--color-accent)] text-black"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                }`}
            >
              {layer === "all" ? `All (${skills.length})` : `${layer} (${layerCounts[layer] ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats + Graph Link */}
      <div className="flex items-center justify-between">
        <div className="flex gap-6 text-sm text-[var(--color-text-muted)]">
          {loading ? (
            <span>Loading...</span>
          ) : (
            <>
              <span>
                Showing {filtered.length} of {skills.length} skills
              </span>
              <span>Orchestrators: {layerCounts.orchestrator ?? 0}</span>
              <span>Hubs: {layerCounts.hub ?? 0}</span>
              <span>Utilities: {layerCounts.utility ?? 0}</span>
              <span>Domain: {layerCounts.domain ?? 0}</span>
            </>
          )}
        </div>
        <Link
          href="/skills/graph"
          className="px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]
                   hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)] transition-all duration-200 motion-reduce:transition-none
                   focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          View Graph
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Skill Grid */}
        <div
          className={`grid grid-cols-1 ${selected ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"} gap-4 flex-1`}
        >
          {filtered.map((skill) => (
            <button
              key={skill.name}
              onClick={() => setSelected(selected?.name === skill.name ? null : skill)}
              className={`p-6 rounded-xl bg-[var(--color-surface)] border shadow-sm text-left
                         hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-2)]
                         transition-all duration-200 motion-reduce:transition-none
                         focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
                         ${selected?.name === skill.name ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-mono font-medium text-[var(--color-text)]">{skill.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full border shrink-0 ${layerColors[skill.layer]}`}>
                  {skill.layer}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mt-2 line-clamp-2">{skill.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-dim)]">{skill.category}</span>
                  {skill.triggers?.length > 0 && (
                    <span className="text-xs text-[var(--color-text-dim)]">{skill.triggers.length} triggers</span>
                  )}
                  {(skill.linksTo?.length ?? 0) > 0 && (
                    <span className="text-xs text-[var(--color-text-dim)]">{skill.linksTo.length} links</span>
                  )}
                </div>
                <Link
                  href={`/skills/${skill.name}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-[var(--color-accent)] hover:underline"
                >
                  View
                </Link>
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-96 shrink-0 p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-fit sticky top-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-mono font-bold text-[var(--color-text)]">{selected.name}</h3>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close detail panel"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150 p-1"
              >
                &times;
              </button>
            </div>

            <span className={`inline-block px-2 py-1 text-xs rounded-full border ${layerColors[selected.layer]}`}>
              {selected.layer} / {selected.category}
            </span>

            <p className="text-sm text-[var(--color-text-muted)]">{selected.description}</p>

            {selected.triggers?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase mb-2">Triggers</h4>
                <div className="flex flex-wrap gap-1">
                  {selected.triggers.map((t) => (
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

            {selected.linksTo?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase mb-2">Links To</h4>
                <div className="flex flex-wrap gap-1">
                  {selected.linksTo.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        const target = skills.find((s) => s.name === name);
                        if (target) setSelected(target);
                      }}
                      className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors duration-150"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected.linkedFrom?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--color-text-dim)] uppercase mb-2">Linked From</h4>
                <div className="flex flex-wrap gap-1">
                  {selected.linkedFrom.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        const target = skills.find((s) => s.name === name);
                        if (target) setSelected(target);
                      }}
                      className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors duration-150"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-[var(--color-text-dim)] pt-2 border-t border-[var(--color-border)]">
              Risk: {selected.riskLevel || "low"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

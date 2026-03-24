import type { Memory } from "../memory";

export interface GalaxyNode {
  id: string;
  memory: Memory;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glow: number;
  hasRings: boolean;
}

export interface GalaxyEdge {
  source: string;
  target: string;
  strength: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "system";
  content: string;
  timestamp: number;
}

export interface GalaxyViewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface GalaxyFilters {
  categories: Set<string>;
  minImportance: number;
}

export const CATEGORY_COLORS: Record<string, string> = {
  architecture: "#3b82f6",
  pattern: "#22c55e",
  decision: "#f59e0b",
  preference: "#a855f7",
  solution: "#06b6d4",
  convention: "#ec4899",
  insight: "#64748b",
};

export const CATEGORY_LABELS: Record<string, string> = {
  architecture: "Architecture",
  pattern: "Pattern",
  decision: "Decision",
  preference: "Preference",
  solution: "Solution",
  convention: "Convention",
  insight: "Insight",
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);

export function nodeFromMemory(memory: Memory): GalaxyNode {
  const color = CATEGORY_COLORS[memory.category] ?? CATEGORY_COLORS.insight;
  return {
    id: memory.id,
    memory,
    x: (Math.random() - 0.5) * 1800,
    y: (Math.random() - 0.5) * 1800,
    vx: 0,
    vy: 0,
    radius: 4 + memory.importance * 1.5,
    color,
    glow: memory.confidence * 14,
    hasRings: memory.importance >= 8,
  };
}

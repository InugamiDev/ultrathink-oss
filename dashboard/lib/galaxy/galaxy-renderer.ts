import type { GalaxyNode, GalaxyEdge, GalaxyViewport } from "../types/memory";

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
}

interface Particle {
  edgeIndex: number;
  t: number;
  speed: number;
}

const BG_COLOR = "#0a0a0f";
const LABEL_FONT = '11px ui-monospace, "SF Mono", Menlo, monospace';
const PARALLAX_FACTOR = 0.3;
const MAX_PARTICLES = 60;

export class GalaxyRenderer {
  private stars: Star[] = [];
  private particles: Particle[] = [];
  private animationFrame = 0;

  constructor(
    private width: number,
    private height: number
  ) {
    this.generateStars();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.generateStars();
  }

  private generateStars() {
    this.stars = [];
    const count = Math.min(200, Math.floor((this.width * this.height) / 4000));
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width * 1.5,
        y: Math.random() * this.height * 1.5,
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.6 + 0.2,
      });
    }
  }

  initParticles(edges: GalaxyEdge[]) {
    this.particles = [];
    const count = Math.min(MAX_PARTICLES, edges.length * 2);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        edgeIndex: Math.floor(Math.random() * edges.length),
        t: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
      });
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    nodes: GalaxyNode[],
    edges: GalaxyEdge[],
    viewport: GalaxyViewport,
    selectedId: string | null,
    hoveredId: string | null
  ) {
    this.animationFrame++;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    ctx.save();

    // Layer 1: Deep space background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, this.width * dpr, this.height * dpr);

    // Layer 2: Starfield (parallax)
    this.renderStarfield(ctx, viewport, dpr);

    // Move to world coordinates
    ctx.translate((this.width / 2) * dpr + viewport.offsetX * dpr, (this.height / 2) * dpr + viewport.offsetY * dpr);
    ctx.scale(viewport.zoom * dpr, viewport.zoom * dpr);

    // Layer 3: Edge lines
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    this.renderEdges(ctx, edges, nodeMap);

    // Layer 4: Energy particles along edges
    this.renderParticles(ctx, edges, nodeMap);

    // Layer 5: Planets
    for (const node of nodes) {
      const isSelected = node.id === selectedId;
      const isHovered = node.id === hoveredId;
      this.renderPlanet(ctx, node, isSelected, isHovered);
    }

    // Layer 6: Labels
    for (const node of nodes) {
      if (viewport.zoom > 0.5) {
        this.renderLabel(ctx, node, node.id === selectedId, node.id === hoveredId);
      }
    }

    // Layer 7: Selection pulse ring
    if (selectedId) {
      const sel = nodeMap.get(selectedId);
      if (sel) this.renderSelectionRing(ctx, sel);
    }

    ctx.restore();
  }

  private renderStarfield(ctx: CanvasRenderingContext2D, viewport: GalaxyViewport, dpr: number) {
    const px = viewport.offsetX * PARALLAX_FACTOR;
    const py = viewport.offsetY * PARALLAX_FACTOR;
    const twinkle = this.animationFrame * 0.02;

    for (const star of this.stars) {
      const sx = ((star.x + px) % (this.width * 1.5)) * dpr;
      const sy = ((star.y + py) % (this.height * 1.5)) * dpr;
      const flicker = star.brightness + Math.sin(twinkle + star.x) * 0.15;

      ctx.globalAlpha = Math.max(0.1, Math.min(1, flicker));
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, star.size * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderEdges(ctx: CanvasRenderingContext2D, edges: GalaxyEdge[], nodeMap: Map<string, GalaxyNode>) {
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
      gradient.addColorStop(0, hexToRgba(source.color, 0.3));
      gradient.addColorStop(1, hexToRgba(target.color, 0.3));

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D, edges: GalaxyEdge[], nodeMap: Map<string, GalaxyNode>) {
    if (edges.length === 0) return;

    for (const p of this.particles) {
      if (p.edgeIndex >= edges.length) continue;
      const edge = edges[p.edgeIndex];
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      p.t += p.speed;
      if (p.t > 1) {
        p.t = 0;
        p.edgeIndex = Math.floor(Math.random() * edges.length);
      }

      const x = source.x + (target.x - source.x) * p.t;
      const y = source.y + (target.y - source.y) * p.t;

      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderPlanet(ctx: CanvasRenderingContext2D, node: GalaxyNode, isSelected: boolean, isHovered: boolean) {
    const { x, y, radius, color, glow, hasRings } = node;

    // Glow
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = glow + (isHovered ? 10 : 0);

    // Planet body — radial gradient
    const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 1, x, y, radius);
    grad.addColorStop(0, lightenHex(color, 40));
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, darkenHex(color, 40));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Rings for high-importance
    if (hasRings) {
      ctx.save();
      ctx.strokeStyle = hexToRgba(color, 0.4);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.6, radius * 0.4, Math.PI * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Hover outline
    if (isHovered && !isSelected) {
      ctx.strokeStyle = hexToRgba("#ffffff", 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private renderLabel(ctx: CanvasRenderingContext2D, node: GalaxyNode, isSelected: boolean, isHovered: boolean) {
    const content = node.memory.content;
    // Primary label: truncated content (up to 36 chars)
    const label = content.length > 36 ? content.slice(0, 34) + "…" : content;
    // Secondary line: category tag shown on hover or selection
    const categoryTag = `[${node.memory.category}]`;
    // Extended preview: full first sentence or 72 chars, shown when selected
    const preview = content.length > 72 ? content.slice(0, 70) + "…" : content;

    ctx.font = LABEL_FONT;
    ctx.textAlign = "center";

    // Primary content label
    ctx.fillStyle = hexToRgba(node.color, isSelected ? 1.0 : isHovered ? 0.85 : 0.65);
    ctx.fillText(label, node.x, node.y + node.radius + 14);

    // Category badge — show on hover or selected
    if (isHovered || isSelected) {
      ctx.font = `500 9px 'JetBrains Mono', monospace`;
      ctx.fillStyle = hexToRgba(node.color, 0.5);
      ctx.fillText(categoryTag, node.x, node.y + node.radius + 26);
    }

    // Full preview second line — only when selected
    if (isSelected && preview !== label) {
      ctx.font = `400 10px 'Inter', system-ui, sans-serif`;
      ctx.fillStyle = hexToRgba("#e2e8f0", 0.75);
      ctx.fillText(preview, node.x, node.y + node.radius + 40);
    }
  }

  private renderSelectionRing(ctx: CanvasRenderingContext2D, node: GalaxyNode) {
    const pulse = Math.sin(this.animationFrame * 0.06) * 0.3 + 0.7;
    const ringRadius = node.radius + 6 + Math.sin(this.animationFrame * 0.04) * 3;

    ctx.strokeStyle = hexToRgba(node.color, pulse * 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Color utilities
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lightenHex(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function darkenHex(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

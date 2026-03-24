import type { GalaxyNode, GalaxyEdge } from "../types/memory";

const CENTER_GRAVITY = 0.004;
const REPULSION = 4500;
const REPULSION_CUTOFF = 180; // skip node pairs farther than this (O(n²) → manageable)
const SPRING_STRENGTH = 0.03;
const SPRING_LENGTH = 140;
const DAMPING = 0.92;
const MIN_VELOCITY = 0.01;
const MAX_VELOCITY = 8;

export class ForceSimulation {
  nodes: GalaxyNode[] = [];
  edges: GalaxyEdge[] = [];
  private tickCount = 0;
  private settled = false;

  setData(nodes: GalaxyNode[], edges: GalaxyEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.tickCount = 0;
    this.settled = false;
  }

  isSettled(): boolean {
    return this.settled;
  }

  tick(): boolean {
    if (this.settled || this.nodes.length === 0) return false;

    this.tickCount++;

    // Apply forces
    this.applyCenterGravity();
    this.applyRepulsion();
    this.applySprings();

    // Update positions
    let totalMovement = 0;

    for (const node of this.nodes) {
      // Clamp velocity
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > MAX_VELOCITY) {
        node.vx = (node.vx / speed) * MAX_VELOCITY;
        node.vy = (node.vy / speed) * MAX_VELOCITY;
      }

      node.x += node.vx;
      node.y += node.vy;

      // Damping
      node.vx *= DAMPING;
      node.vy *= DAMPING;

      totalMovement += Math.abs(node.vx) + Math.abs(node.vy);
    }

    // Settle after 300 ticks or when movement is negligible
    if (this.tickCount > 300 || totalMovement / this.nodes.length < MIN_VELOCITY) {
      this.settled = true;
    }

    return true;
  }

  private applyCenterGravity() {
    for (const node of this.nodes) {
      node.vx -= node.x * CENTER_GRAVITY;
      node.vy -= node.y * CENTER_GRAVITY;
    }
  }

  private applyRepulsion() {
    const len = this.nodes.length;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) {
          dx = (Math.random() - 0.5) * 2;
          dy = (Math.random() - 0.5) * 2;
          dist = 1;
        }

        if (dist > REPULSION_CUTOFF) continue;
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }
  }

  private applySprings() {
    const nodeMap = new Map(this.nodes.map((n) => [n.id, n]));

    for (const edge of this.edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const displacement = dist - SPRING_LENGTH;
      const force = displacement * SPRING_STRENGTH * edge.strength;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }
  }

  // Find the node at a given world position
  nodeAt(worldX: number, worldY: number): GalaxyNode | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      if (dx * dx + dy * dy <= node.radius * node.radius) {
        return node;
      }
    }
    return null;
  }

  // Nudge simulation out of settled state (e.g. when adding a node)
  wake() {
    this.settled = false;
    this.tickCount = Math.max(0, this.tickCount - 50);
  }
}

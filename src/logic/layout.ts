import type { ProofNode } from './types';

const NODE_W = 200;
const NODE_H = 56;
const ROW_H = 130;
const CANVAS_W = 900;

export function positionForNew(sources: ProofNode[], allNodes: ProofNode[]): { x: number; y: number } {
  const avgX = sources.reduce((s, n) => s + n.x, 0) / Math.max(sources.length, 1);
  const maxY = Math.max(...sources.map((n) => n.y), 0);
  let x = Math.min(Math.max(avgX, 20), CANVAS_W - NODE_W - 20);
  let y = maxY + ROW_H;

  // avoid overlap with existing nodes at similar y
  let guard = 0;
  while (
    allNodes.some((n) => !n.isGoal && Math.abs(n.y - y) < NODE_H && Math.abs(n.x - x) < NODE_W) &&
    guard < 30
  ) {
    x += NODE_W + 30;
    if (x > CANVAS_W - NODE_W - 20) {
      x = 20;
      y += ROW_H;
    }
    guard++;
  }
  return { x, y };
}

export function initialPremiseLayout(count: number): { x: number; y: number }[] {
  const spacing = Math.min(260, (CANVAS_W - 40) / Math.max(count, 1));
  return Array.from({ length: count }, (_, i) => ({ x: 20 + i * spacing, y: 30 }));
}

export const CANVAS_WIDTH = CANVAS_W;
export const NODE_WIDTH = NODE_W;
export const NODE_HEIGHT = NODE_H;

import { useRef, useState } from 'react';
import type { ProofNode, ReprMode } from '../logic/types';
import { formatExpr } from '../logic/format';
import { NODE_WIDTH, NODE_HEIGHT } from '../logic/layout';

interface Props {
  nodes: ProofNode[];
  selectedIds: string[];
  reprMode: ReprMode;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  canvasHeight: number;
}

export default function ProofCanvas({ nodes, selectedIds, reprMode, onSelect, onMove, canvasHeight }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const [, force] = useState(0);

  function onPointerDown(e: React.PointerEvent, node: ProofNode) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragInfo.current = { id: node.id, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const info = dragInfo.current;
    if (!info) return;
    const dx = e.clientX - info.startX;
    const dy = e.clientY - info.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) info.moved = true;
    if (info.moved) {
      onMove(info.id, Math.max(0, info.origX + dx), Math.max(0, info.origY + dy));
    }
  }

  function onPointerUp(_e: React.PointerEvent, node: ProofNode) {
    const info = dragInfo.current;
    dragInfo.current = null;
    if (info && !info.moved) {
      onSelect(node.id);
    }
    force((v) => v + 1);
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="proof-canvas" ref={containerRef} style={{ height: canvasHeight }}>
      <svg className="proof-canvas__svg" width="100%" height={canvasHeight}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" style={{ fill: 'var(--text-faint)' }} />
          </marker>
        </defs>
        {nodes.flatMap((n) =>
          n.sourceIds
            .map((sid) => byId.get(sid))
            .filter((s): s is ProofNode => !!s)
            .map((s) => {
              const x1 = s.x + NODE_WIDTH / 2;
              const y1 = s.y + NODE_HEIGHT;
              const x2 = n.x + NODE_WIDTH / 2;
              const y2 = n.y;
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              return (
                <g key={`${s.id}-${n.id}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    style={{ stroke: 'var(--text-faint)' }}
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                  />
                  {n.sourceIds[0] === s.id && (
                    <text x={mx + 6} y={my - 4} fontSize={12} style={{ fill: 'var(--text-faint)' }} fontStyle="italic">
                      {n.ruleApplied}
                    </text>
                  )}
                </g>
              );
            })
        )}
      </svg>
      {nodes.map((n) => {
        const selected = selectedIds.includes(n.id);
        const cls = [
          'proof-node',
          n.isGoal ? 'proof-node--goal' : n.isPremise ? 'proof-node--premise' : 'proof-node--derived',
          selected ? 'proof-node--selected' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={n.id}
            className={cls}
            style={{ left: n.x, top: n.y, width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
            onPointerDown={(e) => onPointerDown(e, n)}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => onPointerUp(e, n)}
          >
            {n.isGoal && <div className="proof-node__goal-arrow">↑</div>}
            <span>{formatExpr(n.expr, reprMode)}</span>
          </div>
        );
      })}
    </div>
  );
}

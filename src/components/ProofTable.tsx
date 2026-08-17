import type { ProofNode, ReprMode } from '../logic/types';
import { formatExpr } from '../logic/format';

interface Props {
  nodes: ProofNode[];
  reprMode: ReprMode;
}

export default function ProofTable({ nodes, reprMode }: Props) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rows = nodes.filter((n) => !n.isGoal).sort((a, b) => (Number(a.lineNumber) || 0) - (Number(b.lineNumber) || 0));
  const goal = nodes.find((n) => n.isGoal);

  return (
    <div className="proof-table">
      <table>
        <thead>
          <tr>
            <th className="col-num"></th>
            <th>Expression</th>
            <th>Lines</th>
            <th>Rule Applied</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => (
            <tr key={n.id}>
              <td className="col-num">{n.lineNumber}</td>
              <td className="col-expr">{formatExpr(n.expr, reprMode)}</td>
              <td className="col-lines">{n.sourceIds.map((sid) => byId.get(sid)?.lineNumber ?? '').join(', ')}</td>
              <td className="col-rule">{n.ruleApplied}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {goal && (
        <table className="proof-table__goal">
          <tbody>
            <tr>
              <td className="col-num">C</td>
              <td className="col-expr" colSpan={3}>
                {formatExpr(goal.expr, reprMode)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

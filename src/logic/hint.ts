import type { Expr } from './types';
import { RULES } from './rules';
import { equals, exprKey } from './build';

export interface HintStep {
  ruleId: string;
  ruleLabel: string;
  operandKeys: string[];
  resultExpr: Expr;
}

const MAX_STATES = 4000;
const MAX_DEPTH = 4;

// Rules excluded from automated search because they explode branching (Add) or
// are rarely the "next best" step to suggest (Taut expansion direction).
const SEARCH_RULE_IDS = new Set([
  'MP', 'MT', 'DS', 'Simp', 'Conj', 'HS', 'CD', 'DN', 'DeM', 'Impl', 'Contra', 'Equiv', 'Contra2', 'Comm', 'Assoc', 'Dist', 'Abs', 'Exp',
]);

export function findHint(currentExprs: Expr[], goal: Expr): HintStep | null {
  const startKeys = new Map<string, Expr>();
  for (const e of currentExprs) startKeys.set(exprKey(e), e);

  const goalKey = exprKey(goal);
  if (startKeys.has(goalKey)) return null;

  type QueueItem = { exprsMap: Map<string, Expr>; firstStep: HintStep | null; depth: number };
  const startItem: QueueItem = { exprsMap: startKeys, firstStep: null, depth: 0 };
  const queue: QueueItem[] = [startItem];
  const visited = new Set<string>([serialize(startKeys)]);
  let statesExplored = 0;

  while (queue.length > 0) {
    const { exprsMap, firstStep, depth } = queue.shift()!;
    if (depth >= MAX_DEPTH) continue;
    const exprList = Array.from(exprsMap.values());

    for (const rule of RULES) {
      if (!SEARCH_RULE_IDS.has(rule.id)) continue;
      const combos = combinations(exprList, rule.min === rule.max ? rule.min : rule.min);
      for (const combo of combos) {
        if (statesExplored > MAX_STATES) return firstStep;
        statesExplored++;
        let results;
        try {
          results = rule.apply(combo, []);
        } catch {
          continue;
        }
        for (const res of results) {
          const key = exprKey(res.expr);
          if (exprsMap.has(key)) continue;
          const step: HintStep = firstStep ?? {
            ruleId: rule.id,
            ruleLabel: rule.sublabel,
            operandKeys: combo.map((c) => exprKey(c)),
            resultExpr: res.expr,
          };
          if (equals(res.expr, goal)) {
            return step;
          }
          const newMap = new Map(exprsMap);
          newMap.set(key, res.expr);
          const ser = serialize(newMap);
          if (!visited.has(ser)) {
            visited.add(ser);
            queue.push({ exprsMap: newMap, firstStep: step, depth: depth + 1 });
          }
        }
      }
    }
  }
  return null;
}

function serialize(m: Map<string, Expr>): string {
  return Array.from(m.keys()).sort().join('|');
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 1) return arr.map((x) => [x]);
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      if (i === j) continue;
      if (k === 2) {
        out.push([arr[i], arr[j]]);
      } else if (k === 3) {
        for (let l = 0; l < arr.length; l++) {
          if (l === i || l === j) continue;
          out.push([arr[i], arr[j], arr[l]]);
        }
      }
    }
  }
  return out;
}

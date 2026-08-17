import type { Expr, Rule, RuleResult } from './types';
import { A, O, I, F, N, V, Bot, equals } from './build';
import { exprKey } from './build';

function dedupe(results: RuleResult[]): RuleResult[] {
  const seen = new Map<string, RuleResult>();
  for (const r of results) {
    const k = exprKey(r.expr);
    if (!seen.has(k)) seen.set(k, r);
  }
  return Array.from(seen.values());
}

function pairResults(
  selected: Expr[],
  fn: (a: Expr, b: Expr) => Expr | null,
  desc: string
): RuleResult[] {
  if (selected.length !== 2) return [];
  const [x, y] = selected;
  const out: RuleResult[] = [];
  const r1 = fn(x, y);
  if (r1) out.push({ expr: r1, description: desc });
  const r2 = fn(y, x);
  if (r2) out.push({ expr: r2, description: desc });
  return dedupe(out);
}

const MP: Rule = {
  id: 'MP',
  label: 'MP',
  sublabel: 'Modus Ponens',
  description: 'From A → B and A, derive B.',
  min: 2,
  max: 2,
  apply: (sel) =>
    pairResults(
      sel,
      (a, b) => (a.kind === 'Implies' && equals(a.l, b) ? a.r : null),
      'Modus Ponens'
    ),
};

const MT: Rule = {
  id: 'MT',
  label: 'MT',
  sublabel: 'Modus Tollens',
  description: 'From A → B and ¬B, derive ¬A.',
  min: 2,
  max: 2,
  apply: (sel) =>
    pairResults(
      sel,
      (a, b) => (a.kind === 'Implies' && b.kind === 'Not' && equals(b.e, a.r) ? N(a.l) : null),
      'Modus Tollens'
    ),
};

const DS: Rule = {
  id: 'DS',
  label: 'DS',
  sublabel: 'Disjunctive Syllogism',
  description: 'From A ∨ B and ¬A, derive B (or from A ∨ B and ¬B, derive A).',
  min: 2,
  max: 2,
  apply: (sel) => {
    if (sel.length !== 2) return [];
    const [x, y] = sel;
    const out: RuleResult[] = [];
    const tryOne = (a: Expr, b: Expr) => {
      if (a.kind === 'Or' && b.kind === 'Not') {
        if (equals(b.e, a.l)) out.push({ expr: a.r, description: 'Disjunctive Syllogism' });
        if (equals(b.e, a.r)) out.push({ expr: a.l, description: 'Disjunctive Syllogism' });
      }
    };
    tryOne(x, y);
    tryOne(y, x);
    return dedupe(out);
  },
};

const Add: Rule = {
  id: 'Add',
  label: 'Add',
  sublabel: 'Addition',
  description: 'From A, derive A ∨ B for any expression B.',
  min: 1,
  max: 1,
  apply: (sel, allVars) => {
    const p = sel[0];
    const out: RuleResult[] = [];
    for (const v of allVars) {
      out.push({ expr: O(p, V(v)), description: `Disjoin with ${v}` });
      out.push({ expr: O(V(v), p), description: `Disjoin with ${v}` });
      out.push({ expr: O(p, N(V(v))), description: `Disjoin with not ${v}` });
      out.push({ expr: O(N(V(v)), p), description: `Disjoin with not ${v}` });
    }
    return dedupe(out);
  },
};

const Simp: Rule = {
  id: 'Simp',
  label: 'Simp',
  sublabel: 'Simplification',
  description: 'From A ∧ B, derive A alone, or B alone.',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    if (p.kind !== 'And') return [];
    return dedupe([
      { expr: p.l, description: 'left conjunct' },
      { expr: p.r, description: 'right conjunct' },
    ]);
  },
};

const Conj: Rule = {
  id: 'Conj',
  label: 'Conj',
  sublabel: 'Conjunction',
  description: 'From A and B, derive A ∧ B.',
  min: 2,
  max: 2,
  apply: (sel) => {
    if (sel.length !== 2) return [];
    const [x, y] = sel;
    return dedupe([
      { expr: A(x, y), description: 'Conjunction' },
      { expr: A(y, x), description: 'Conjunction' },
    ]);
  },
};

const HS: Rule = {
  id: 'HS',
  label: 'HS',
  sublabel: 'Hypothetical Syllogism',
  description: 'From A → B and B → C, derive A → C.',
  min: 2,
  max: 2,
  apply: (sel) =>
    pairResults(
      sel,
      (a, b) => (a.kind === 'Implies' && b.kind === 'Implies' && equals(a.r, b.l) ? I(a.l, b.r) : null),
      'Hypothetical Syllogism'
    ),
};

const CD: Rule = {
  id: 'CD',
  label: 'CD',
  sublabel: 'Constructive Dilemma',
  description: 'From A → B, C → D, and A ∨ C, derive B ∨ D.',
  min: 3,
  max: 3,
  apply: (sel) => {
    if (sel.length !== 3) return [];
    const perms = permutations(sel);
    const out: RuleResult[] = [];
    for (const [a, b, c] of perms) {
      if (a.kind === 'Implies' && b.kind === 'Implies' && c.kind === 'Or') {
        if (equals(c.l, a.l) && equals(c.r, b.l)) {
          out.push({ expr: O(a.r, b.r), description: 'Constructive Dilemma' });
        }
        if (equals(c.l, b.l) && equals(c.r, a.l)) {
          out.push({ expr: O(b.r, a.r), description: 'Constructive Dilemma' });
        }
      }
    }
    return dedupe(out);
  },
};

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

const DN: Rule = {
  id: 'DN',
  label: 'DN',
  sublabel: 'Double Negation',
  description: 'From ¬¬A, derive A; or from A, derive ¬¬A.',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    if (p.kind === 'Not' && p.e.kind === 'Not') {
      return [{ expr: p.e.e, description: 'remove double negation' }];
    }
    return [{ expr: N(N(p)), description: 'add double negation' }];
  },
};

const DeM: Rule = {
  id: 'DeM',
  label: 'DeM',
  sublabel: "DeMorgan's",
  description: 'Move a negation inside: ¬(A ∧ B) ↔ ¬A ∨ ¬B and ¬(A ∨ B) ↔ ¬A ∧ ¬B.',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    const out: RuleResult[] = [];
    if (p.kind === 'Not' && p.e.kind === 'Or') out.push({ expr: A(N(p.e.l), N(p.e.r)), description: "DeMorgan's" });
    if (p.kind === 'Not' && p.e.kind === 'And') out.push({ expr: O(N(p.e.l), N(p.e.r)), description: "DeMorgan's" });
    if (p.kind === 'And' && p.l.kind === 'Not' && p.r.kind === 'Not')
      out.push({ expr: N(O(p.l.e, p.r.e)), description: "DeMorgan's" });
    if (p.kind === 'Or' && p.l.kind === 'Not' && p.r.kind === 'Not')
      out.push({ expr: N(A(p.l.e, p.r.e)), description: "DeMorgan's" });
    return dedupe(out);
  },
};

const Impl: Rule = {
  id: 'Impl',
  label: 'Impl',
  sublabel: 'Implication',
  description: 'Replace A → B with ¬A ∨ B (or ¬A ∨ B with A → B).',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    const out: RuleResult[] = [];
    if (p.kind === 'Implies') out.push({ expr: O(N(p.l), p.r), description: 'Implication' });
    if (p.kind === 'Or' && p.l.kind === 'Not') out.push({ expr: I(p.l.e, p.r), description: 'Implication' });
    return dedupe(out);
  },
};

const Contra: Rule = {
  id: 'Contra',
  label: 'Contra',
  sublabel: 'Contrapositive',
  description: 'From A → B, derive ¬B → ¬A.',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    if (p.kind !== 'Implies') return [];
    return [{ expr: I(N(p.r), N(p.l)), description: 'Contrapositive' }];
  },
};

const Equiv: Rule = {
  id: 'Equiv',
  label: 'Equiv',
  sublabel: 'Equivalence',
  description: 'Replace A ↔ B with (A → B) ∧ (B → A), or with (A ∧ B) ∨ (¬A ∧ ¬B).',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    const out: RuleResult[] = [];
    if (p.kind === 'Iff') {
      out.push({ expr: A(I(p.l, p.r), I(p.r, p.l)), description: 'Equivalence' });
      out.push({ expr: O(A(p.l, p.r), A(N(p.l), N(p.r))), description: 'Equivalence' });
    }
    if (
      p.kind === 'And' &&
      p.l.kind === 'Implies' &&
      p.r.kind === 'Implies' &&
      equals(p.l.l, p.r.r) &&
      equals(p.l.r, p.r.l)
    ) {
      out.push({ expr: F(p.l.l, p.l.r), description: 'Equivalence' });
    }
    if (
      p.kind === 'Or' &&
      p.l.kind === 'And' &&
      p.r.kind === 'And' &&
      p.r.l.kind === 'Not' &&
      p.r.r.kind === 'Not' &&
      equals(p.r.l.e, p.l.l) &&
      equals(p.r.r.e, p.l.r)
    ) {
      out.push({ expr: F(p.l.l, p.l.r), description: 'Equivalence' });
    }
    return dedupe(out);
  },
};

const Contradiction: Rule = {
  id: 'Contra2',
  label: '⊥',
  sublabel: 'Contradiction',
  description: 'From A and ¬A, derive ⊥ (a contradiction).',
  min: 2,
  max: 2,
  apply: (sel) =>
    pairResults(sel, (a, b) => (b.kind === 'Not' && equals(b.e, a) ? Bot : null), 'Contradiction'),
};

const Comm: Rule = {
  id: 'Comm',
  label: 'Comm',
  sublabel: 'Communative',
  description: 'Swap the operands: A ∧ B → B ∧ A, A ∨ B → B ∨ A, or A ↔ B → B ↔ A.',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    if (p.kind === 'And') return [{ expr: A(p.r, p.l), description: 'Commutative' }];
    if (p.kind === 'Or') return [{ expr: O(p.r, p.l), description: 'Commutative' }];
    if (p.kind === 'Iff') return [{ expr: F(p.r, p.l), description: 'Commutative' }];
    return [];
  },
};

const Assoc: Rule = {
  id: 'Assoc',
  label: 'Assoc',
  sublabel: 'Associative',
  description: 'Regroup nested conjunctions or disjunctions, e.g. (A ∧ B) ∧ C ↔ A ∧ (B ∧ C).',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    const out: RuleResult[] = [];
    if (p.kind === 'And') {
      if (p.l.kind === 'And') out.push({ expr: A(p.l.l, A(p.l.r, p.r)), description: 'Associative' });
      if (p.r.kind === 'And') out.push({ expr: A(A(p.l, p.r.l), p.r.r), description: 'Associative' });
    }
    if (p.kind === 'Or') {
      if (p.l.kind === 'Or') out.push({ expr: O(p.l.l, O(p.l.r, p.r)), description: 'Associative' });
      if (p.r.kind === 'Or') out.push({ expr: O(O(p.l, p.r.l), p.r.r), description: 'Associative' });
    }
    return dedupe(out);
  },
};

const Dist: Rule = {
  id: 'Dist',
  label: 'Dist',
  sublabel: 'Distributive',
  description: 'Distribute ∧ over ∨ (or ∨ over ∧), e.g. A ∧ (B ∨ C) ↔ (A ∧ B) ∨ (A ∧ C).',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    const out: RuleResult[] = [];
    if (p.kind === 'And' && p.r.kind === 'Or')
      out.push({ expr: O(A(p.l, p.r.l), A(p.l, p.r.r)), description: 'Distributive' });
    if (p.kind === 'And' && p.l.kind === 'Or')
      out.push({ expr: O(A(p.l.l, p.r), A(p.l.r, p.r)), description: 'Distributive' });
    if (p.kind === 'Or' && p.r.kind === 'And')
      out.push({ expr: A(O(p.l, p.r.l), O(p.l, p.r.r)), description: 'Distributive' });
    if (p.kind === 'Or' && p.l.kind === 'And')
      out.push({ expr: A(O(p.l.l, p.r), O(p.l.r, p.r)), description: 'Distributive' });
    if (p.kind === 'Or' && p.l.kind === 'And' && p.r.kind === 'And') {
      if (equals(p.l.l, p.r.l)) out.push({ expr: A(p.l.l, O(p.l.r, p.r.r)), description: 'Distributive (factor)' });
      if (equals(p.l.l, p.r.r)) out.push({ expr: A(p.l.l, O(p.l.r, p.r.l)), description: 'Distributive (factor)' });
      if (equals(p.l.r, p.r.l)) out.push({ expr: A(p.l.r, O(p.l.l, p.r.r)), description: 'Distributive (factor)' });
      if (equals(p.l.r, p.r.r)) out.push({ expr: A(p.l.r, O(p.l.l, p.r.l)), description: 'Distributive (factor)' });
    }
    if (p.kind === 'And' && p.l.kind === 'Or' && p.r.kind === 'Or') {
      if (equals(p.l.l, p.r.l)) out.push({ expr: O(p.l.l, A(p.l.r, p.r.r)), description: 'Distributive (factor)' });
      if (equals(p.l.l, p.r.r)) out.push({ expr: O(p.l.l, A(p.l.r, p.r.l)), description: 'Distributive (factor)' });
      if (equals(p.l.r, p.r.l)) out.push({ expr: O(p.l.r, A(p.l.l, p.r.r)), description: 'Distributive (factor)' });
      if (equals(p.l.r, p.r.r)) out.push({ expr: O(p.l.r, A(p.l.l, p.r.l)), description: 'Distributive (factor)' });
    }
    return dedupe(out);
  },
};

const Abs: Rule = {
  id: 'Abs',
  label: 'Abs',
  sublabel: 'Absorption',
  description: 'Simplify A ∧ (A ∨ B) to A, or A ∨ (A ∧ B) to A.',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    const out: RuleResult[] = [];
    if (p.kind === 'And' && p.r.kind === 'Or' && equals(p.r.l, p.l)) out.push({ expr: p.l, description: 'Absorption' });
    if (p.kind === 'And' && p.r.kind === 'Or' && equals(p.r.r, p.l)) out.push({ expr: p.l, description: 'Absorption' });
    if (p.kind === 'And' && p.l.kind === 'Or' && equals(p.l.l, p.r)) out.push({ expr: p.r, description: 'Absorption' });
    if (p.kind === 'And' && p.l.kind === 'Or' && equals(p.l.r, p.r)) out.push({ expr: p.r, description: 'Absorption' });
    if (p.kind === 'Or' && p.r.kind === 'And' && equals(p.r.l, p.l)) out.push({ expr: p.l, description: 'Absorption' });
    if (p.kind === 'Or' && p.r.kind === 'And' && equals(p.r.r, p.l)) out.push({ expr: p.l, description: 'Absorption' });
    if (p.kind === 'Or' && p.l.kind === 'And' && equals(p.l.l, p.r)) out.push({ expr: p.r, description: 'Absorption' });
    if (p.kind === 'Or' && p.l.kind === 'And' && equals(p.l.r, p.r)) out.push({ expr: p.r, description: 'Absorption' });
    return dedupe(out);
  },
};

const Exp: Rule = {
  id: 'Exp',
  label: 'Exp',
  sublabel: 'Exportation',
  description: 'Replace (A ∧ B) → C with A → (B → C).',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    const out: RuleResult[] = [];
    if (p.kind === 'Implies' && p.l.kind === 'And')
      out.push({ expr: I(p.l.l, I(p.l.r, p.r)), description: 'Exportation' });
    if (p.kind === 'Implies' && p.r.kind === 'Implies')
      out.push({ expr: I(A(p.l, p.r.l), p.r.r), description: 'Exportation' });
    return dedupe(out);
  },
};

const Taut: Rule = {
  id: 'Taut',
  label: 'Taut',
  sublabel: 'Tautology',
  description: 'Replace A ∨ A with A or A ∧ A with A; or expand A into A ∨ A / A ∧ A.',
  min: 1,
  max: 1,
  apply: (sel) => {
    const p = sel[0];
    if (p.kind === 'Or' && equals(p.l, p.r)) return [{ expr: p.l, description: 'Tautology' }];
    if (p.kind === 'And' && equals(p.l, p.r)) return [{ expr: p.l, description: 'Tautology' }];
    return dedupe([
      { expr: O(p, p), description: 'A or A' },
      { expr: A(p, p), description: 'A and A' },
    ]);
  },
};

export const RULES: Rule[] = [
  MP, MT, DS, Add, Simp, Conj, HS, CD, DN, DeM, Impl, Contra, Equiv, Contradiction, Comm, Assoc, Dist, Abs, Exp, Taut,
];

export const RULES_BY_ID: Record<string, Rule> = Object.fromEntries(RULES.map((r) => [r.id, r]));
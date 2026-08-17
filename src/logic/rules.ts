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
  formula: 'P → Q, P ⊢ Q',
  explanation: 'If P implies Q, and P is true, then Q must be true. Select an implication and its antecedent.',
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
  formula: 'P → Q, ¬Q ⊢ ¬P',
  explanation: 'If P implies Q, and Q is false, then P must be false too. Select an implication and the negation of its consequent.',
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
  formula: 'P ∨ Q, ¬P ⊢ Q',
  explanation: 'If at least one of P or Q is true, and P is ruled out, then Q must be true. Select a disjunction and the negation of one side.',
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
  formula: 'P ⊢ P ∨ Q',
  explanation: 'If P is true, then "P or anything" is also true. Select one node, then choose what to disjoin it with.',
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
  formula: 'P ∧ Q ⊢ P (or Q)',
  explanation: 'If a conjunction is true, each of its parts is true on its own. Select a conjunction to extract either side.',
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
  formula: 'P, Q ⊢ P ∧ Q',
  explanation: 'If P is true and Q is true, then "P and Q" is true. Select any two nodes to combine them.',
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
  formula: 'P → Q, Q → R ⊢ P → R',
  explanation: 'Chain two implications together when the consequent of one matches the antecedent of the other.',
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
  formula: 'P → Q, R → S, P ∨ R ⊢ Q ∨ S',
  explanation: 'Given two implications and a disjunction of their antecedents, conclude a disjunction of their consequents. Select all three nodes.',
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
  formula: 'P ≡ ¬¬P',
  explanation: 'A statement is equivalent to the negation of its negation. Works in either direction.',
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
  formula: '¬(P ∨ Q) ≡ ¬P ∧ ¬Q,  ¬(P ∧ Q) ≡ ¬P ∨ ¬Q',
  explanation: 'Push a negation through an "and"/"or", flipping it to the other connective and negating each side.',
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
  formula: 'P → Q ≡ ¬P ∨ Q',
  explanation: 'An implication can be rewritten as a disjunction of the negated antecedent and the consequent, or back again.',
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
  formula: 'P → Q ≡ ¬Q → ¬P',
  explanation: 'An implication is equivalent to the negated consequent implying the negated antecedent.',
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
  formula: 'P ↔ Q ≡ (P→Q) ∧ (Q→P) ≡ (P∧Q) ∨ (¬P∧¬Q)',
  explanation: 'A biconditional can be split into two implications, or into "both true / both false", or built back up.',
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
  formula: 'P, ¬P ⊢ ⊥',
  explanation: 'A statement and its negation can never both be true. Select a node and its negation to derive a contradiction — useful for Indirect Proof.',
  min: 2,
  max: 2,
  apply: (sel) =>
    pairResults(sel, (a, b) => (b.kind === 'Not' && equals(b.e, a) ? Bot : null), 'Contradiction'),
};

const Comm: Rule = {
  id: 'Comm',
  label: 'Comm',
  sublabel: 'Communative',
  formula: 'P ∧ Q ≡ Q ∧ P,  P ∨ Q ≡ Q ∨ P',
  explanation: 'The order of the two sides of an "and", "or", or "iff" can be swapped freely.',
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
  formula: '(P∧Q)∧R ≡ P∧(Q∧R),  (P∨Q)∨R ≡ P∨(Q∨R)',
  explanation: 'When three terms are chained with the same connective, the grouping of parentheses can be shifted.',
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
  formula: 'P∧(Q∨R) ≡ (P∧Q)∨(P∧R),  P∨(Q∧R) ≡ (P∨Q)∧(P∨R)',
  explanation: 'Distribute one connective over another (like multiplying over addition), or factor a common term back out.',
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
  formula: 'P∧(P∨Q) ≡ P,  P∨(P∧Q) ≡ P',
  explanation: 'When one term already implies the whole other clause, the clause collapses away, leaving just the term.',
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
  formula: '(P∧Q) → R ≡ P → (Q→R)',
  explanation: 'A conjunction in the antecedent can be "exported" into a chain of nested implications, or re-imported.',
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
  formula: 'P ≡ P ∨ P ≡ P ∧ P',
  explanation: 'A statement is equivalent to itself "or-ed" or "and-ed" with itself, in either direction.',
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

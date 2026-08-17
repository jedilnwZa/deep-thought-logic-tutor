import type { Problem } from '../logic/types';
import { V, N, A, O, I, F } from '../logic/build';

const P = V('P');
const Q = V('Q');
const R = V('R');
const S = V('S');
const T = V('T');
const Av = V('A');
const Bv = V('B');
const Cv = V('C');
const Dv = V('D');

export const PROBLEMS: Problem[] = [
  // Level 1
  {
    id: 'l1p1',
    level: 1,
    code: '1.0.1.0',
    premises: [N(O(P, R)), I(N(R), O(N(S), Q)), I(Q, T)],
    goal: I(S, T),
  },
  {
    id: 'l1p2',
    level: 1,
    code: '1.0.2.0',
    premises: [I(P, Q), P],
    goal: Q,
  },
  {
    id: 'l1p3',
    level: 1,
    code: '1.0.3.0',
    premises: [N(P), O(P, Q)],
    goal: Q,
  },
  // Level 2
  {
    id: 'l2p1',
    level: 2,
    code: '2.0.1.0',
    premises: [I(Av, Bv), I(Bv, Cv)],
    goal: I(Av, Cv),
  },
  {
    id: 'l2p2',
    level: 2,
    code: '2.0.2.0',
    premises: [A(Av, Bv)],
    goal: A(Bv, Av),
  },
  {
    id: 'l2p3',
    level: 2,
    code: '2.0.3.0',
    premises: [N(A(Av, Bv)), Av],
    goal: N(Bv),
  },
  // Level 3
  {
    id: 'l3p1',
    level: 3,
    code: '3.0.1.0',
    premises: [I(Av, Bv), N(Bv)],
    goal: N(Av),
  },
  {
    id: 'l3p2',
    level: 3,
    code: '3.0.2.0',
    premises: [O(Av, Bv), N(Av), I(Bv, Cv)],
    goal: Cv,
  },
  {
    id: 'l3p3',
    level: 3,
    code: '3.0.3.0',
    premises: [F(Av, Bv), Av],
    goal: Bv,
  },
  // Level 4
  {
    id: 'l4p1',
    level: 4,
    code: '4.0.1.0',
    premises: [A(I(Av, Bv), I(Cv, Dv)), O(Av, Cv)],
    goal: O(Bv, Dv),
  },
  {
    id: 'l4p2',
    level: 4,
    code: '4.0.2.0',
    premises: [I(Av, A(Bv, Cv)), Av],
    goal: Cv,
  },
  {
    id: 'l4p3',
    level: 4,
    code: '4.0.3.0',
    premises: [N(O(Av, Bv))],
    goal: A(N(Av), N(Bv)),
  },
  // Level 5
  {
    id: 'l5p1',
    level: 5,
    code: '5.0.1.0',
    premises: [I(A(Av, Bv), Cv)],
    goal: I(Av, I(Bv, Cv)),
  },
  {
    id: 'l5p2',
    level: 5,
    code: '5.0.2.0',
    premises: [O(Av, A(Bv, Cv))],
    goal: A(O(Av, Bv), O(Av, Cv)),
  },
  {
    id: 'l5p3',
    level: 5,
    code: '5.0.3.0',
    premises: [A(Av, O(Av, Bv))],
    goal: Av,
  },
  // Level 6
  {
    id: 'l6p1',
    level: 6,
    code: '6.0.1.0',
    premises: [I(Av, Bv)],
    goal: I(N(Bv), N(Av)),
  },
  {
    id: 'l6p2',
    level: 6,
    code: '6.0.2.0',
    premises: [O(A(Av, Bv), A(Av, Cv))],
    goal: A(Av, O(Bv, Cv)),
  },
  {
    id: 'l6p3',
    level: 6,
    code: '6.0.3.0',
    premises: [I(Av, Bv), I(Bv, Cv), N(Cv)],
    goal: N(Av),
  },
  // Level 7
  {
    id: 'l7p1',
    level: 7,
    code: '7.0.1.0',
    premises: [I(Av, Bv), I(Av, N(Bv))],
    goal: N(Av),
  },
  {
    id: 'l7p2',
    level: 7,
    code: '7.0.2.0',
    premises: [N(O(Av, Bv)), I(N(Av), Cv)],
    goal: Cv,
  },
];

export const LEVEL_COUNT = 7;

export function problemsForLevel(level: number): Problem[] {
  return PROBLEMS.filter((p) => p.level === level);
}

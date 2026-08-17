import type { Expr } from './types';

export const V = (name: string): Expr => ({ kind: 'Var', name });
export const N = (e: Expr): Expr => ({ kind: 'Not', e });
export const A = (l: Expr, r: Expr): Expr => ({ kind: 'And', l, r });
export const O = (l: Expr, r: Expr): Expr => ({ kind: 'Or', l, r });
export const I = (l: Expr, r: Expr): Expr => ({ kind: 'Implies', l, r });
export const F = (l: Expr, r: Expr): Expr => ({ kind: 'Iff', l, r });
export const Bot: Expr = { kind: 'Bottom' };

export function equals(a: Expr, b: Expr): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'Var':
      return a.name === (b as typeof a).name;
    case 'Not':
      return equals(a.e, (b as typeof a).e);
    case 'Bottom':
      return true;
    case 'And':
    case 'Or':
    case 'Implies':
    case 'Iff': {
      const bb = b as typeof a;
      return equals(a.l, bb.l) && equals(a.r, bb.r);
    }
  }
}

export function collectVars(e: Expr, out: Set<string> = new Set()): Set<string> {
  switch (e.kind) {
    case 'Var':
      out.add(e.name);
      break;
    case 'Not':
      collectVars(e.e, out);
      break;
    case 'Bottom':
      break;
    default:
      collectVars(e.l, out);
      collectVars(e.r, out);
  }
  return out;
}

export function exprKey(e: Expr): string {
  switch (e.kind) {
    case 'Var':
      return `V:${e.name}`;
    case 'Not':
      return `N:(${exprKey(e.e)})`;
    case 'Bottom':
      return 'BOT';
    case 'And':
      return `A:(${exprKey(e.l)},${exprKey(e.r)})`;
    case 'Or':
      return `O:(${exprKey(e.l)},${exprKey(e.r)})`;
    case 'Implies':
      return `I:(${exprKey(e.l)},${exprKey(e.r)})`;
    case 'Iff':
      return `F:(${exprKey(e.l)},${exprKey(e.r)})`;
  }
}

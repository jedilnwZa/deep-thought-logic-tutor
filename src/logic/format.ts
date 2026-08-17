import type { Expr, ReprMode } from './types';

function isSimple(e: Expr): boolean {
  return e.kind === 'Var' || e.kind === 'Bottom' || (e.kind === 'Not' && e.e.kind === 'Var');
}

function wrap(e: Expr, mode: ReprMode): string {
  const s = core(e, mode);
  return isSimple(e) ? s : `(${s})`;
}

function core(e: Expr, mode: ReprMode): string {
  const eng = mode === 'english';
  switch (e.kind) {
    case 'Var':
      return e.name;
    case 'Bottom':
      return '⊥';
    case 'Not':
      return (eng ? 'not' : '¬') + wrap(e.e, mode);
    case 'And':
      return eng ? `${wrap(e.l, mode)} and ${wrap(e.r, mode)}` : `${wrap(e.l, mode)} ∧ ${wrap(e.r, mode)}`;
    case 'Or':
      return eng ? `${wrap(e.l, mode)} or ${wrap(e.r, mode)}` : `${wrap(e.l, mode)} ∨ ${wrap(e.r, mode)}`;
    case 'Implies':
      return eng ? `if ${wrap(e.l, mode)} then ${wrap(e.r, mode)}` : `${wrap(e.l, mode)} → ${wrap(e.r, mode)}`;
    case 'Iff':
      return eng ? `${wrap(e.l, mode)} iff ${wrap(e.r, mode)}` : `${wrap(e.l, mode)} ↔ ${wrap(e.r, mode)}`;
  }
}

export function formatExpr(e: Expr, mode: ReprMode): string {
  return core(e, mode);
}

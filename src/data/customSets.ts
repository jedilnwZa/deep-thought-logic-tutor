import type { Expr, Problem } from '../logic/types';

export interface CustomSet {
  id: string;
  name: string;
  createdAt: number;
  problems: Problem[];
}

const STORAGE_KEY = 'deep-thought-custom-sets';

function isCustomSet(v: unknown): v is CustomSet {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.createdAt === 'number' &&
    Array.isArray(s.problems)
  );
}

export function loadCustomSets(): CustomSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomSet);
  } catch {
    return [];
  }
}

export function saveCustomSets(sets: CustomSet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch {
    // storage may be unavailable; ignore
  }
}

export function makeCustomProblem(premises: Expr[], goal: Expr, index: number, setId: string): Problem {
  return {
    id: `${setId}-p${index}`,
    level: 0,
    code: `C${index}`,
    premises,
    goal,
  };
}